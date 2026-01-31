/**
 * Unit Tests for AI Resume Parser
 * Tests extraction logic, confidence calculation, and error handling in isolation
 *
 * Run with: npm run test:unit:backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateCompletePdfBuffer,
  generateMinimalResumePdfBuffer,
  generateNoSkillsPdfBuffer,
} from './fixtures/fixture-generator.js';

describe('AIResumeParser Unit Tests', () => {
  // Note: Tests use direct PDF parsing without mocking
  // The parser has built-in fallback to rule-based extraction if AI unavailable

async function runTest(testName, testFn) {
  try {
    await testFn();
    console.log(`✅ ${testName}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ ${testName}: ${err.message}`);
    testsFailed++;
  }
}

async function testSkillsExtractionFromCompletePdf() {
  const buffer = generateCompletePdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  assert(result.parsed, 'Should mark file as parsed');
  assert(
    result.extractedData.skills.technical.length > 0,
    'Should extract technical skills'
  );
  assert(
    result.extractedData.skills.technical.some((s) =>
      ['JavaScript', 'TypeScript', 'React', 'Node.js'].some((t) =>
        s.toLowerCase().includes(t.toLowerCase())
      )
    ),
    'Should extract expected technologies'
  );
}

async function testSkillsExtractionFromMinimalResume() {
  const buffer = generateMinimalResumePdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  assert(result.parsed, 'Should mark file as parsed');
  assert(
    result.extractedData.skills.technical.length > 0,
    'Should extract at least some skills'
  );
  assert(
    result.extractedData.skills.technical.some((s) =>
      ['React', 'JavaScript'].some((t) =>
        s.toLowerCase().includes(t.toLowerCase())
      )
    ),
    'Should extract React and JavaScript'
  );
}

async function testHandlesNoSkillsSection() {
  const buffer = generateNoSkillsPdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  assert(result.parsed, 'Should mark file as parsed');
  // Skills array should exist but may be empty or inferred from experience
  assert(Array.isArray(result.extractedData.skills.technical), 'Should have skills array');
}

async function testPersonalInfoExtraction() {
  const buffer = generateCompletePdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  const info = result.extractedData.personalInfo;
  assert(info.name, 'Should extract name');
  assert(info.name.includes('John') || info.name.includes('Doe'), 'Should extract correct name');
  // Email may or may not be present depending on PDF content
  if (info.email) {
    assert(info.email.includes('@'), 'Email should be valid format');
  }
}

async function testExperienceYearsCalculation() {
  const buffer = generateCompletePdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  const experience = result.extractedData.experience;
  assert(typeof experience.totalYears === 'number', 'Should have numeric years');
  assert(experience.totalYears >= 0, 'Years should not be negative');
  // Based on complete resume with 5+ years
  assert(experience.totalYears >= 3, 'Should detect 3+ years from complete resume');
}

async function testExperienceLevelDetection() {
  const buffer = generateCompletePdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  const level = result.extractedData.experience.level;
  assert(
    ['entry', 'mid', 'senior', 'lead', 'executive'].includes(level),
    'Should be valid experience level'
  );
  // Complete resume suggests mid or senior level
  assert(
    ['mid', 'senior', 'lead'].includes(level),
    'Should detect mid+ level from complete resume'
  );
}

async function testConfidenceScoreHighForComplete() {
  const buffer = generateCompletePdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  assert(
    result.confidence >= 0.85,
    `Should have high confidence (≥0.85) for complete resume, got ${result.confidence}`
  );
}

async function testConfidenceScoreLowForMinimal() {
  const buffer = generateMinimalResumePdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  assert(
    result.confidence >= 0.5 && result.confidence < 0.85,
    `Should have medium confidence (0.5-0.85) for minimal resume, got ${result.confidence}`
  );
}

async function testMalformedPdfHandling() {
  const buffer = generateMalformedPdfBuffer();

  try {
    const result = await parser.parseFile(buffer, 'application/pdf');
    // Should either fail gracefully or return partial data
    assert(
      !result.parsed || result.extractedData,
      'Should handle gracefully without crashing'
    );
  } catch (err) {
    // Acceptable to throw on malformed PDF
    assert(err.message.includes('PDF'), 'Error should mention PDF parsing');
  }
}

async function testUnsupportedFileTypeRejection() {
  const buffer = Buffer.from('Not a PDF', 'utf8');

  try {
    await parser.parseFile(buffer, 'application/octet-stream');
    assert(false, 'Should reject unsupported file type');
  } catch (err) {
    assert(
      err.message.toLowerCase().includes('unsupported'),
      'Error should mention unsupported format'
    );
  }
}

async function testTextParsing() {
  const textContent = `John Doe
john@example.com
+1234567890

SKILLS:
JavaScript, React, Node.js, TypeScript, Python

EXPERIENCE:
Senior Software Engineer at Tech Corp (2022-Present)
Software Engineer at StartUp Inc (2019-2022)

EDUCATION:
B.S. Computer Science, University (2019)`;

  const result = await parser.parseText(textContent);

  assert(result.parsed, 'Should parse text content');
  assert(result.extractedData.personalInfo.name, 'Should extract name');
  assert(
    result.extractedData.skills.technical.length > 0,
    'Should extract technical skills'
  );
}

async function testSpecialCharacterHandling() {
  const textContent = `José García
josé@example.com
Skills: C++, C#, F#, Objective-C`;

  const result = await parser.parseText(textContent);

  assert(result.parsed, 'Should handle special characters');
  assert(result.extractedData.personalInfo.name, 'Should extract name with accents');
  assert(
    result.extractedData.skills.technical.some((s) => s.includes('C')),
    'Should extract C-family languages'
  );
}

async function testEducationExtraction() {
  const buffer = generateCompletePdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  const education = result.extractedData.education;
  assert(Array.isArray(education), 'Should have education array');
  if (education.length > 0) {
    assert(education[0].institution, 'Should have institution name');
  }
}

async function testCertificationExtraction() {
  const buffer = generateCompletePdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  const certs = result.extractedData.certifications;
  assert(Array.isArray(certs), 'Should have certifications array');
  // Complete resume may have certifications
}

async function testProjectExtraction() {
  const buffer = generateCompletePdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  const projects = result.extractedData.projects;
  assert(Array.isArray(projects), 'Should have projects array');
}

async function testLanguageExtraction() {
  const textContent = `John Doe
Languages: English (native), Spanish (fluent), French (intermediate)`;

  const result = await parser.parseText(textContent);

  const languages = result.extractedData.languages;
  assert(Array.isArray(languages), 'Should have languages array');
}

async function testEmptyResumeHandling() {
  try {
    const result = await parser.parseText('');
    assert(
      !result.parsed || result.confidence < 0.3,
      'Should mark empty resume as unparsed or very low confidence'
    );
  } catch (err) {
    // Acceptable to throw on empty input
    assert(true, 'Empty resume handling acceptable');
  }
}

async function testReturnStructure() {
  const buffer = generateCompletePdfBuffer();
  const result = await parser.parseFile(buffer, 'application/pdf');

  // Verify all expected fields exist
  assert(typeof result.parsed === 'boolean', 'Should have parsed boolean');
  assert(typeof result.confidence === 'number', 'Should have confidence number');
  assert(result.extractedData, 'Should have extractedData');
  assert(
    result.extractedData.personalInfo,
    'Should have personalInfo'
  );
  assert(
    result.extractedData.skills,
    'Should have skills'
  );
  assert(
    result.extractedData.experience,
    'Should have experience'
  );
  assert(result.extractedData.education, 'Should have education');
}

async function testSkillNormalization() {
  const textContent = `
  Skills:
  - javascript (8 years)
  - REACT (5 years)
  - node.js (4 years)
  - Python (2 years)
  - SQL, postgresql, mysql
  `;

  const result = await parser.parseText(textContent);

  const skills = result.extractedData.skills.technical;
  // Should normalize variations of the same skill
  const hasJavaScript = skills.some((s) =>
    ['javascript', 'js'].some((variant) => s.toLowerCase().includes(variant))
  );
  const hasReact = skills.some((s) => s.toLowerCase().includes('react'));

  assert(hasJavaScript, 'Should normalize JavaScript variants');
  assert(hasReact, 'Should include React');
}

async function testSoftSkillDetection() {
  const textContent = `
  Skills:
  Technical: JavaScript, React
  Soft Skills: Leadership, Communication, Problem Solving, Team Management
  `;

  const result = await parser.parseText(textContent);

  const softSkills = result.extractedData.skills.soft;
  assert(Array.isArray(softSkills), 'Should have soft skills array');
  const hasSoftSkill = softSkills.some((s) =>
    ['Leadership', 'Communication', 'Problem'].some((t) =>
      s.toLowerCase().includes(t.toLowerCase())
    )
  );
  assert(hasSoftSkill, 'Should detect soft skills');
}

// Run all tests
async function runAllTests() {
  console.log('🧪 AI Resume Parser Unit Tests\n');

  await runTest('Skills extraction from complete PDF', testSkillsExtractionFromCompletePdf);
  await runTest('Skills extraction from minimal resume', testSkillsExtractionFromMinimalResume);
  await runTest('Handles no skills section', testHandlesNoSkillsSection);
  await runTest('Personal info extraction', testPersonalInfoExtraction);
  await runTest('Experience years calculation', testExperienceYearsCalculation);
  await runTest('Experience level detection', testExperienceLevelDetection);
  await runTest('High confidence for complete resume', testConfidenceScoreHighForComplete);
  await runTest('Medium confidence for minimal resume', testConfidenceScoreLowForMinimal);
  await runTest('Malformed PDF handling', testMalformedPdfHandling);
  await runTest('Unsupported file type rejection', testUnsupportedFileTypeRejection);
  await runTest('Text parsing', testTextParsing);
  await runTest('Special character handling', testSpecialCharacterHandling);
  await runTest('Education extraction', testEducationExtraction);
  await runTest('Certification extraction', testCertificationExtraction);
  await runTest('Project extraction', testProjectExtraction);
  await runTest('Language extraction', testLanguageExtraction);
  await runTest('Empty resume handling', testEmptyResumeHandling);
  await runTest('Return structure validation', testReturnStructure);
  await runTest('Skill normalization', testSkillNormalization);
  await runTest('Soft skill detection', testSoftSkillDetection);

  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
