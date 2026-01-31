/**
 * Generates test fixture files (PDFs, DOCX, etc.)
 * Creates in-memory buffers for testing without actual file creation
 */

/**
 * Create a minimal valid PDF buffer in memory
 * This is a valid but minimal PDF structure that pdf-parse can read
 * @returns {Buffer} - PDF buffer
 */
export function generateMinimalPdfBuffer() {
  // Minimal valid PDF with text
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(John Doe) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000244 00000 n
0000000333 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
427
%%EOF`;

  return Buffer.from(pdfContent, 'utf8');
}

/**
 * Create a complete resume PDF buffer with all sections
 * @returns {Buffer} - PDF buffer containing full resume
 */
export function generateCompletePdfBuffer() {
  const resumeContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 800 >>
stream
BT
/F1 16 Tf
100 750 Td
(John Doe) Tj
/F1 10 Tf
0 -20 Td
(john@example.com | +1 (555) 123-4567 | San Francisco, CA) Tj
0 -30 Td
(GitHub: github.com/johndoe | LinkedIn: linkedin.com/in/johndoe) Tj
0 -40 Td
(SUMMARY) Tj
0 -15 Td
(Experienced Software Engineer with 5+ years building scalable web applications) Tj
0 -30 Td
(TECHNICAL SKILLS) Tj
0 -15 Td
(Languages: JavaScript, TypeScript, Python, Java) Tj
0 -15 Td
(Frontend: React, Vue.js, Angular, HTML5, CSS3) Tj
0 -15 Td
(Backend: Node.js, Express, Django, Spring Boot) Tj
0 -15 Td
(Databases: PostgreSQL, MongoDB, Redis) Tj
0 -15 Td
(Tools: Docker, Kubernetes, AWS, Git, CI/CD) Tj
0 -30 Td
(EXPERIENCE) Tj
0 -15 Td
(Senior Software Engineer | Tech Corp | 2022 - Present) Tj
0 -15 Td
(- Led team of 5 engineers in building microservices) Tj
0 -15 Td
(- Improved API performance by 40% through optimization) Tj
0 -30 Td
(Software Engineer | StartUp Inc | 2019 - 2022) Tj
0 -15 Td
(- Full-stack development using React and Node.js) Tj
0 -30 Td
(EDUCATION) Tj
0 -15 Td
(B.S. Computer Science | State University | 2019) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000244 00000 n
0000000333 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
1183
%%EOF`;

  return Buffer.from(resumeContent, 'utf8');
}

/**
 * Create a minimal resume with just name and skills
 * @returns {Buffer} - PDF buffer
 */
export function generateMinimalResumePdfBuffer() {
  const resumeContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 200 >>
stream
BT
/F1 16 Tf
100 750 Td
(Jane Smith) Tj
/F1 10 Tf
0 -30 Td
(Skills: React, JavaScript) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000244 00000 n
0000000333 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
583
%%EOF`;

  return Buffer.from(resumeContent, 'utf8');
}

/**
 * Create a PDF with no skills section
 * @returns {Buffer} - PDF buffer
 */
export function generateNoSkillsPdfBuffer() {
  const resumeContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 300 >>
stream
BT
/F1 16 Tf
100 750 Td
(Robert Johnson) Tj
/F1 10 Tf
0 -30 Td
(Email: robert@example.com) Tj
0 -30 Td
(EXPERIENCE) Tj
0 -15 Td
(Manager at Company ABC, 2020-Present) Tj
0 -30 Td
(EDUCATION) Tj
0 -15 Td
(MBA, State University) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000244 00000 n
0000000333 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
653
%%EOF`;

  return Buffer.from(resumeContent, 'utf8');
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
 * Create a DOCX-like buffer (simplified, just for file type testing)
 * @returns {Buffer} - DOCX format buffer
 */
export function generateDocxBuffer() {
  // DOCX files are ZIP archives with XML inside
  // For testing, we'll create a minimal structure
  // Real DOCX has PK header (ZIP signature)
  const docxContent = Buffer.from([
    0x50, 0x4b, 0x03, 0x04, // PK signature
    0x14, 0x00, 0x06, 0x00, // Version info
    0x08, 0x00, 0x00, 0x00, // Method
    0x21, 0x00, 0x00, 0x00, // More headers
    ...Buffer.from('Jane Smith resume content'), // Text content
  ]);

  return docxContent;
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
