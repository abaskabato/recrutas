import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function addJobExpiryMigration() {
    console.log('🔄 Running job expiry migration...');

    try {
        // Add expires_at column if it doesn't exist
        await db.execute(sql`
      ALTER TABLE job_postings 
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP
    `);
        console.log('✅ Added expires_at column');

        // Set default expiry for existing active jobs (30 days from now)
        const result = await db.execute(sql`
      UPDATE job_postings 
      SET expires_at = NOW() + INTERVAL '30 days'
      WHERE expires_at IS NULL AND status = 'active'
    `);
        console.log(`✅ Set default expiry for existing jobs`);

        // Add index for better query performance
        await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_job_postings_expires_at 
      ON job_postings(expires_at)
      WHERE expires_at IS NOT NULL
    `);
        console.log('✅ Created index on expires_at');

        console.log('✨ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration
addJobExpiryMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
