/**
 * Verify looksFirstCharDropped against:
 *  - the actual broken resume_text from the live DB (user's last parse)
 *  - a known-good resume sample (the demo text in ai-resume-parser.ts)
 *  - a few edge cases
 */
import 'dotenv/config';
import postgres from 'postgres';

// Re-export by importing the running module's behavior indirectly. The helper
// is private to ai-resume-parser.ts so we mirror its body here for the test.
// Keep the regex shape identical to the real implementation.
function looksFirstCharDropped(text: string): boolean {
  const MARKERS = [
    'EXPERIENCE', 'EDUCATION', 'SUMMARY', 'SKILLS', 'PROJECTS',
    'CERTIFICATIONS', 'LANGUAGES', 'EMPLOYMENT', 'PUBLICATIONS',
    'OBJECTIVE', 'INTERESTS', 'ACTIVITIES', 'ACHIEVEMENTS',
  ];
  let clean = 0;
  let dropped = 0;
  for (const m of MARKERS) {
    if (new RegExp(`\\b${m}\\b`).test(text)) clean++;
    if (new RegExp(`\\b${m.slice(1)}\\b`).test(text)) dropped++;
  }
  return dropped >= 2 && dropped > clean;
}

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });
  let pass = 0, fail = 0;
  const expect = (name: string, cond: boolean, detail?: string) => {
    if (cond) { console.log(`  ✓ ${name}`); pass++; }
    else { console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); fail++; }
  };

  // 1. Real broken text from the user's last parse
  const rows = await sql`
    SELECT resume_text FROM candidate_users
    WHERE user_id = '94592c0d-223a-4f08-9889-36b67ef783b7'
  `;
  const broken = rows[0]?.resume_text || '';
  console.log(`Broken text loaded: ${broken.length} chars`);
  console.log(`  preview: ${broken.slice(0, 200)}...`);
  expect('user\'s broken parse is detected as corrupted', looksFirstCharDropped(broken));

  // 2. Synthetic clean resume — should NOT be flagged.
  const cleanResume = `
    JOHN SMITH
    Software Engineer
    EDUCATION
    Stanford University, 2018
    EXPERIENCE
    Senior Software Engineer at Google, 2020-Present
    SKILLS
    Python, JavaScript, React, AWS
    PROJECTS
    Built a distributed cache system
  `;
  expect('clean resume is NOT flagged', !looksFirstCharDropped(cleanResume));

  // 3. Clean resume with NO section markers at all — should NOT be flagged.
  const noMarkers = `
    John Smith. Software Engineer. Stanford 2018. Worked at Google 2020-present.
  `;
  expect('text with no section markers is NOT flagged', !looksFirstCharDropped(noMarkers));

  // 4. Synthetic broken version of clean resume — should be flagged.
  const synthBroken = `
    OHN MITH
    XPERIENCE
    DUCATION
    KILLS
    Python, JavaScript
  `;
  expect('synthetic broken text is flagged', looksFirstCharDropped(synthBroken));

  // 5. Edge: only ONE corrupted marker is not enough.
  const oneCorrupted = `
    EDUCATION
    Stanford 2018
    XPERIENCE at Google
  `;
  expect('a single corrupted marker alone is NOT flagged', !looksFirstCharDropped(oneCorrupted));

  await sql.end();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
