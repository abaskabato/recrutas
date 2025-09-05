import assert from "assert";

export async function runAPITests() {
  console.log('Running API tests...');
  const response = await fetch('http://localhost:5000/api/health');
  assert.strictEqual(response.status, 200, 'Health check should return 200');
  console.log('API tests passed!');
}