/**
 * Recrutas Auto-Fill — Background Service Worker (MV3)
 *
 * Responsibilities:
 * - Store/retrieve auth token from chrome.storage.local
 * - Proxy login requests to Recrutas backend (no CORS issues from SW)
 * - Automatic token refresh before expiry
 * - Fetch candidate profile with Bearer token
 * - Proxy AI form-fill requests to backend
 * - Download resume files for form attachment
 * - Track fill stats
 * - Inject content script on demand (any site)
 * - Handle keyboard shortcut (Alt+Shift+R)
 */

const DEFAULT_RECRUTAS_URL = 'https://recrutas.vercel.app';

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getStoredAuth() {
  const data = await chrome.storage.local.get([
    'accessToken', 'refreshToken', 'expiresAt', 'recruitasUrl', 'userName', 'userEmail'
  ]);
  return data;
}

async function isTokenValid() {
  const { accessToken, expiresAt } = await getStoredAuth();
  if (!accessToken) return false;
  return expiresAt && Date.now() < (expiresAt - 60_000);
}

async function getRecruitasUrl() {
  const { recruitasUrl } = await getStoredAuth();
  return recruitasUrl || DEFAULT_RECRUTAS_URL;
}

// ── Token refresh ───────────────────────────────────────────────────────────

async function refreshAccessToken() {
  const { refreshToken } = await getStoredAuth();
  if (!refreshToken) throw new Error('No refresh token');

  const supabaseUrl = await getSupabaseUrl();
  if (!supabaseUrl) throw new Error('Cannot refresh — no Supabase URL');

  const baseUrl = await getRecruitasUrl();
  const res = await fetch(`${baseUrl}/api/auth/extension-refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await logout();
    throw new Error('Session expired. Please sign in again.');
  }

  const { accessToken, refreshToken: newRefresh, expiresAt, user } = await res.json();

  await chrome.storage.local.set({
    accessToken,
    refreshToken: newRefresh || refreshToken,
    expiresAt,
    userName: user?.name || (await getStoredAuth()).userName,
    userEmail: user?.email || (await getStoredAuth()).userEmail,
  });

  return accessToken;
}

async function getSupabaseUrl() {
  // We don't need this separately — refresh goes through our backend
  return true;
}

async function getValidToken() {
  const valid = await isTokenValid();
  if (valid) {
    const { accessToken } = await getStoredAuth();
    return accessToken;
  }

  // Try refresh
  const { refreshToken } = await getStoredAuth();
  if (refreshToken) {
    try {
      return await refreshAccessToken();
    } catch {
      // Refresh failed — fall through
    }
  }

  throw new Error('Not authenticated');
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
    'accessToken', 'refreshToken', 'expiresAt', 'userName', 'userEmail',
    'profileCache', 'profileCacheTime',
  ]);
}

// ── Fetch profile (with cache) ───────────────────────────────────────────────

async function fetchProfile(forceRefresh = false) {
  // Check cache (5 min TTL)
  if (!forceRefresh) {
    const { profileCache, profileCacheTime } = await chrome.storage.local.get(['profileCache', 'profileCacheTime']);
    if (profileCache && profileCacheTime && Date.now() - profileCacheTime < 300_000) {
      return profileCache;
    }
  }

  const accessToken = await getValidToken();

  const baseUrl = await getRecruitasUrl();
  const res = await fetch(`${baseUrl}/api/candidate/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    await logout();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch profile (${res.status})`);
  }

  const profile = await res.json();

  // Cache it
  await chrome.storage.local.set({ profileCache: profile, profileCacheTime: Date.now() });

  return profile;
}

// ── AI form fill ─────────────────────────────────────────────────────────────

async function captureScreenshot() {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 });
    return dataUrl.replace(/^data:image\/\w+;base64,/, '');
  } catch (err) {
    console.warn('[Recrutas] Screenshot capture failed:', err.message);
    return null;
  }
}

async function fillFormAI(fields, jobContext) {
  const accessToken = await getValidToken();

  const screenshot = await captureScreenshot();

  const baseUrl = await getRecruitasUrl();
  const res = await fetch(`${baseUrl}/api/extension/fill-form`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fields, jobContext, screenshot }),
  });

  if (res.status === 401) {
    await logout();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Form fill failed (${res.status})`);
  }

  return res.json();
}

// ── Download resume ──────────────────────────────────────────────────────────

async function downloadResume(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Resume download failed (${res.status})`);

  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  const urlPath = new URL(url).pathname;
  const filename = urlPath.split('/').pop() || 'resume.pdf';
  const mimeType = blob.type || 'application/pdf';

  return { base64, filename, mimeType };
}

// ── Fill stats ──────────────────────────────────────────────────────────────

async function incrementFillStats(fieldsFilled) {
  const { fillStats } = await chrome.storage.local.get('fillStats');
  const stats = fillStats || { totalFills: 0, totalFields: 0, lastFillDate: null };
  stats.totalFills += 1;
  stats.totalFields += fieldsFilled;
  stats.lastFillDate = new Date().toISOString();
  await chrome.storage.local.set({ fillStats: stats });
  return stats;
}

// ── Inject content script into active tab ────────────────────────────────────

async function injectAndFill(tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ['content.css'],
  });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js'],
  });
}

// ── Keyboard shortcut handler ───────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'fill-page') {
    const valid = await isTokenValid();
    if (!valid) {
      // Can't fill without auth — badge the icon
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      await injectAndFill(tab.id);
    } catch (err) {
      console.error('[Recrutas] Shortcut fill failed:', err.message);
    }
  }
});

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
        const { fillStats } = await chrome.storage.local.get('fillStats');
        return {
          authenticated: !!(accessToken && valid),
          userName: userName || null,
          userEmail: userEmail || null,
          fillStats: fillStats || { totalFills: 0, totalFields: 0 },
        };
      }

      case 'GET_PROFILE': {
        const profile = await fetchProfile(message.forceRefresh);
        return { success: true, profile };
      }

      case 'FILL_FORM_AI': {
        const result = await fillFormAI(message.fields, message.jobContext);
        return { success: true, ...result };
      }

      case 'FILL_COMPLETE': {
        const stats = await incrementFillStats(message.fieldsFilled || 0);
        return { success: true, stats };
      }

      case 'DOWNLOAD_RESUME': {
        const file = await downloadResume(message.url);
        return { success: true, ...file };
      }

      case 'INJECT_AND_FILL': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) throw new Error('No active tab');
        await injectAndFill(tab.id);
        return { success: true };
      }

      case 'SET_RECRUTAS_URL': {
        await chrome.storage.local.set({ recruitasUrl: message.url });
        return { success: true };
      }

      default:
        return { success: false, error: 'Unknown message type' };
    }
  };

  handle()
    .then(sendResponse)
    .catch((err) => sendResponse({ success: false, error: err.message }));

  return true; // keep the message channel open
});
