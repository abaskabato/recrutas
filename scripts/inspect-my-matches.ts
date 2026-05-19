/**
 * Inspect the live job feed for a specific candidate (no auth) by running the
 * same getJobRecommendations the /api/ai-matches endpoint uses.
 *
 * Usage: npx tsx scripts/inspect-my-matches.ts <userId>
 */

import { storage } from '../server/storage.js';
import { client } from '../server/db.js';

const userId = process.argv[2] || '94592c0d-223a-4f08-9889-36b67ef783b7';

async function main() {
  console.log(`[inspect] user=${userId}`);
  const result = await storage.getJobRecommendations(userId, undefined, { page: 1, limit: 20 });
  console.log(`[inspect] total=${result.total} page=${result.page} returned=${result.jobs.length}`);
  console.log('');

  for (const [i, j] of result.jobs.entries()) {
    const c = j.scoreComponents || {};
    const skills = Array.isArray(j.job?.skills) ? j.job.skills.length : (Array.isArray(j.skills) ? j.skills.length : 0);
    const title = j.job?.title ?? j.title;
    const company = j.job?.company ?? j.company;
    const location = j.job?.location ?? j.location;
    const matched = Array.isArray(j.skillMatches) ? j.skillMatches.length : 0;
    const partial = Array.isArray(j.partialSkillMatches) ? j.partialSkillMatches.length : 0;
    console.log(
      `${String(i + 1).padStart(2)}. ${j.matchScore}% │ ${title} @ ${company}`
    );
    console.log(
      `    ${location ?? '—'} │ jobSkills=${skills} matched=${matched} partial=${partial}`
    );
    console.log(
      `    comp: kw=${c.keywordScore ?? '—'} sem=${c.semanticScore ?? '—'} title=${c.titleScore ?? '—'} exp=${c.experienceScore ?? '—'} ctx=+${c.contextBonus ?? 0} (sem? ${c.hasSemanticSignal ? 'y' : 'n'})`
    );
    if (j.aiExplanation) console.log(`    why: ${j.aiExplanation}`);
    console.log('');
  }
}

main()
  .then(() => { client?.end(); process.exit(0); })
  .catch((err) => { console.error('Fatal:', err); client?.end(); process.exit(1); });
