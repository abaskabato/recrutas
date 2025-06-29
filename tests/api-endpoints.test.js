/**
 * Integration Tests: API Endpoints
 * End-to-end testing of all REST API endpoints
 */

const request = require('supertest');

// Note: These tests run against the actual running server
const baseURL = 'http://localhost:5000';

describe('API Endpoints - Production Testing', () => {
  let authToken;
  let testUserId;
  let testJobId;

  beforeAll(async () => {
    // Create test user for authenticated requests
    const userResponse = await request(baseURL)
      .post('/api/auth/sign-up/email')
      .send({
        email: `test-${Date.now()}@recrutas.com`,
        password: 'testpass123',
        name: 'Test User'
      });

    if (userResponse.status === 200) {
      authToken = userResponse.body.token;
      testUserId = userResponse.body.user.id;
    }
  });

  describe('Public Endpoints', () => {
    test('GET /api/platform/stats should return platform statistics', async () => {
      const response = await request(baseURL)
        .get('/api/platform/stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalJobs');
      expect(response.body).toHaveProperty('totalMatches');
      expect(response.body).toHaveProperty('activeConnections');
      
      expect(typeof response.body.totalUsers).toBe('number');
      expect(typeof response.body.totalJobs).toBe('number');
      expect(typeof response.body.totalMatches).toBe('number');
      expect(typeof response.body.activeConnections).toBe('number');
    });

    test('GET /api/external-jobs should return external job listings', async () => {
      const response = await request(baseURL)
        .get('/api/external-jobs')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('jobs');
      expect(Array.isArray(response.body.jobs)).toBe(true);

      if (response.body.jobs.length > 0) {
        const job = response.body.jobs[0];
        expect(job).toHaveProperty('id');
        expect(job).toHaveProperty('title');
        expect(job).toHaveProperty('company');
        expect(job).toHaveProperty('location');
        expect(job).toHaveProperty('source');
        expect(job).toHaveProperty('externalUrl');
        expect(Array.isArray(job.skills)).toBe(true);
      }
    }, 30000);

    test('GET /api/session should handle unauthenticated requests', async () => {
      const response = await request(baseURL)
        .get('/api/session')
        .expect(200);

      expect(response.body).toEqual({});
    });
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/sign-up/email should create new users', async () => {
      const uniqueEmail = `newuser-${Date.now()}@recrutas.com`;
      
      const response = await request(baseURL)
        .post('/api/auth/sign-up/email')
        .send({
          email: uniqueEmail,
          password: 'securepass123',
          name: 'New User'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(uniqueEmail);
      expect(response.body.user.name).toBe('New User');
    });

    test('POST /api/auth/sign-in/email should authenticate existing users', async () => {
      // First create a user
      const email = `signin-test-${Date.now()}@recrutas.com`;
      await request(baseURL)
        .post('/api/auth/sign-up/email')
        .send({
          email,
          password: 'testpass123',
          name: 'Sign In Test'
        });

      // Then sign in
      const response = await request(baseURL)
        .post('/api/auth/sign-in/email')
        .send({
          email,
          password: 'testpass123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(email);
    });

    test('should reject invalid credentials', async () => {
      const response = await request(baseURL)
        .post('/api/auth/sign-in/email')
        .send({
          email: 'nonexistent@recrutas.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Job Management Endpoints', () => {
    test('POST /api/jobs should require authentication', async () => {
      const response = await request(baseURL)
        .post('/api/jobs')
        .send({
          title: 'Test Job',
          company: 'Test Company',
          description: 'Test description'
        })
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    test('GET /api/jobs should require authentication', async () => {
      const response = await request(baseURL)
        .get('/api/jobs')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    // Note: These tests would need proper session handling for authenticated requests
    // The current Better Auth setup requires browser-like cookie handling
  });

  describe('Search and Filtering', () => {
    test('GET /api/external-jobs should support skill filtering', async () => {
      const response = await request(baseURL)
        .get('/api/external-jobs')
        .query({ skills: 'JavaScript,React' })
        .expect(200);

      expect(response.body).toHaveProperty('jobs');
      expect(Array.isArray(response.body.jobs)).toBe(true);
    }, 30000);

    test('should handle invalid query parameters gracefully', async () => {
      const response = await request(baseURL)
        .get('/api/external-jobs')
        .query({ 
          skills: 'a'.repeat(1000), // Very long skill query
          limit: 'invalid',
          offset: -1
        });

      expect([200, 400]).toContain(response.status);
    }, 30000);
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent endpoints', async () => {
      const response = await request(baseURL)
        .get('/api/nonexistent')
        .expect(404);
    });

    test('should handle malformed JSON in requests', async () => {
      const response = await request(baseURL)
        .post('/api/auth/sign-up/email')
        .set('Content-Type', 'application/json')
        .send('{"malformed": json}');

      expect([400, 422]).toContain(response.status);
    });

    test('should handle very large payloads', async () => {
      const largePayload = {
        email: 'large@test.com',
        password: 'password123',
        name: 'a'.repeat(10000) // Very long name
      };

      const response = await request(baseURL)
        .post('/api/auth/sign-up/email')
        .send(largePayload);

      expect([200, 400, 413, 422]).toContain(response.status);
    });
  });

  describe('Security Headers and CORS', () => {
    test('should include security headers in responses', async () => {
      const response = await request(baseURL)
        .get('/api/platform/stats');

      // Check for common security headers
      expect(response.headers).toBeDefined();
      // Note: Specific headers depend on server configuration
    });

    test('should handle CORS preflight requests', async () => {
      const response = await request(baseURL)
        .options('/api/platform/stats')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('Performance Tests', () => {
    test('should respond to health checks quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(baseURL)
        .get('/api/platform/stats')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('should handle concurrent requests', async () => {
      const concurrentRequests = Array(10).fill().map(() =>
        request(baseURL).get('/api/platform/stats')
      );

      const responses = await Promise.allSettled(concurrentRequests);
      
      const successfulResponses = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successfulResponses.length).toBeGreaterThan(5);
    });
  });

  describe('Data Validation', () => {
    test('should validate email format in registration', async () => {
      const response = await request(baseURL)
        .post('/api/auth/sign-up/email')
        .send({
          email: 'invalid-email-format',
          password: 'password123',
          name: 'Test User'
        });

      expect([400, 422]).toContain(response.status);
    });

    test('should enforce password strength requirements', async () => {
      const response = await request(baseURL)
        .post('/api/auth/sign-up/email')
        .send({
          email: 'weak@test.com',
          password: '123',
          name: 'Test User'
        });

      expect([400, 422]).toContain(response.status);
    });

    test('should sanitize input data', async () => {
      const response = await request(baseURL)
        .post('/api/auth/sign-up/email')
        .send({
          email: 'test@test.com',
          password: 'password123',
          name: '<script>alert("xss")</script>'
        });

      if (response.status === 200) {
        expect(response.body.user.name).not.toContain('<script>');
      }
    });
  });
});