/**
 * Recrutas Auto-Fill — Background Service Worker (MV3)
 *
 * Responsibilities:
 * - Store/retrieve auth token from chrome.storage.local
 * - Proxy login requests to Recrutas backend (no CORS issues from SW)
 * - Fetch candidate profile with Bearer token
 * - Respond to messages from content.js and popup.js
 */

const DEFAULT_RECRUTAS_URL = 'https://recrutas.vercel.app';

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getStoredAuth() {
  const data = await chrome.storage.local.get(['accessToken', 'expiresAt', 'recruitasUrl', 'userName']);
  return data;
}

async function isTokenValid() {
  const { accessToken, expiresAt } = await getStoredAuth();
  if (!accessToken) return false;
  // Treat as expired 60s before actual expiry to allow refresh headroom
  return expiresAt && Date.now() < (expiresAt - 60_000);
}

async function getRecruitasUrl() {
  const { recruitasUrl } = await getStoredAuth();
  return recruitasUrl || DEFAULT_RECRUTAS_URL;
}

// ── Login ────────────────────────────────────────────────────────────────────

async function login(email, password) {
  const baseUrl = await getRecruitasUrl();
  const res = await fetch(`${baseUrl}/api/auth/extension-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Login failed (${res.status})`);
  }

  const { accessToken, refreshToken, expiresAt, user } = await res.json();

  await chrome.storage.local.set({
    accessToken,
    refreshToken,
    expiresAt,
    recruitasUrl: baseUrl,
    userName: user?.name || user?.email || email,
    userEmail: user?.email || email,
  });

  return { accessToken, userName: user?.name || user?.email || email };
}

// ── Logout ───────────────────────────────────────────────────────────────────

async function logout() {
  await chrome.storage.local.remove([
    'accessToken', 'refreshToken', 'expiresAt', 'userName', 'userEmail'
  ]);
}

// ── Fetch profile ─────────────────────────────────────────────────────────────

async function fetchProfile() {
  const { accessToken } = await getStoredAuth();
  if (!accessToken) throw new Error('Not authenticated');

  const baseUrl = await getRecruitasUrl();
  const res = await fetch(`${baseUrl}/api/candidate/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    // Token expired — clear storage so popup shows login form
    await logout();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch profile (${res.status})`);
  }

  return res.json();
}

// ── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handle = async () => {
    switch (message.type) {
      case 'LOGIN': {
        const { email, password } = message;
        const result = await login(email, password);
        return { success: true, ...result };
      }

      case 'LOGOUT': {
        await logout();
        return { success: true };
      }

      case 'GET_STATUS': {
        const { accessToken, userName, userEmail } = await getStoredAuth();
        const valid = await isTokenValid();
        return {
          authenticated: !!(accessToken && valid),
          userName: userName || null,
          userEmail: userEmail || null,
        };
      }

      case 'GET_PROFILE': {
        const profile = await fetchProfile();
        return { success: true, profile };
      }

      case 'SET_RECRUTAS_URL': {
        await chrome.storage.local.set({ recruitasUrl: message.url });
        return { success: true };
      }

      default:
        return { success: false, error: 'Unknown message type' };
    }
  };

  // Keep channel open for async response
  handle()
    .then(sendResponse)
    .catch((err) => sendResponse({ success: false, error: err.message }));

  return true; // keep the message channel open
});
