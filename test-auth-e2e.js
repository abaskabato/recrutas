import assert from "assert";

export async function runAllTests() {
  console.log('Running E2E tests...');
  const response = await fetch('http://localhost:5000');
  assert.strictEqual(response.status, 200, 'Home page should return 200');
  console.log('E2E tests passed!');
}