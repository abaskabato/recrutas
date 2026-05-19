/**
 * Quick smoke test for the location penalty + helper functions.
 * Run: npx tsx scripts/test-location-penalty.ts
 */
import { scoreJob, isUsLocation, isNonUsLocation } from '../server/job-scorer';

let pass = 0, fail = 0;
function expect(name: string, cond: boolean, detail?: string) {
  if (cond) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); fail++; }
}

console.log('Helper: isUsLocation');
expect('"Seattle, WA"', isUsLocation('Seattle, WA'));
expect('"New York, NY, United States"', isUsLocation('New York, NY, United States'));
expect('"California"', isUsLocation('California'));
expect('"Remote - US"', isUsLocation('Remote - US'));
expect('"Bengaluru, India" is NOT US', !isUsLocation('Bengaluru, India'));
expect('"Mexico City, Mexico" is NOT US', !isUsLocation('Mexico City, Mexico'));

console.log('\nHelper: isNonUsLocation');
expect('"Bengaluru, India"', isNonUsLocation('Bengaluru, India'));
expect('"Mexico City, Mexico"', isNonUsLocation('Mexico City, Mexico'));
expect('"Singapore"', isNonUsLocation('Singapore'));
expect('"Prague, Czech Republic"', isNonUsLocation('Prague, Czech Republic'));
expect('"Seattle, WA" is NOT non-US', !isNonUsLocation('Seattle, WA'));

console.log('\nscoreJob: US candidate vs international non-remote on-site job');
const skills = ['PowerShell', 'Active Directory', 'Linux', 'Windows', 'Networking'];
const titles = ['IT Support Engineer'];
const ctx = { location: 'Seattle, WA', workType: 'hybrid' };

const usJob = { title: 'IT Support Engineer', skills: ['PowerShell', 'Linux', 'Windows'], description: 'Support role', location: 'Seattle, WA', workType: 'onsite' };
const intlOnSite = { title: 'IT Support Engineer', skills: ['PowerShell', 'Linux', 'Windows'], description: 'Support role', location: 'Bengaluru, India', workType: 'onsite' };
const intlRemote = { title: 'IT Support Engineer', skills: ['PowerShell', 'Linux', 'Windows'], description: 'Support role', location: 'Remote - India', workType: 'remote' };

const usScore = scoreJob(skills, 'senior', usJob, undefined, titles, ctx);
const intlOnSiteScore = scoreJob(skills, 'senior', intlOnSite, undefined, titles, ctx);
const intlRemoteScore = scoreJob(skills, 'senior', intlRemote, undefined, titles, ctx);

console.log(`  US (Seattle, onsite): score=${usScore.matchScore} ctx=${usScore.components.contextBonus}`);
console.log(`  Intl on-site (Bengaluru):    score=${intlOnSiteScore.matchScore} ctx=${intlOnSiteScore.components.contextBonus}`);
console.log(`  Intl remote (India remote):  score=${intlRemoteScore.matchScore} ctx=${intlRemoteScore.components.contextBonus}`);

expect('US job ranks above intl on-site', usScore.matchScore > intlOnSiteScore.matchScore,
  `${usScore.matchScore} vs ${intlOnSiteScore.matchScore}`);
expect('Intl on-site ctxBonus is negative', intlOnSiteScore.components.contextBonus < 0,
  `got ${intlOnSiteScore.components.contextBonus}`);
expect('Intl remote ctxBonus is positive (no penalty)', intlRemoteScore.components.contextBonus > 0,
  `got ${intlRemoteScore.components.contextBonus}`);
expect('Intl remote outranks intl on-site', intlRemoteScore.matchScore > intlOnSiteScore.matchScore,
  `${intlRemoteScore.matchScore} vs ${intlOnSiteScore.matchScore}`);

console.log('\nscoreJob: candidate with no location (no penalty path)');
const noLocCtx = { location: null, workType: null };
const intlNoLocScore = scoreJob(skills, 'senior', intlOnSite, undefined, titles, noLocCtx);
expect('no penalty when candidate has no location', intlNoLocScore.components.contextBonus >= 0,
  `got ${intlNoLocScore.components.contextBonus}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
