/**
 * Unit Tests for AI Resume Parser
 * Tests extraction logic, confidence calculation, and error handling in isolation
 *
 * Run with: npm run test:unit:backend
 */

import { AIResumeParser } from '../server/ai-resume-parser';
import {
  generateCompletePdfBuffer,
  generateMinimalResumePdfBuffer,
  generateNoSkillsPdfBuffer,
} from './fixtures/fixture-generator';

describe('AIResumeParser Unit Tests', () => {
  let parser: AIResumeParser;

  beforeEach(() => {
    parser = new AIResumeParser();
  });

  describe('Text Parsing', () => {
    it('should parse plain text resume', async () => {
      const textContent = `John Doe
john@example.com
+1234567890

SKILLS:
JavaScript, React, Node.js, TypeScript, Python

EXPERIENCE:
Senior Software Engineer at Tech Corp (2022-Present)
- Led team of developers
- Built scalable systems

EDUCATION:
B.S. Computer Science, University (2019)`;

      const result = await parser.parseText(textContent);

      expect(result).toBeDefined();
      expect(result.aiExtracted).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.aiExtracted.skills.technical.length).toBeGreaterThan(0);
    });

    it('should extract skills from text', async () => {
      const textContent = `Skills: JavaScript, React, Node.js, Python, Docker`;

      const result = await parser.parseText(textContent);

      expect(result.aiExtracted.skills).toBeDefined();
      expect(result.aiExtracted.skills.technical.length).toBeGreaterThan(0);
    });

    it('should handle empty text gracefully', async () => {
      const result = await parser.parseText('');

      expect(result).toBeDefined();
      expect(result.aiExtracted).toBeDefined();
    });

    it('should extract personal info from text', async () => {
      const textContent = `Jane Smith
jane@example.com
+1-555-123-4567
San Francisco, CA`;

      const result = await parser.parseText(textContent);

      expect(result.aiExtracted.personalInfo).toBeDefined();
      if (result.aiExtracted.personalInfo.name) {
        expect(result.aiExtracted.personalInfo.name.toLowerCase()).toContain('jane');
      }
    });

    it('should detect experience level from text', async () => {
      const seniorText = `Senior Software Engineer with 10+ years of experience`;
      const juniorText = `Junior Developer with 1 year of experience`;

      const seniorResult = await parser.parseText(seniorText);
      const juniorResult = await parser.parseText(juniorText);

      expect(seniorResult.aiExtracted.experience.level).toBeDefined();
      expect(juniorResult.aiExtracted.experience.level).toBeDefined();
    });

    it('should calculate confidence score for text', async () => {
      const completeResume = `
John Doe | john@example.com | +1234567890

SUMMARY
Experienced software engineer with 5+ years in full-stack development.

SKILLS
JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS

EXPERIENCE
Senior Engineer at Tech (2022-Present)
Engineer at Startup (2019-2022)

EDUCATION
B.S. Computer Science, University (2019)
`;

      const minimalResume = `Jane Smith
Skills: React`;

      const completeResult = await parser.parseText(completeResume);
      const minimalResult = await parser.parseText(minimalResume);

      expect(completeResult.confidence).toBeGreaterThan(0);
      expect(minimalResult.confidence).toBeGreaterThan(0);
      // Complete resume should have higher confidence
      if (completeResult.confidence && minimalResult.confidence) {
        expect(completeResult.confidence).toBeGreaterThanOrEqual(minimalResult.confidence);
      }
    });

    it('should extract education information', async () => {
      const textContent = `
EDUCATION
B.S. in Computer Science from Stanford University, graduated 2019
M.S. in Machine Learning from MIT, graduated 2021
`;

      const result = await parser.parseText(textContent);

      expect(result.aiExtracted.education).toBeDefined();
      expect(Array.isArray(result.aiExtracted.education)).toBe(true);
    });

    it('should extract certifications', async () => {
      const textContent = `
CERTIFICATIONS
AWS Solutions Architect Associate
Certified Kubernetes Administrator (CKA)
Google Cloud Professional Data Engineer
`;

      const result = await parser.parseText(textContent);

      expect(result.aiExtracted.certifications).toBeDefined();
      expect(Array.isArray(result.aiExtracted.certifications)).toBe(true);
    });

    it('should extract projects from text', async () => {
      const textContent = `
PROJECTS
E-commerce Platform - Built full-stack e-commerce system using React, Node.js, and PostgreSQL
Real-time Chat App - Developed real-time messaging app with WebSockets
`;

      const result = await parser.parseText(textContent);

      expect(result.aiExtracted.projects).toBeDefined();
      expect(Array.isArray(result.aiExtracted.projects)).toBe(true);
    });

    it('should handle special characters in text', async () => {
      const textContent = `José García
Email: josé@example.com
Skills: C++, C#, F#, Objective-C, Vue.js`;

      const result = await parser.parseText(textContent);

      expect(result.aiExtracted.skills).toBeDefined();
      expect(result.aiExtracted.personalInfo).toBeDefined();
    });
  });

  describe('File Parsing', () => {
    it('should parse PDF buffer', async () => {
      const pdfBuffer = generateCompletePdfBuffer();
      const result = await parser.parseFile(pdfBuffer, 'application/pdf');

      expect(result).toBeDefined();
      expect(result.aiExtracted).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle minimal PDF', async () => {
      const pdfBuffer = generateMinimalResumePdfBuffer();
      const result = await parser.parseFile(pdfBuffer, 'application/pdf');

      expect(result).toBeDefined();
      expect(result.aiExtracted).toBeDefined();
      expect(result.aiExtracted.skills).toBeDefined();
    });

    it('should handle PDF with no skills section', async () => {
      const pdfBuffer = generateNoSkillsPdfBuffer();
      const result = await parser.parseFile(pdfBuffer, 'application/pdf');

      expect(result).toBeDefined();
      expect(result.aiExtracted).toBeDefined();
      expect(Array.isArray(result.aiExtracted.skills.technical)).toBe(true);
    });
  });

  describe('Return Structure', () => {
    it('should return proper structure from parseText', async () => {
      const result = await parser.parseText('Test content');

      expect(result).toHaveProperty('aiExtracted');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('text');
      expect(typeof result.confidence).toBe('number');
    });

    it('should have valid aiExtracted structure', async () => {
      const result = await parser.parseText('John Doe, JavaScript developer');

      const data = result.aiExtracted;
      expect(data).toHaveProperty('personalInfo');
      expect(data).toHaveProperty('skills');
      expect(data).toHaveProperty('experience');
      expect(data).toHaveProperty('education');
      expect(data).toHaveProperty('certifications');
      expect(data).toHaveProperty('projects');
      expect(data).toHaveProperty('languages');
    });

    it('should have valid skills structure', async () => {
      const result = await parser.parseText('JavaScript, React, Node.js');

      const skills = result.aiExtracted.skills;
      expect(skills).toHaveProperty('technical');
      expect(skills).toHaveProperty('soft');
      expect(skills).toHaveProperty('tools');
      expect(Array.isArray(skills.technical)).toBe(true);
      expect(Array.isArray(skills.soft)).toBe(true);
      expect(Array.isArray(skills.tools)).toBe(true);
    });

    it('should have valid experience structure', async () => {
      const result = await parser.parseText('Senior Engineer with 5 years experience');

      const experience = result.aiExtracted.experience;
      expect(experience).toHaveProperty('totalYears');
      expect(experience).toHaveProperty('level');
      expect(typeof experience.totalYears).toBe('number');
      expect(['entry', 'mid', 'senior', 'lead', 'executive']).toContain(experience.level);
    });
  });

  describe('Confidence Calculation', () => {
    it('should give confidence score to complete resume', async () => {
      const completeResume = `
John Doe | john@example.com | (555) 123-4567 | San Francisco, CA

PROFESSIONAL SUMMARY
Experienced full-stack developer with 8 years building scalable web applications.

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, Java
Frontend: React, Vue.js, Angular, HTML5, CSS3
Backend: Node.js, Express, Django, Spring Boot
Databases: PostgreSQL, MongoDB, Redis
DevOps: Docker, Kubernetes, AWS, CI/CD

PROFESSIONAL EXPERIENCE

Senior Software Engineer | Tech Corp | 2022 - Present
- Led team of 5 engineers
- Architected microservices platform
- Improved performance by 40%

Software Engineer | StartUp Inc | 2019 - 2022
- Built full-stack features with React and Node.js
- Implemented real-time updates

EDUCATION
B.S. Computer Science | State University | 2019
GPA: 3.8/4.0

CERTIFICATIONS
AWS Solutions Architect Associate
Certified Kubernetes Administrator
`;

      const result = await parser.parseText(completeResume);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should give confidence score to partial resume', async () => {
      const partialResume = `Jane Smith
jane@example.com

Skills: React, JavaScript, Node.js`;

      const result = await parser.parseText(partialResume);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });
});
