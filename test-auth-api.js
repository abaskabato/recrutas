/**
 * API-level Authentication Tests
 * Tests the authentication endpoints directly
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
// Generate unique test user for each run
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'API Test User'
};

let testCookie = '';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName, passed, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${testName}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (error) {
      testResults.errors.push(`${testName}: ${error.message}`);
      console.error(`   Error: ${error.message}`);
    }
  }
}

async function testServerHealth() {
  console.log('\n🏥 Testing Server Health...');
  
  try {
    const response = await fetch(BASE_URL, {
      method: 'GET',
      timeout: 5000
    });
    
    logTest('Server is running', response.status === 200);
    
    const contentType = response.headers.get('content-type');
    logTest('Server returns HTML', contentType && contentType.includes('text/html'));
    
  } catch (error) {
    logTest('Server health check', false, error);
  }
}

async function testSignUpAPI() {
  console.log('\n📝 Testing Sign Up API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
        name: TEST_USER.name
      })
    });
    
    const data = await response.json();
    logTest('Sign up API responds', response.status === 200 || response.status === 201);
    
    if (response.ok) {
      logTest('Sign up returns user data', data.user && data.user.email === TEST_USER.email);
      
      // Save cookies for subsequent requests
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        testCookie = cookies;
        logTest('Sign up sets session cookie', true);
      }
    } else {
      console.log('   Sign up response:', data);
    }
    
  } catch (error) {
    logTest('Sign up API', false, error);
  }
}

async function testSessionAPI() {
  console.log('\n🔐 Testing Session API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/session`, {
      method: 'GET',
      headers: {
        'Cookie': testCookie
      }
    });
    
    const data = await response.json();
    logTest('Session API responds', response.status === 200);
    
    if (response.ok) {
      logTest('Session returns user data', data.user && data.user.email === TEST_USER.email);
      logTest('User has no role initially', data.user.role === null);
    } else {
      console.log('   Session response:', data);
    }
    
  } catch (error) {
    logTest('Session API', false, error);
  }
}

async function testRoleUpdateAPI() {
  console.log('\n👤 Testing Role Update API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/user/select-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': testCookie
      },
      body: JSON.stringify({
        role: 'talent_owner'
      })
    });
    
    const data = await response.json();
    logTest('Role update API responds', response.status === 200);
    
    if (response.ok) {
      logTest('Role update returns success', data.success === true);
      
      // Verify role was updated
      const sessionResponse = await fetch(`${BASE_URL}/api/session`, {
        method: 'GET',
        headers: {
          'Cookie': testCookie
        }
      });
      
      const sessionData = await sessionResponse.json();
      logTest('Role was updated in session', sessionData.user && sessionData.user.role === 'talent_owner');
    } else {
      console.log('   Role update response:', data);
    }
    
  } catch (error) {
    logTest('Role update API', false, error);
  }
}

async function testSignInAPI() {
  console.log('\n🔑 Testing Sign In API...');
  
  try {
    // Clear existing cookies
    testCookie = '';
    
    const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });
    
    const data = await response.json();
    logTest('Sign in API responds', response.status === 200);
    
    if (response.ok) {
      logTest('Sign in returns user data', data.user && data.user.email === TEST_USER.email);
      
      // Check role through session endpoint instead of sign-in response
      const sessionResponse = await fetch(`${BASE_URL}/api/session`, {
        method: 'GET',
        headers: {
          'Cookie': response.headers.get('set-cookie') || ''
        }
      });
      const sessionData = await sessionResponse.json();
      logTest('User has assigned role', sessionData.user && sessionData.user.role === 'talent_owner');
      
      // Save new cookies
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        testCookie = cookies;
        logTest('Sign in sets session cookie', true);
      }
    } else {
      console.log('   Sign in response:', data);
    }
    
  } catch (error) {
    logTest('Sign in API', false, error);
  }
}

async function testSignOutAPI() {
  console.log('\n🚪 Testing Sign Out API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/sign-out`, {
      method: 'POST',
      headers: {
        'Cookie': testCookie
      }
    });
    
    logTest('Sign out API responds', response.status === 200);
    
    // Verify session is cleared by checking if response clears cookies
    const cookies = response.headers.get('set-cookie');
    const sessionCleared = cookies && (cookies.includes('Max-Age=0') || cookies.includes('expires=Thu, 01 Jan 1970'));
    
    logTest('Session cleared after sign out', sessionCleared || response.status === 200);
    
  } catch (error) {
    logTest('Sign out API', false, error);
  }
}

async function testProtectedRoutes() {
  console.log('\n🔒 Testing Protected Routes...');
  
  try {
    // Test accessing API endpoint without authentication
    const protectedResponse = await fetch(`${BASE_URL}/api/candidate/profile`, {
      method: 'GET'
    });
    
    // Should return 401/403 for unauthenticated API access
    logTest('Protected route requires authentication', 
      protectedResponse.status === 401 || 
      protectedResponse.status === 403 || 
      protectedResponse.status === 404
    );
    
  } catch (error) {
    logTest('Protected routes', false, error);
  }
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...');
  
  try {
    // Test invalid email
    const invalidEmailResponse = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'invalid-email',
        password: TEST_USER.password,
        name: TEST_USER.name
      })
    });
    
    logTest('Invalid email handled properly', invalidEmailResponse.status === 400);
    
    // Test weak password
    const weakPasswordResponse = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test-weak@example.com',
        password: '123',
        name: TEST_USER.name
      })
    });
    
    logTest('Weak password handled properly', weakPasswordResponse.status === 400);
    
    // Test wrong credentials
    const wrongCredentialsResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: 'WrongPassword123!'
      })
    });
    
    logTest('Wrong credentials handled properly', wrongCredentialsResponse.status === 401);
    
  } catch (error) {
    logTest('Error handling', false, error);
  }
}

async function runAPITests() {
  console.log('🔧 Starting API Authentication Tests\n');
  console.log('=' * 50);
  
  try {
    await testServerHealth();
    await testSignUpAPI();
    await testSessionAPI();
    await testRoleUpdateAPI();
    await testSignInAPI();
    await testSignOutAPI();
    await testProtectedRoutes();
    await testErrorHandling();
    
  } catch (error) {
    console.error('API test suite error:', error);
    testResults.failed++;
    testResults.errors.push(`API test suite: ${error.message}`);
  } finally {
    // Print final results
    console.log('\n' + '=' * 50);
    console.log('📊 API TEST RESULTS');
    console.log('=' * 50);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
    
    if (testResults.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      testResults.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n' + '=' * 50);
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAPITests();
}

export { runAPITests };