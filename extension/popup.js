/**
 * Recrutas Auto-Fill — Popup Script
 *
 * Handles the login form and profile display in the extension popup.
 */

const viewLoading = document.getElementById('view-loading');
const viewLogin   = document.getElementById('view-login');
const viewProfile = document.getElementById('view-profile');

function showView(name) {
  viewLoading.classList.add('hidden');
  viewLogin.classList.add('hidden');
  viewProfile.classList.add('hidden');
  if (name === 'loading') viewLoading.classList.remove('hidden');
  else if (name === 'login') viewLogin.classList.remove('hidden');
  else if (name === 'profile') viewProfile.classList.remove('hidden');
}

async function send(message) {
  return chrome.runtime.sendMessage(message);
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  showView('loading');
  const status = await send({ type: 'GET_STATUS' });

  if (status.authenticated) {
    document.getElementById('user-name').textContent = status.userName || 'Candidate';
    document.getElementById('user-email').textContent = status.userEmail || '';
    showView('profile');
  } else {
    // Pre-fill stored URL in advanced field
    const { recruitasUrl } = await chrome.storage.local.get('recruitasUrl');
    if (recruitasUrl) {
      document.getElementById('recrutas-url').value = recruitasUrl;
    }
    showView('login');
  }
}

// ── Login form ────────────────────────────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl  = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errorEl.classList.add('hidden');
  errorEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const response = await send({ type: 'LOGIN', email, password });

  if (response.success) {
    document.getElementById('user-name').textContent = response.userName || email;
    document.getElementById('user-email').textContent = email;
    showView('profile');
  } else {
    errorEl.textContent = response.error || 'Sign-in failed. Check your credentials.';
    errorEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});

// ── Disconnect ────────────────────────────────────────────────────────────────

document.getElementById('disconnect-btn').addEventListener('click', async () => {
  await send({ type: 'LOGOUT' });
  showView('login');
});

// ── Advanced: save custom URL ─────────────────────────────────────────────────

document.getElementById('save-url-btn').addEventListener('click', async () => {
  const url = document.getElementById('recrutas-url').value.trim();
  if (!url) return;
  await send({ type: 'SET_RECRUTAS_URL', url });
  const btn = document.getElementById('save-url-btn');
  btn.textContent = 'Saved ✓';
  setTimeout(() => { btn.textContent = 'Save URL'; }, 1500);
});

// ── Run ───────────────────────────────────────────────────────────────────────

init();
