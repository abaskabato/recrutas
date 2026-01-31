/**
 * Async test helpers for polling and waiting operations
 */

/**
 * Wait for a condition to be true, with configurable timeout
 * @param {Function} condition - Async function returning boolean
 * @param {number} timeout - Max milliseconds to wait (default 10000)
 * @param {number} pollInterval - Check interval in ms (default 500)
 * @returns {Promise<boolean>} - Resolves true if condition met
 * @throws {Error} - Throws if timeout exceeded
 */
async function waitForCondition(
  condition,
  timeout = 10000,
  pollInterval = 500
) {
  const startTime = Date.now();
  let lastError;

  while (Date.now() - startTime < timeout) {
    try {
      if (await condition()) {
        return true;
      }
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  const elapsed = Date.now() - startTime;
  const errorMsg = lastError ? `: ${lastError.message}` : '';
  throw new Error(
    `Condition not met within ${elapsed}ms timeout${errorMsg}`
  );
}

/**
 * Wait for a specific value to appear in activity logs
 * @param {Function} getActivityLogs - Function that returns activity logs
 * @param {string} eventName - Event name to look for
 * @param {number} timeout - Max milliseconds to wait
 * @returns {Promise<Object>} - Returns the matching activity log entry
 */
async function waitForActivityLogEvent(getActivityLogs, eventName, timeout = 30000) {
  let lastLogs = [];

  const found = await waitForCondition(
    async () => {
      const logs = await getActivityLogs();
      lastLogs = logs;
      return logs.some((log) => log.action === eventName);
    },
    timeout,
    500
  );

  if (!found) {
    throw new Error(
      `Activity log event "${eventName}" not found within timeout. Last logs: ${JSON.stringify(lastLogs)}`
    );
  }

  return lastLogs.find((log) => log.action === eventName);
}

/**
 * Wait for profile to have specific properties
 * @param {Function} getProfile - Function that returns candidate profile
 * @param {Object} expectedProperties - Properties to match
 * @param {number} timeout - Max milliseconds to wait
 * @returns {Promise<Object>} - Returns the updated profile
 */
async function waitForProfileUpdate(
  getProfile,
  expectedProperties,
  timeout = 30000
) {
  let lastProfile;

  const found = await waitForCondition(
    async () => {
      const profile = await getProfile();
      lastProfile = profile;

      return Object.entries(expectedProperties).every(([key, value]) => {
        const actual = profile[key];
        if (Array.isArray(value)) {
          return (
            Array.isArray(actual) &&
            actual.length === value.length &&
            value.every((v) => actual.includes(v))
          );
        }
        return actual === value;
      });
    },
    timeout,
    500
  );

  if (!found) {
    throw new Error(
      `Profile did not update as expected within timeout. Last profile: ${JSON.stringify(lastProfile)}, Expected: ${JSON.stringify(expectedProperties)}`
    );
  }

  return lastProfile;
}

/**
 * Retry an operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {number} maxRetries - Max number of retries (default 3)
 * @param {number} initialDelayMs - Initial delay between retries (default 500)
 * @returns {Promise<any>} - Result of successful operation
 */
async function retryWithBackoff(
  operation,
  maxRetries = 3,
  initialDelayMs = 500
) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const delay = initialDelayMs * Math.pow(2, i);
      if (i < maxRetries - 1) {
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw new Error(
    `Operation failed after ${maxRetries} retries: ${lastError.message}`
  );
}

/**
 * Create a promise that resolves after a delay
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export {
  waitForCondition,
  waitForActivityLogEvent,
  waitForProfileUpdate,
  retryWithBackoff,
  delay,
};
