import { test, expect } from '@playwright/test';

// Thresholds (ms)
const THRESHOLD = {
  landingDomLoaded:  4000,
  landingLCP:        5000,
  modalOpenClick:     500,  // CTA click → dialog visible (React state change, should be instant)
  modalAutoOpen:     4000,  // auto-open timer is 3 s; allow 4 s total
  loginPageLoad:     3000,
  loginSubmit:      10000,  // includes Supabase round-trip
  dashboardLoad:    10000,
  apiHealth:         3000,  // first call after cold start can take ~1.5 s
  apiExternalJobs:   5000,
  apiAuthUser:       2000,
};

const TEST_EMAIL    = process.env.PERF_TEST_EMAIL    || '';
const TEST_PASSWORD = process.env.PERF_TEST_PASSWORD || '';

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getNavMetrics(page: any) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByName('first-contentful-paint')[0] as PerformanceEntry;
    return {
      ttfb:        nav.responseStart - nav.requestStart,
      domLoaded:   nav.domContentLoadedEventEnd - nav.startTime,
      fullyLoaded: nav.loadEventEnd - nav.startTime,
      fcp:         paint?.startTime ?? -1,
    };
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Performance Benchmarks', () => {

  test('API /health response time', async ({ request }) => {
    const t0 = Date.now();
    const res = await request.get('/api/health');
    const elapsed = Date.now() - t0;
    expect(res.ok()).toBeTruthy();
    console.log(`  /health: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(THRESHOLD.apiHealth);
  });

  test('Landing page — DOM load and FCP', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const m = await getNavMetrics(page);
    console.log(`  TTFB: ${m.ttfb.toFixed(0)}ms  DOM: ${m.domLoaded.toFixed(0)}ms  FCP: ${m.fcp > 0 ? m.fcp.toFixed(0) + 'ms' : 'n/a'}`);
    expect(m.domLoaded, `DOM loaded ${m.domLoaded.toFixed(0)}ms`).toBeLessThan(THRESHOLD.landingDomLoaded);
  });

  test('Instant match modal — CTA click to dialog visible', async ({ page }) => {
    // The desktop hero has a skills input + "Agentic Search" button (disabled until input has text).
    // Filling the input and clicking calls setShowInstantMatch(true) — a pure React state update.
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const input = page.locator('input[placeholder*="skills"]').first();
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill('Software Engineer');

    const cta = page.locator('button:has-text("Agentic Search")').first();
    await cta.waitFor({ state: 'visible', timeout: 2000 });

    const modal = page.locator('[role="dialog"]');
    const t0 = Date.now();
    await cta.click();
    await modal.waitFor({ state: 'visible', timeout: THRESHOLD.modalOpenClick + 500 });
    const elapsed = Date.now() - t0;

    console.log(`  CTA click → modal visible: ${elapsed}ms`);
    expect(elapsed, `Modal took ${elapsed}ms to open (limit ${THRESHOLD.modalOpenClick}ms)`).toBeLessThan(THRESHOLD.modalOpenClick);
  });

  test('Instant match modal — auto-open timer (3 s)', async ({ page }) => {
    // The modal auto-opens 3 s after page load for unauthenticated users.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const t0 = Date.now();
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: THRESHOLD.modalAutoOpen });
    const elapsed = Date.now() - t0;
    console.log(`  Auto-open: ${elapsed}ms`);
    expect(elapsed, `Modal auto-opened in ${elapsed}ms (limit ${THRESHOLD.modalAutoOpen}ms)`).toBeLessThan(THRESHOLD.modalAutoOpen);
  });

  test('Login page — DOM load', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    const m = await getNavMetrics(page);
    console.log(`  TTFB: ${m.ttfb.toFixed(0)}ms  DOM: ${m.domLoaded.toFixed(0)}ms`);
    expect(m.domLoaded, `Login page DOM ${m.domLoaded.toFixed(0)}ms`).toBeLessThan(THRESHOLD.loginPageLoad);
  });

  test('Login page — form renders within 2 s of DOM load', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    const t0 = Date.now();
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 2000 });
    const elapsed = Date.now() - t0;
    console.log(`  Email input visible: ${elapsed}ms after DOM load`);
    expect(elapsed, `Email input took ${elapsed}ms to appear`).toBeLessThan(2000);
  });

  test('Login submit — Supabase auth + redirect timing', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set PERF_TEST_EMAIL / PERF_TEST_PASSWORD env vars');

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 3000 });

    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    const t0 = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: THRESHOLD.loginSubmit });
    const elapsed = Date.now() - t0;

    console.log(`  Login submit → redirect: ${elapsed}ms`);
    expect(elapsed, `Login took ${elapsed}ms`).toBeLessThan(THRESHOLD.loginSubmit);
  });

  test('Dashboard — first meaningful content after login', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set PERF_TEST_EMAIL / PERF_TEST_PASSWORD env vars');

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 3000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: THRESHOLD.loginSubmit });

    const t0 = Date.now();
    // Wait for dashboard content — any h1/h2 heading or main content area
    await page.waitForSelector('h1, h2, [role="main"], main', { timeout: THRESHOLD.dashboardLoad });
    const elapsed = Date.now() - t0;

    const m = await getNavMetrics(page);
    console.log(`  Heading visible: ${elapsed}ms after redirect`);
    console.log(`  Dashboard DOM:   ${m.domLoaded.toFixed(0)}ms`);
    expect(m.domLoaded).toBeLessThan(THRESHOLD.dashboardLoad);
  });

  test('API /api/auth/user — profile fetch speed (unauthenticated → 401)', async ({ request }) => {
    // Measures server overhead for the route — should return 401 fast, not hang
    const t0 = Date.now();
    const res = await request.get('/api/auth/user');
    const elapsed = Date.now() - t0;
    console.log(`  /api/auth/user (no auth): ${elapsed}ms  status=${res.status()}`);
    // 401 is correct; we just care it responds quickly
    expect(res.status()).toBe(401);
    expect(elapsed, `Auth user endpoint took ${elapsed}ms`).toBeLessThan(THRESHOLD.apiAuthUser);
  });

  test('API /api/external-jobs — response time and result count', async ({ request }) => {
    const t0 = Date.now();
    const res = await request.get('/api/external-jobs?jobTitle=Software+Engineer&limit=8');
    const elapsed = Date.now() - t0;
    console.log(`  /api/external-jobs: ${elapsed}ms  status=${res.status()}`);
    expect(res.status()).toBeLessThan(500);
    expect(elapsed, `External jobs took ${elapsed}ms`).toBeLessThan(THRESHOLD.apiExternalJobs);
    if (res.ok()) {
      const body = await res.json();
      console.log(`  Jobs returned: ${body.jobs?.length ?? 0}`);
      expect(body.jobs?.length ?? 0).toBeGreaterThan(0);
    }
  });

  test('Core Web Vitals — FCP, LCP, CLS', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    // Give observers a moment to collect buffered entries
    await page.waitForTimeout(2000);

    const vitals = await page.evaluate(() => {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const lcp = performance.getEntriesByType('largest-contentful-paint');
      const ls  = performance.getEntriesByType('layout-shift');
      const cls = ls.reduce((sum, e) => sum + ((e as any).hadRecentInput ? 0 : (e as any).value), 0);
      return {
        FCP: fcp?.startTime ?? -1,
        LCP: lcp.length ? lcp[lcp.length - 1].startTime : -1,
        CLS: cls,
      };
    });

    console.log('\n  ── Core Web Vitals ─────────────────');
    console.log(`  FCP: ${vitals.FCP > 0 ? vitals.FCP.toFixed(0) + 'ms' : 'n/a'}`);
    console.log(`  LCP: ${vitals.LCP > 0 ? vitals.LCP.toFixed(0) + 'ms' : 'n/a'}`);
    console.log(`  CLS: ${vitals.CLS.toFixed(3)}`);
    console.log('  ────────────────────────────────────\n');

    if (vitals.FCP > 0) expect(vitals.FCP, `FCP ${vitals.FCP.toFixed(0)}ms > 3000ms`).toBeLessThan(3000);
    if (vitals.LCP > 0) expect(vitals.LCP, `LCP ${vitals.LCP.toFixed(0)}ms > 5000ms`).toBeLessThan(THRESHOLD.landingLCP);
    expect(vitals.CLS, `CLS ${vitals.CLS.toFixed(3)} > 0.25`).toBeLessThan(0.25);
  });

});
