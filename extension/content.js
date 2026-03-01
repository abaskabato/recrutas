/**
 * Recrutas Auto-Fill — Content Script
 *
 * Injected into supported career pages. Adds a floating "Fill with Recrutas"
 * button. On click, fetches the candidate's profile from the background worker
 * and fills detectable form fields without auto-submitting.
 */

(function () {
  'use strict';

  // Prevent double-injection on SPAs that re-run content scripts
  if (window.__recruitasInjected) return;
  window.__recruitasInjected = true;

  // ── Field detection patterns ───────────────────────────────────────────────

  const FIELD_PATTERNS = {
    firstName: [
      /first[\s_-]?name/i, /fname/i, /given[\s_-]?name/i, /forename/i,
      /^name$/i, /^first$/i,
    ],
    lastName: [
      /last[\s_-]?name/i, /lname/i, /surname/i, /family[\s_-]?name/i,
      /^last$/i,
    ],
    email: [/e[\s_-]?mail/i],
    phone: [/phone/i, /telephone/i, /mobile/i, /cell/i],
    linkedin: [/linkedin/i],
    github: [/github/i],
    portfolio: [/portfolio/i, /personal[\s_-]?site/i, /website/i],
    location: [/^location$/i, /^city$/i, /^address$/i],
  };

  // ── Native value setter (React/Angular/Vue compatible) ─────────────────────

  function setNativeValue(input, value) {
    const proto = input.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ── Label text resolver ────────────────────────────────────────────────────

  function getLabelText(el) {
    // 1. <label for="id">
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.textContent || '';
    }
    // 2. Nearest ancestor <label>
    let node = el.parentElement;
    while (node && node.tagName !== 'FORM') {
      if (node.tagName === 'LABEL') return node.textContent || '';
      node = node.parentElement;
    }
    return '';
  }

  // ── Field matcher ──────────────────────────────────────────────────────────

  function detectField(el) {
    const attrs = [
      el.getAttribute('name') || '',
      el.getAttribute('id') || '',
      el.getAttribute('autocomplete') || '',
      el.getAttribute('aria-label') || '',
      el.getAttribute('placeholder') || '',
      getLabelText(el),
    ];

    for (const [fieldName, patterns] of Object.entries(FIELD_PATTERNS)) {
      for (const text of attrs) {
        if (!text) continue;
        for (const pattern of patterns) {
          if (pattern.test(text)) return fieldName;
        }
      }
    }

    // Fallback: type attribute
    if (el.type === 'email') return 'email';
    if (el.type === 'tel') return 'phone';

    return null;
  }

  // ── Form filler ────────────────────────────────────────────────────────────

  function fillForm(profile) {
    const fieldMap = {
      firstName: profile.firstName || profile.first_name || '',
      lastName: profile.lastName || profile.last_name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      linkedin: profile.linkedinUrl || profile.linkedin_url || '',
      github: profile.githubUrl || profile.github_url || '',
      portfolio: profile.portfolioUrl || profile.portfolio_url || '',
      location: profile.location || '',
    };

    const inputs = document.querySelectorAll('input, textarea');
    let filled = 0;

    for (const input of inputs) {
      // Skip hidden, submit, button, checkbox, radio inputs
      const type = (input.type || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'checkbox', 'radio', 'file'].includes(type)) continue;
      if (input.readOnly || input.disabled) continue;

      const field = detectField(input);
      if (!field) continue;

      const value = fieldMap[field];
      if (value) {
        setNativeValue(input, value);
        input.style.backgroundColor = '#d1fae5'; // light green flash
        setTimeout(() => { input.style.backgroundColor = ''; }, 2000);
        filled++;
      }
    }

    return filled;
  }

  // ── Banner / toast ─────────────────────────────────────────────────────────

  function showBanner(message, type = 'success') {
    const existing = document.getElementById('recrutas-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'recrutas-banner';
    banner.className = `recrutas-banner recrutas-banner--${type}`;
    banner.textContent = message;
    document.body.appendChild(banner);

    setTimeout(() => banner.remove(), 4000);
  }

  // ── Floating button ────────────────────────────────────────────────────────

  function injectButton() {
    if (document.getElementById('recrutas-fill-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'recrutas-fill-btn';
    btn.className = 'recrutas-fill-btn';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
      Fill with Recrutas
    `;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Fetching profile…';

      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_PROFILE' });

        if (!response.success) {
          showBanner(response.error || 'Sign in to Recrutas first', 'error');
          return;
        }

        const filled = fillForm(response.profile);

        if (filled === 0) {
          showBanner('No matching fields found on this page', 'warning');
        } else {
          showBanner(`Filled ${filled} field${filled !== 1 ? 's' : ''} — review and submit`, 'success');
        }
      } catch (err) {
        showBanner(err.message || 'Extension error — try reloading', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Fill with Recrutas
        `;
      }
    });

    document.body.appendChild(btn);
  }

  // ── SPA-aware injection ────────────────────────────────────────────────────
  // Many career pages are SPAs — re-inject button after navigation events

  function maybeInject() {
    // Only inject if page has at least one visible input (i.e. an application form)
    const hasForm = document.querySelector('input:not([type="hidden"])');
    if (hasForm) {
      injectButton();
    }
  }

  // Initial injection
  maybeInject();

  // Watch for DOM changes (SPA navigation, lazy-loaded forms)
  const observer = new MutationObserver(() => maybeInject());
  observer.observe(document.body, { childList: true, subtree: true });

  // Also catch popstate / hashchange for hash-router SPAs
  window.addEventListener('popstate', () => setTimeout(maybeInject, 500));
  window.addEventListener('hashchange', () => setTimeout(maybeInject, 500));
})();
