import { PostHog } from 'posthog-node';

const KEY = process.env.POSTHOG_KEY;
const HOST = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

let client: PostHog | null = null;

if (KEY) {
  client = new PostHog(KEY, { host: HOST, flushAt: 20, flushInterval: 10000 });
}

export function track(distinctId: string, event: string, properties?: Record<string, any>) {
  if (!client || !distinctId) return;
  try {
    client.capture({ distinctId, event, properties });
  } catch (err) {
    console.warn('[analytics] capture failed:', (err as Error).message);
  }
}

export async function shutdown() {
  if (!client) return;
  try {
    await client.shutdown();
  } catch {
    // best-effort
  }
}
