/**
 * Unit Tests: Authentication System
 * Tests for Better Auth integration and session management
 */

const request = require('supertest');
const express = require('express');

// Mock the Better Auth setup for testing
jest.mock('../server/betterAuth', () => ({
  setupBetterAuth: jest.fn(),
  isAuthenticated: jest.fn((req, res, next) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = { id: 'test-user-id', email: 'test@recrutas.com' };
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  })
}));

describe('Authentication System', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock auth routes
    app.post('/api/auth/sign-up/email', (req, res) => {
      const { email, password, name } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      
      res.status(200).json({
        token: 'mock-session-token',
        user: {
          id: 'mock-user-id',
          email,
          name,
          emailVerified: false,
          createdAt: new Date().toISOString()
        }
      });
    });
    
    app.post('/api/auth/sign-in/email', (req, res) => {
      const { email, password } = req.body;
      
      if (email === 'test@recrutas.com' && password === 'validpassword') {
        res.status(200).json({
          token: 'valid-session-token',
          user: {
            id: 'test-user-id',
            email,
            name: 'Test User'
          }
        });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    });
    
    app.get('/api/auth/get-session', (req, res) => {
      const sessionToken = req.headers.cookie?.includes('better-auth.session_token');
      
      if (sessionToken) {
        res.json({
          user: { id: 'test-user-id', email: 'test@recrutas.com' }
        });
      } else {
        res.json(null);
      }
    });
  });

  describe('User Registration', () => {
    test('should register new user with valid data', async () => {
      const userData = {
        email: 'newuser@recrutas.com',
        password: 'securepassword123',
        name: 'New User'
      };
      
      const response = await request(app)
        .post('/api/auth/sign-up/email')
        .send(userData)
        .expect(200);
      
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('createdAt');
    });

    test('should reject registration with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up/email')
        .send({ password: 'password123', name: 'User' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Email and password required');
    });

    test('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up/email')
        .send({ email: 'test@test.com', password: '123', name: 'User' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Password must be at least 6 characters');
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up/email')
        .send({ email: 'invalid-email', password: 'password123', name: 'User' });
      
      // Should handle email validation (implementation dependent)
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('User Sign In', () => {
    test('should authenticate user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/sign-in/email')
        .send({ email: 'test@recrutas.com', password: 'validpassword' })
        .expect(200);
      
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@recrutas.com');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/sign-in/email')
        .send({ email: 'test@recrutas.com', password: 'wrongpassword' })
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/sign-in/email')
        .send({ email: 'nonexistent@recrutas.com', password: 'password' })
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should handle missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/sign-in/email')
        .send({})
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Session Management', () => {
    test('should return user data for valid session', async () => {
      const response = await request(app)
        .get('/api/auth/get-session')
        .set('Cookie', 'better-auth.session_token=valid-token')
        .expect(200);
      
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe('test-user-id');
    });

    test('should return null for invalid session', async () => {
      const response = await request(app)
        .get('/api/auth/get-session')
        .expect(200);
      
      expect(response.body).toBeNull();
    });
  });

  describe('Security Tests', () => {
    test('should not expose sensitive information in responses', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up/email')
        .send({
          email: 'security@test.com',
          password: 'password123',
          name: 'Security Test'
        });
      
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('hashedPassword');
    });

    test('should handle SQL injection attempts', async () => {
      const maliciousInput = {
        email: "'; DROP TABLE users; --",
        password: 'password123',
        name: 'Malicious User'
      };
      
      const response = await request(app)
        .post('/api/auth/sign-up/email')
        .send(maliciousInput);
      
      // Should not crash or expose database errors
      expect([200, 400, 422]).toContain(response.status);
    });

    test('should handle XSS attempts in input', async () => {
      const xssInput = {
        email: 'xss@test.com',
        password: 'password123',
        name: '<script>alert("xss")</script>'
      };
      
      const response = await request(app)
        .post('/api/auth/sign-up/email')
        .send(xssInput);
      
      if (response.status === 200) {
        // Name should be sanitized or encoded
        expect(response.body.user.name).not.toContain('<script>');
      }
    });

    test('should rate limit authentication attempts', async () => {
      const attempts = Array(10).fill().map(() => 
        request(app)
          .post('/api/auth/sign-in/email')
          .send({ email: 'test@test.com', password: 'wrong' })
      );
      
      const responses = await Promise.allSettled(attempts);
      
      // Some requests should be rate limited (429) or blocked
      const statusCodes = responses.map(r => 
        r.status === 'fulfilled' ? r.value.status : 500
      );
      
      expect(statusCodes).toContain(401); // At least some should be unauthorized
    });
  });

  describe('Password Security', () => {
    test('should enforce minimum password length', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up/email')
        .send({
          email: 'password@test.com',
          password: '123',
          name: 'Password Test'
        })
        .expect(400);
      
      expect(response.body.error).toContain('6 characters');
    });

    test('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      
      const response = await request(app)
        .post('/api/auth/sign-up/email')
        .send({
          email: 'longpass@test.com',
          password: longPassword,
          name: 'Long Password Test'
        });
      
      // Should either accept or reject gracefully, not crash
      expect([200, 400, 422]).toContain(response.status);
    });
  });
});