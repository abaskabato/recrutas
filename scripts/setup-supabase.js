#!/usr/bin/env node

/**
 * Supabase Database Setup Script
 * This script helps set up the database schema in Supabase
 */

import { Pool } from '@neondatabase/serverless';

async function setupSupabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  console.log('Setting up Supabase database...');
  
  try {
    // Test basic connection
    const pool = new Pool({ 
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    
    const result = await pool.query('SELECT version()');
    console.log('✅ Database connected successfully');
    console.log('📋 Database version:', result.rows[0].version);
    
    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📊 Existing tables:', tables.rows.map(row => row.table_name));
    
    await pool.end();
    
    console.log('✅ Supabase setup complete');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('🔍 Connection details:');
    console.error('- URL provided:', !!databaseUrl);
    console.error('- Error code:', error.code);
    
    if (error.message.includes('ENOTFOUND')) {
      console.error('');
      console.error('💡 This looks like a DNS resolution issue.');
      console.error('   Please check your Supabase database URL format.');
      console.error('   It should look like:');
      console.error('   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres');
    }
    
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSupabase().catch(console.error);
}