/**
 * Minimal browser API polyfill for cross-browser extension compatibility.
 *
 * Firefox uses `browser.*` (Promise-based).
 * Chrome uses `chrome.*` (callback-based, but supports Promises in MV3).
 *
 * This polyfill ensures `chrome.*` calls work in Firefox by aliasing
 * `browser` → `chrome` when running in Firefox, and vice versa.
 */

(function () {
  'use strict';

  if (typeof globalThis.browser !== 'undefined' && typeof globalThis.chrome === 'undefined') {
    // Firefox: browser.* exists, chrome.* doesn't — alias it
    globalThis.chrome = globalThis.browser;
  } else if (typeof globalThis.chrome !== 'undefined' && typeof globalThis.browser === 'undefined') {
    // Chrome: chrome.* exists, browser.* doesn't — alias it
    globalThis.browser = globalThis.chrome;
  }
})();
