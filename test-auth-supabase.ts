
// Test authentication with correct Supabase connection
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "./shared/schema";

// Force correct Supabase connection
const client = postgres("postgresql://postgres.hszttqfamgesltcxpzvc:V7Krk30nlS7QjC9J@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true", {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

const db = drizzle(client, { schema });

async function testAuth() {
  try {
    // Test database connection
    const result = await client`SELECT 1 as test`;
    console.log('✅ Database connection successful:', result);
    
    // Test table existence
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'accounts', 'sessions', 'verifications')
    `;
    console.log('✅ Better Auth tables exist:', tables.map(t => t.table_name));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testAuth();
