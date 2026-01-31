/**
 * Test utilities for creating and managing test users
 * Provides common helper functions for authentication and cleanup
 */

import { supabase } from '../server/db.ts';

/**
 * Create a new test candidate user and get authentication token
 * @returns {Promise<{token: string, userId: string}>}
 */
export async function createNewUserAndGetToken() {
  const email = `test-candidate-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUpWithPassword({
    email,
    password,
  });

  if (authError) {
    throw new Error(`Auth signup failed: ${authError.message}`);
  }

  const userId = authData.user.id;

  // Create candidate profile
  const { error: profileError } = await supabase
    .from('candidateProfiles')
    .insert([
      {
        userId,
        skills: [],
        experience: 'entry',
        resumeParsed: false,
      },
    ]);

  if (profileError) {
    throw new Error(`Candidate profile creation failed: ${profileError.message}`);
  }

  // Create user record
  const { error: userError } = await supabase
    .from('users')
    .insert([
      {
        id: userId,
        email,
        role: 'candidate',
      },
    ]);

  if (userError && !userError.message.includes('duplicate')) {
    throw new Error(`User record creation failed: ${userError.message}`);
  }

  // Get session token
  const { data: sessionData, error: sessionError } =
    await supabase.auth.signInWithPassword({
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
 * @returns {Promise<{token: string, userId: string}>}
 */
export async function createNewTalentOwnerAndGetToken() {
  const email = `test-recruiter-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUpWithPassword({
    email,
    password,
  });

  if (authError) {
    throw new Error(`Auth signup failed: ${authError.message}`);
  }

  const userId = authData.user.id;

  // Create talent owner profile
  const { error: profileError } = await supabase
    .from('talentOwnerProfiles')
    .insert([
      {
        userId,
        companyName: `Test Company ${Date.now()}`,
        hiringTimeline: 'immediate',
      },
    ]);

  if (profileError) {
    throw new Error(`Talent owner profile creation failed: ${profileError.message}`);
  }

  // Create user record with talent_owner role
  const { error: userError } = await supabase
    .from('users')
    .insert([
      {
        id: userId,
        email,
        role: 'talent_owner',
      },
    ]);

  if (userError && !userError.message.includes('duplicate')) {
    throw new Error(`User record creation failed: ${userError.message}`);
  }

  // Get session token
  const { data: sessionData, error: sessionError } =
    await supabase.auth.signInWithPassword({
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
    // Delete candidate profile if exists
    await supabase
      .from('candidateProfiles')
      .delete()
      .eq('userId', userId);

    // Delete talent owner profile if exists
    await supabase
      .from('talentOwnerProfiles')
      .delete()
      .eq('userId', userId);

    // Delete user record
    await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    // Delete from auth
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      await supabase.auth.admin.deleteUser(userId);
    }
  } catch (err) {
    console.error(`Failed to delete user ${userId}:`, err.message);
    // Don't throw - cleanup should not fail tests
  }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function getUser(userId) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('candidateProfiles')
    .select('*')
    .eq('userId', userId)
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
  const { data, error } = await supabase
    .from('activityLogs')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false });

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

    // Delete test records (filter by email pattern)
    const { data: testUsers } = await supabase.auth.admin.listUsers();
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
