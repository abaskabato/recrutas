
import { seedDatabase } from '../server/seed.ts';

async function runSeed() {
  console.log('--- Running Database Seed Script ---');
  await seedDatabase();
  console.log('--- Database Seed Script Finished ---');
}

runSeed().catch(err => {
  console.error('--- Database Seed Script Failed ---');
  console.error(err);
  process.exit(1);
});
