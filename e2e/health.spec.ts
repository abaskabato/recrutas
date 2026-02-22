/**
 * E2E Tests: API Health Checks
 *
 * Tests critical API endpoints are responding correctly
 */

import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('health endpoint should return 200', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.status()).toBe(200);
  });

  test('health endpoint should return valid JSON', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();
    
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('ok');
  });

  test('unauthenticated API requests should return 401', async ({ request }) => {
    const response = await request.get('/api/candidate/profile');
    
    expect([401, 403]).toContain(response.status());
  });

  test('rate limiting should be enforced', async ({ request }) => {
    const requests = Array(110).fill(null).map(() => 
      request.get('/api/health')
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status() === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
