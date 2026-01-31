/**
 * Integration Tests for Resume Upload API
 * Tests file validation, authentication, and response structure
 *
 * Run with: npm run test:integration:backend
 */

import {
  generateCompletePdfBuffer,
  generateMinimalResumePdfBuffer,
  generateDocxBuffer,
} from './fixtures/fixture-generator';
import { createNewUserAndGetToken, deleteUser } from './test-utils';

describe('Resume Upload API Integration Tests', () => {
  let testUserId: string;
  let authToken: string;
  const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

  beforeAll(async () => {
    // Create test user
    const result = await createNewUserAndGetToken();
    testUserId = result.userId;
    authToken = result.token;
  });

  afterAll(async () => {
    // Cleanup
    if (testUserId) {
      await deleteUser(testUserId);
    }
  });

  describe('File Validation', () => {
    it('should accept valid PDF files', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('resumeUrl');
      expect(data).toHaveProperty('parsed');
      expect(data).toHaveProperty('aiParsing');
      expect(typeof data.resumeUrl).toBe('string');
    });

    it('should accept valid DOCX files', async () => {
      const docxBuffer = generateDocxBuffer();

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([docxBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        'resume.docx'
      );

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('resumeUrl');
    });

    it('should reject files over 5MB', async () => {
      // Create a buffer larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([largeBuffer], { type: 'application/pdf' }),
        'large-resume.pdf'
      );

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message || data.error).toContain('5MB');
    });

    it('should reject unsupported file types', async () => {
      const textBuffer = Buffer.from('This is not a PDF');

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([textBuffer], { type: 'application/octet-stream' }),
        'resume.txt'
      );

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message || data.error).toContain('Unsupported' || 'PDF' || 'DOCX');
    });

    it('should reject files without proper magic bytes', async () => {
      // Create buffer that starts like PDF but isn't valid
      const fakePdfBuffer = Buffer.from('%PDF-1.4 not actually a pdf');

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([fakePdfBuffer], { type: 'application/pdf' }),
        'fake.pdf'
      );

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      // Should reject or fail parsing
      expect([400, 422]).toContain(response.status);
    });

    it('should require file in request', async () => {
      const formData = new FormData();
      // Don't append any file

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message || data.error).toContain('file' || 'required');
    });
  });

  describe('Authentication', () => {
    it('should require valid Bearer token', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
        body: formData,
      });

      expect(response.status).toBe(401);
    });

    it('should reject requests without Authorization header', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Response Structure', () => {
    it('should return proper response structure on success', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Required fields
      expect(data).toHaveProperty('resumeUrl');
      expect(data).toHaveProperty('parsed');
      expect(data).toHaveProperty('aiParsing');

      // Type validation
      expect(typeof data.resumeUrl).toBe('string');
      expect(typeof data.parsed).toBe('boolean');
      expect(typeof data.aiParsing).toBe('boolean');

      // Resume URL should be valid
      expect(data.resumeUrl).toMatch(/^https?:\/\//);
    });

    it('should return parsed=false immediately (async processing)', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      // Should indicate parsing is in progress
      expect(data.parsed).toBe(false);
      expect(data.aiParsing).toBe(true);
    });

    it('should not include extractedInfo until parsing completes', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      // extractedInfo should be null until async processing completes
      expect(data.extractedInfo === null || data.extractedInfo === undefined).toBe(true);
    });
  });

  describe('Concurrent Uploads', () => {
    it('should handle multiple uploads from same user', async () => {
      const pdf1 = generateCompletePdfBuffer();
      const pdf2 = generateMinimalResumePdfBuffer();

      const formData1 = new FormData();
      formData1.append('file', new Blob([pdf1], { type: 'application/pdf' }), 'resume1.pdf');

      const formData2 = new FormData();
      formData2.append('file', new Blob([pdf2], { type: 'application/pdf' }), 'resume2.pdf');

      const [response1, response2] = await Promise.all([
        fetch(`${API_BASE}/candidate/resume`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData1,
        }),
        fetch(`${API_BASE}/candidate/resume`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData2,
        }),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Both should have valid resumeUrls
      expect(data1.resumeUrl).toBeDefined();
      expect(data2.resumeUrl).toBeDefined();

      // URLs should be different
      expect(data1.resumeUrl).not.toBe(data2.resumeUrl);
    });
  });

  describe('Performance', () => {
    it('should complete upload in under 2 seconds', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const startTime = Date.now();

      const response = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000);
    });
  });
});
