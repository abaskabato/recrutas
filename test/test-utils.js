/**
 * Test utilities for creating and managing test users
 * Provides common helper functions for authentication and cleanup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Anon client — used only to obtain user-scoped JWTs for test requests
import { supabase } from '../server/lib/supabase-client.ts';

// Admin client — bypasses RLS for test setup/teardown
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for integration tests'
  );
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Create a new test candidate user and get authentication token
 * @returns {Promise<{token: string, userId: string, email: string}>}
 */
export async function createNewUserAndGetToken() {
  const email = `test-candidate-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  // Use admin API: creates user without email confirmation
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    throw new Error(`Auth user creation failed: ${authError.message}`);
  }

  const userId = authData.user.id;

  // Insert via admin client — bypasses RLS
  const { error: userError } = await adminSupabase
    .from('users')
    .insert([{ id: userId, email, name: email, role: 'candidate' }]);

  if (userError && !userError.message.includes('duplicate')) {
    throw new Error(`User record creation failed: ${userError.message}`);
  }

  const { error: profileError } = await adminSupabase
    .from('candidate_users')
    .insert([{ user_id: userId, skills: [], experience_level: 'entry' }]);

  if (profileError) {
    throw new Error(`Candidate profile creation failed: ${profileError.message}`);
  }

  // Sign in with anon client to get a real user-scoped JWT
  const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (sessionError) {
    throw new Error(`Auth signin failed: ${sessionError.message}`);
  }

  return {
    token: sessionData.session.access_token,
    userId,
    email,
  };
}

/**
 * Create a new test talent owner user and get authentication token
 * @returns {Promise<{token: string, userId: string, email: string}>}
 */
export async function createNewTalentOwnerAndGetToken() {
  const email = `test-recruiter-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    throw new Error(`Auth user creation failed: ${authError.message}`);
  }

  const userId = authData.user.id;

  const { error: userError } = await adminSupabase
    .from('users')
    .insert([{ id: userId, email, name: email, role: 'talent_owner' }]);

  if (userError && !userError.message.includes('duplicate')) {
    throw new Error(`User record creation failed: ${userError.message}`);
  }

  const { error: profileError } = await adminSupabase
    .from('talent_owner_profiles')
    .insert([{ user_id: userId, company_name: `Test Company ${Date.now()}`, hiring_timeline: 'immediate' }]);

  if (profileError) {
    throw new Error(`Talent owner profile creation failed: ${profileError.message}`);
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (sessionError) {
    throw new Error(`Auth signin failed: ${sessionError.message}`);
  }

  return {
    token: sessionData.session.access_token,
    userId,
    email,
  };
}

/**
 * Delete a test user and associated data
 * @param {string} userId - User ID to delete
 * @returns {Promise<void>}
 */
export async function deleteUser(userId) {
  try {
    await adminSupabase.from('candidate_users').delete().eq('user_id', userId);
    await adminSupabase.from('talent_owner_profiles').delete().eq('user_id', userId);
    await adminSupabase.from('users').delete().eq('id', userId);
    await adminSupabase.auth.admin.deleteUser(userId);
  } catch (err) {
    console.error(`Failed to delete user ${userId}:`, err.message);
    // Don't throw — cleanup should not fail tests
  }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function getUser(userId) {
  const { data, error } = await adminSupabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data || null;
}

/**
 * Get candidate profile
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function getCandidateProfile(userId) {
  const { data, error } = await adminSupabase
    .from('candidate_users')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get candidate profile: ${error.message}`);
  }

  return data || null;
}

/**
 * Get activity logs for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
export async function getActivityLogs(userId) {
  const { data, error } = await adminSupabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get activity logs: ${error.message}`);
  }

  return data || [];
}

/**
 * Clear all test data (use carefully!)
 * @returns {Promise<void>}
 */
export async function clearTestData() {
  try {
    // This is dangerous - only use if you have a dedicated test database
    console.warn('⚠️  Clearing test data...');

    const { data: testUsers } = await adminSupabase.auth.admin.listUsers();
    const testUserIds = testUsers
      .filter((u) => u.email.includes('test-'))
      .map((u) => u.id);

    for (const userId of testUserIds) {
      await deleteUser(userId);
    }

    console.log(`Deleted ${testUserIds.length} test users`);
  } catch (err) {
    console.error('Failed to clear test data:', err.message);
  }
}

/**
 * Wait for a condition with timeout
 * @param {Function} condition - Async function returning boolean
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<boolean>}
 */
export async function waitFor(condition, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      if (await condition()) {
        return true;
      }
    } catch (err) {
      // Continue waiting
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}
