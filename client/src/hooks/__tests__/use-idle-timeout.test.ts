import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeout } from '../use-idle-timeout';

const TIMEOUT_MS = 30_000;
const WARN_MS = 5_000;

function fireDocumentEvent(name: string) {
  document.dispatchEvent(new Event(name));
}

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onTimeout after timeoutMs of no activity', () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useIdleTimeout({ timeoutMs: TIMEOUT_MS, warnBeforeMs: WARN_MS, enabled: true, onTimeout }),
    );

    expect(onTimeout).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(TIMEOUT_MS + 100); });
    expect(onTimeout).toHaveBeenCalled();
  });

  it('resets the timer when a user activity event fires', () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useIdleTimeout({ timeoutMs: TIMEOUT_MS, warnBeforeMs: WARN_MS, enabled: true, onTimeout }),
    );

    // Advance to just before timeout, then fire activity
    act(() => { vi.advanceTimersByTime(TIMEOUT_MS - 1000); });
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => { fireDocumentEvent('keydown'); });
    // After activity, advance another full timeout - 2s; should not have fired yet
    act(() => { vi.advanceTimersByTime(TIMEOUT_MS - 2000); });
    expect(onTimeout).not.toHaveBeenCalled();

    // Advance past the new deadline
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onTimeout).toHaveBeenCalled();
  });

  it('flips isWarning to true once remaining time drops below warnBeforeMs', () => {
    const { result } = renderHook(() =>
      useIdleTimeout({ timeoutMs: TIMEOUT_MS, warnBeforeMs: WARN_MS, enabled: true, onTimeout: () => {} }),
    );

    expect(result.current.isWarning).toBe(false);

    act(() => { vi.advanceTimersByTime(TIMEOUT_MS - WARN_MS - 100); });
    expect(result.current.isWarning).toBe(false);

    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.isWarning).toBe(true);
  });

  it('treats a storage event from another tab with a newer timestamp as activity', () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useIdleTimeout({ timeoutMs: TIMEOUT_MS, warnBeforeMs: WARN_MS, enabled: true, onTimeout }),
    );

    // Get close to timeout
    act(() => { vi.advanceTimersByTime(TIMEOUT_MS - 1000); });

    // Another tab broadcasts activity ("now" relative to fake clock)
    const newer = Date.now();
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'recrutas:lastActivity', newValue: String(newer) }),
      );
    });

    // Advance just past what *would have been* the original deadline
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('throttles rapid activity events so localStorage is not spammed', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderHook(() =>
      useIdleTimeout({ timeoutMs: TIMEOUT_MS, warnBeforeMs: WARN_MS, enabled: true, onTimeout: () => {} }),
    );

    setItemSpy.mockClear();

    // Fire 50 events within a tight window
    act(() => {
      for (let i = 0; i < 50; i++) fireDocumentEvent('mousedown');
    });

    // Throttle is 1000ms — at most one write should land
    expect(setItemSpy).toHaveBeenCalledTimes(0);
    setItemSpy.mockRestore();
  });

  it('does not start a timer when enabled is false', () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useIdleTimeout({ timeoutMs: TIMEOUT_MS, warnBeforeMs: WARN_MS, enabled: false, onTimeout }),
    );

    act(() => { vi.advanceTimersByTime(TIMEOUT_MS * 3); });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('cleans up listeners on unmount so no further events trigger callbacks', () => {
    const onTimeout = vi.fn();
    const { unmount } = renderHook(() =>
      useIdleTimeout({ timeoutMs: TIMEOUT_MS, warnBeforeMs: WARN_MS, enabled: true, onTimeout }),
    );

    unmount();
    act(() => { vi.advanceTimersByTime(TIMEOUT_MS * 2); });
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
