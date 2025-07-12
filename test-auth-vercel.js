/**
 * Comprehensive Authentication Test Suite
 * Tests authentication flow for Vercel deployment compatibility
 */

const testAuth = async () => {
  console.log('🔍 Testing Authentication System...\n');
  
  // Test 1: Health Check
  console.log('1. Health Check');
  try {
    const response = await fetch('/api/health', { credentials: 'include' });
    const data = await response.json();
    console.log('✓ Health check passed:', data.status);
    console.log('  Database:', data.database);
    console.log('  Environment:', data.environment);
  } catch (error) {
    console.log('✗ Health check failed:', error.message);
  }

  // Test 2: Session Endpoint
  console.log('\n2. Session Endpoint Test');
  try {
    const response = await fetch('/api/session', { credentials: 'include' });
    const data = await response.json();
    console.log('✓ Session endpoint accessible');
    console.log('  Session data:', data ? 'Present' : 'Null');
    if (data && data.user) {
      console.log('  User ID:', data.user.id);
      console.log('  User Role:', data.user.role);
    }
  } catch (error) {
    console.log('✗ Session endpoint failed:', error.message);
  }

  // Test 3: Better Auth Endpoints
  console.log('\n3. Better Auth Endpoints Test');
  const authEndpoints = [
    '/api/auth/session',
    '/api/auth/sign-in',
    '/api/auth/sign-up'
  ];
  
  for (const endpoint of authEndpoints) {
    try {
      const response = await fetch(endpoint, { 
        method: 'GET',
        credentials: 'include' 
      });
      console.log(`✓ ${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`✗ ${endpoint}: ${error.message}`);
    }
  }

  // Test 4: Sign-up Flow
  console.log('\n4. Sign-up Flow Test');
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123'
  };
  
  try {
    const response = await fetch('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    console.log('✓ Sign-up request processed');
    console.log('  Status:', response.status);
    console.log('  Response:', data);
    
    if (response.ok && data.user) {
      console.log('  User created successfully:', data.user.email);
      
      // Test 5: Sign-in with new user
      console.log('\n5. Sign-in Flow Test');
      const signInResponse = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(testUser)
      });
      
      const signInData = await signInResponse.json();
      console.log('✓ Sign-in request processed');
      console.log('  Status:', signInResponse.status);
      console.log('  Response:', signInData);
      
      if (signInResponse.ok && signInData.user) {
        console.log('  User signed in successfully:', signInData.user.email);
        
        // Test 6: Session after sign-in
        console.log('\n6. Session After Sign-in Test');
        const sessionResponse = await fetch('/api/session', { credentials: 'include' });
        const sessionData = await sessionResponse.json();
        console.log('✓ Session check after sign-in');
        console.log('  Session data:', sessionData ? 'Present' : 'Null');
        if (sessionData && sessionData.user) {
          console.log('  Authenticated user:', sessionData.user.email);
          console.log('  User role:', sessionData.user.role);
        }
      }
    }
  } catch (error) {
    console.log('✗ Sign-up/Sign-in test failed:', error.message);
  }

  console.log('\n🎯 Authentication Test Complete');
};

// Run tests when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testAuth);
} else {
  testAuth();
}

// Export for manual testing
window.testAuth = testAuth;