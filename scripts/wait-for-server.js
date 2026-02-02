import fetch from 'node-fetch';

async function waitForServer(port, timeout = 120000, interval = 2000) {
  const url = `http://localhost:${port}/api/health`;
  const startTime = Date.now();

  process.stderr.write(`Waiting for server to be ready at ${url}...\n`);

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, { timeout: interval / 2 });
      if (response.ok) {
        process.stderr.write('Server is ready!\n');
        return true;
      }
    } catch (error) {
      // Ignore connection errors, server might not be up yet
      process.stderr.write('.');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Server at ${url} did not become ready within ${timeout / 1000} seconds.`);
}

const port = process.argv[2] || 5000; // Default to 5000
waitForServer(port).catch(error => {
  console.error(error.message);
  process.exit(1);
});
