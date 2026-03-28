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

// ── Fill this page ───────────────────────────────────────────────────────────

document.getElementById('fill-btn').addEventListener('click', async () => {
  const btn = document.getElementById('fill-btn');
  btn.disabled = true;
  btn.textContent = 'Injecting…';

  try {
    await send({ type: 'INJECT_AND_FILL' });
    btn.textContent = 'Filling…';
    // Close popup after a short delay — the content script handles the rest
    setTimeout(() => window.close(), 800);
  } catch (err) {
    btn.textContent = 'Failed — try again';
    btn.disabled = false;
    setTimeout(() => {
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        Fill this page
      `;
    }, 2000);
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
