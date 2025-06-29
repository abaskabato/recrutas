/**
 * Test Environment Setup for Recrutas Platform
 * Production Testing Framework Configuration
 */

// Setup testing environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/recrutas_test';

// Global test utilities
global.testUtils = {
  // Test data generators
  generateTestUser: () => ({
    id: `test-user-${Date.now()}`,
    email: `test${Date.now()}@recrutas.com`,
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    role: 'candidate',
    profileComplete: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }),

  generateTestJob: () => ({
    id: `test-job-${Date.now()}`,
    title: 'Software Developer',
    company: 'Test Company',
    description: 'Test job description',
    requirements: ['JavaScript', 'React'],
    skills: ['TypeScript', 'Node.js'],
    location: 'Remote',
    salaryMin: 50000,
    salaryMax: 80000,
    workType: 'remote',
    createdAt: new Date(),
    updatedAt: new Date()
  }),

  // Test assertion helpers
  expectValidJobObject: (job) => {
    expect(job).toHaveProperty('id');
    expect(job).toHaveProperty('title');
    expect(job).toHaveProperty('company');
    expect(job).toHaveProperty('description');
    expect(job.skills).toBeInstanceOf(Array);
    expect(job.requirements).toBeInstanceOf(Array);
  },

  expectValidUserObject: (user) => {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  }
};

console.log('🧪 Test environment configured for Recrutas platform');