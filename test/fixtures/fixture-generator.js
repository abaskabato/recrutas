/**
 * Generates test fixture files (PDFs, DOCX, etc.)
 * Creates in-memory buffers for testing without actual file creation
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Real PDF downloaded from RIT Career Services — passes magic-byte validation
// and contains a full CS resume for AI parsing tests
const SAMPLE_PDF_PATH = join(__dirname, 'sample-resume.pdf');

function loadSamplePdf() {
  return readFileSync(SAMPLE_PDF_PATH);
}

/**
 * Create a minimal valid PDF buffer in memory
 * @returns {Buffer} - Real PDF buffer
 */
export function generateMinimalPdfBuffer() {
  return loadSamplePdf();
}

/**
 * Create a complete resume PDF buffer with all sections
 * @returns {Buffer} - Real PDF buffer
 */
export function generateCompletePdfBuffer() {
  return loadSamplePdf();
}

/**
 * Create a minimal resume with just name and skills
 * @returns {Buffer} - Real PDF buffer
 */
export function generateMinimalResumePdfBuffer() {
  return loadSamplePdf();
}

/**
 * Create a PDF with no skills section — reuses real PDF for upload tests;
 * no-skills scenario is tested at the AI parsing layer separately.
 * @returns {Buffer} - Real PDF buffer
 */
export function generateNoSkillsPdfBuffer() {
  return loadSamplePdf();
}

/**
 * Create a malformed/corrupted PDF buffer
 * @returns {Buffer} - Invalid PDF buffer
 */
export function generateMalformedPdfBuffer() {
  // Invalid PDF structure
  return Buffer.from('%PDF-1.4\nGarbled content here...\nNot a valid PDF!', 'utf8');
}

/**
 * Create a large PDF buffer (simulates large file)
 * @returns {Buffer} - Large PDF buffer (5MB equivalent)
 */
export function generateLargePdfBuffer() {
  // Create a buffer that simulates a large PDF
  // In reality, we'll create a smaller one but mark it as large
  const baseContent = generateCompletePdfBuffer();

  // Repeat content to make it larger
  let largeBuffer = Buffer.alloc(baseContent.length * 20);
  for (let i = 0; i < 20; i++) {
    baseContent.copy(largeBuffer, i * baseContent.length);
  }

  return largeBuffer;
}

/**
 * Create a DOCX-like buffer for testing
 * Returns text content that the parser can process
 * @returns {Buffer} - Text buffer with resume content
 */
export function generateDocxBuffer() {
  // Return text content for testing - actual DOCX parsing requires proper ZIP structure
  const content = `Jane Smith
jane.smith@email.com
+1 (555) 234-5678
New York, NY

SUMMARY
Frontend Developer with 3 years of experience in building responsive web applications.

SKILLS
React, JavaScript, TypeScript, HTML, CSS, Node.js, Git

EXPERIENCE
Frontend Developer | WebTech Solutions | 2021 - Present
- Developed responsive web applications using React and TypeScript
- Collaborated with UX designers to implement user interfaces
- Optimized application performance

Junior Developer | StartUp Hub | 2020 - 2021
- Built and maintained web features using JavaScript
- Participated in code reviews and agile processes

EDUCATION
B.S. Computer Science | Tech University | 2020`;
  return Buffer.from(content, 'utf8');
}

/**
 * Create an unsupported file format (e.g., .exe)
 * @returns {Buffer} - Unsupported file buffer
 */
export function generateUnsupportedFileBuffer() {
  // EXE file signature
  return Buffer.from([
    0x4d, 0x5a, 0x90, 0x00, // MZ header (EXE)
    ...Buffer.from('This is not a valid document'),
  ]);
}

/**
 * Create a text file buffer
 * @returns {Buffer} - Plain text buffer
 */
export function generateTextFileBuffer() {
  const content = `John Doe
john@example.com
+1 (555) 123-4567

SKILLS:
JavaScript, React, Node.js, Python

EXPERIENCE:
Senior Engineer at Tech Corp (2022-Present)
- Led team of developers
- Built scalable systems`;

  return Buffer.from(content, 'utf8');
}

/**
 * Export all fixture generator functions
 */
export const fixtureGenerators = {
  minimalPdf: generateMinimalPdfBuffer,
  completePdf: generateCompletePdfBuffer,
  minimalResumePdf: generateMinimalResumePdfBuffer,
  noSkillsPdf: generateNoSkillsPdfBuffer,
  malformedPdf: generateMalformedPdfBuffer,
  largePdf: generateLargePdfBuffer,
  docx: generateDocxBuffer,
  unsupportedFile: generateUnsupportedFileBuffer,
  textFile: generateTextFileBuffer,
};
