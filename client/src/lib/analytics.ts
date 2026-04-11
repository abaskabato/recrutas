import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';

let initialized = false;

export function initAnalytics() {
  if (initialized || !KEY || typeof window === 'undefined') return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: 'identified_only',
  });
  initialized = true;
}

export function identify(userId: string, traits?: Record<string, any>) {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function reset() {
  if (!initialized) return;
  posthog.reset();
}

export function track(event: string, props?: Record<string, any>) {
  if (!initialized) return;
  posthog.capture(event, props);
}
