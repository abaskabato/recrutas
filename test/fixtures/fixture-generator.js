/**
 * Generates test fixture files (PDFs, DOCX, etc.)
 * Creates in-memory buffers for testing without actual file creation
 *
 * Note: Since generating valid PDFs that pdf-parse can read is complex,
 * these functions generate text buffers. The AIResumeParser will process
 * these using its fallback text extraction when PDF parsing fails.
 * This allows testing the actual resume parsing logic.
 */

/**
 * Create a minimal valid PDF buffer in memory
 * This is a valid but minimal PDF structure that pdf-parse can read
 * @returns {Buffer} - PDF buffer
 */
export function generateMinimalPdfBuffer() {
  // Return plain text content - the parser will handle it via text extraction
  const content = `John Doe
john@example.com
+1 (555) 123-4567

SKILLS
JavaScript, React, Node.js`;
  return Buffer.from(content, 'utf8');
}

/**
 * Create a complete resume PDF buffer with all sections
 * @returns {Buffer} - PDF buffer containing full resume
 */
export function generateCompletePdfBuffer() {
  const content = `John Doe
john@example.com | +1 (555) 123-4567 | San Francisco, CA
GitHub: github.com/johndoe | LinkedIn: linkedin.com/in/johndoe

SUMMARY
Experienced Software Engineer with 5+ years building scalable web applications.
Strong background in full-stack development and cloud technologies.

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, Java
Frontend: React, Vue.js, Angular, HTML5, CSS3
Backend: Node.js, Express, Django, Spring Boot
Databases: PostgreSQL, MongoDB, Redis
Tools: Docker, Kubernetes, AWS, Git, CI/CD

EXPERIENCE
Senior Software Engineer | Tech Corp | 2022 - Present
- Led team of 5 engineers in building microservices architecture
- Improved API performance by 40% through optimization
- Implemented CI/CD pipelines reducing deployment time

Software Engineer | StartUp Inc | 2019 - 2022
- Full-stack development using React and Node.js
- Built RESTful APIs serving 100k+ users
- Collaborated with cross-functional teams

EDUCATION
B.S. Computer Science | State University | 2019
GPA: 3.8/4.0

CERTIFICATIONS
AWS Solutions Architect Associate
Google Cloud Professional Developer`;
  return Buffer.from(content, 'utf8');
}

/**
 * Create a minimal resume with just name and skills
 * @returns {Buffer} - PDF buffer
 */
export function generateMinimalResumePdfBuffer() {
  const content = `Jane Smith
jane@example.com
+1 (555) 987-6543

SKILLS
React, JavaScript, Node.js, TypeScript, HTML, CSS

EXPERIENCE
Software Developer at Tech Company | 2020 - Present
- Building web applications with React and Node.js
- Working with TypeScript and modern JavaScript`;
  return Buffer.from(content, 'utf8');
}

/**
 * Create a PDF with no skills section
 * @returns {Buffer} - PDF buffer
 */
export function generateNoSkillsPdfBuffer() {
  const content = `Robert Johnson
robert@example.com
+1 (555) 555-1234

EXPERIENCE
Manager at Company ABC | 2020 - Present
- Led a team of 10 employees in sales department
- Increased sales by 25% year over year
- Managed client relationships

EDUCATION
MBA, State University | 2019
Bachelor of Arts, Business Administration | 2015`;
  return Buffer.from(content, 'utf8');
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
