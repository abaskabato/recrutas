/**
 * End-to-End Authentication System Test
 * Tests the complete authentication flow from sign-up to dashboard access
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: `test-e2e-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'E2E Test User'
};

let browser;
let page;

const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

const wait = (ms) => new Promise(r => setTimeout(r, ms));

function logTest(testName, passed, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${testName}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (error) {
      const errorMessage = error.message.split('\n')[0];
      testResults.errors.push(`${testName}: ${errorMessage}`);
      console.error(`   Error: ${errorMessage}`);
    }
  }
}

async function setupBrowser() {
  console.log('🚀 Setting up browser...');
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });
}

async function testLandingPage() {
  console.log('\n📄 Testing Landing Page...');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    const title = await page.title();
    logTest('Landing page loads', title.includes('Recrutas'));
    await page.waitForSelector('a[href="/auth"]');
    logTest('Sign up button exists', true);
    await page.waitForSelector('h1');
    logTest('Hero section exists', true);
  } catch (error) {
    logTest('Landing page test', false, error);
  }
}

async function testSignUpFlow() {
  console.log('\n✍️ Testing Sign Up Flow...');
  try {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('button');
    await page.click('button::-p-text("Sign Up")');
    await wait(1000);

    await page.waitForSelector('input[id="signup-name"]');
    await page.type('input[id="signup-name"]', TEST_USER.name);
    await page.type('input[id="signup-email"]', TEST_USER.email);
    await page.type('input[id="signup-password"]', TEST_USER.password);
    await page.type('input[id="signup-confirm-password"]', TEST_USER.password);

    await page.waitForSelector('button[type="submit"]');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    const isRoleSelection = page.url().includes('role-selection');
    logTest('Sign up redirects to role selection', isRoleSelection);
  } catch (error) {
    logTest('Sign up flow', false, error);
  }
}

async function testRoleSelection() {
    console.log('\n👤 Testing Role Selection...');
    try {
        await page.waitForSelector('h1');
        logTest('Role selection page loaded', true);

        await page.waitForSelector('button[data-role="talent_owner"]');
        await page.click('button[data-role="talent_owner"]');
        await wait(1000);

        await page.waitForSelector('button');
        await page.click('button::-p-text("Get Started")');

        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        const isDashboard = page.url().endsWith('/');
        logTest('Role selection redirects to dashboard', isDashboard);
    } catch (error) {
        logTest('Role selection', false, error);
    }
}

async function testDashboardAccessAndSignOut() {
  console.log('\n📊 Testing Dashboard Access & Sign Out...');
  try {
    await page.waitForSelector('h1');
    logTest('Dashboard loaded', true);

    await page.waitForSelector('button[aria-label="Open user menu"]');
    await page.click('button[aria-label="Open user menu"]');
    await wait(1000);

    await page.waitForSelector('button::-p-text("Sign out")');
    await page.click('button::-p-text("Sign out")');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    const isAuthPage = page.url().includes('auth');
    logTest('Sign out redirects to auth page', isAuthPage);
  } catch (error) {
    logTest('Dashboard access and sign out', false, error);
  }
}

async function testSignInFlow() {
  console.log('\n🔐 Testing Sign In Flow...');
  try {
    await page.waitForSelector('button::-p-text("Sign In")');
    await page.click('button::-p-text("Sign In")');
    await wait(1000);

    await page.waitForSelector('input[id="signin-email"]');
    await page.type('input[id="signin-email"]', TEST_USER.email);
    await page.type('input[id="signin-password"]', TEST_USER.password);

    await page.waitForSelector('button[type="submit"]');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    const isDashboard = page.url().endsWith('/');
    logTest('Sign in redirects to dashboard', isDashboard);
  } catch (error) {
    logTest('Sign in flow', false, error);
  }
}

async function runAllTests() {
  console.log('🧪 Starting End-to-End Authentication Tests\n');
  console.log('='.repeat(50));
  
  try {
    await setupBrowser();
    await testLandingPage();
    await testSignUpFlow();
    await testRoleSelection();
    await testDashboardAccessAndSignOut();
    await testSignInFlow();
    
  } catch (error) {
    console.error('Test suite error:', error);
    testResults.failed++;
    testResults.errors.push(`Test suite: ${error.message}`);
    
  } finally {
    if (browser) {
      await browser.close();
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    const total = testResults.passed + testResults.failed;
    if (total > 0) {
        console.log(`📈 Success Rate: ${Math.round((testResults.passed / total) * 100)}%`);
    } else {
        console.log(`📈 Success Rate: 0%`);
    }
    
    if (testResults.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      testResults.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n' + '='.repeat(50));
    
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

runAllTests();