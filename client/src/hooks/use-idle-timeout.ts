import { useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'click', 'scroll', 'touchstart'] as const;
const ACTIVITY_THROTTLE_MS = 1000;
const STORAGE_KEY = 'recrutas:lastActivity';

interface UseIdleTimeoutOptions {
  timeoutMs: number;
  warnBeforeMs: number;
  enabled: boolean;
  onTimeout: () => void;
}

interface UseIdleTimeoutResult {
  isWarning: boolean;
  msUntilTimeout: number;
  reset: () => void;
}

export function useIdleTimeout({
  timeoutMs,
  warnBeforeMs,
  enabled,
  onTimeout,
}: UseIdleTimeoutOptions): UseIdleTimeoutResult {
  const [isWarning, setIsWarning] = useState(false);
  const [msUntilTimeout, setMsUntilTimeout] = useState(timeoutMs);

  const lastActivityRef = useRef<number>(Date.now());
  const lastBroadcastRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Reset the activity clock. Called on local user input and when another tab
  // broadcasts activity via localStorage.
  const reset = (broadcast = true) => {
    const now = Date.now();
    lastActivityRef.current = now;
    setIsWarning(false);
    setMsUntilTimeout(timeoutMs);
    if (broadcast && now - lastBroadcastRef.current > ACTIVITY_THROTTLE_MS) {
      lastBroadcastRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // localStorage may be unavailable (private mode, quota) — fail silent
      }
    }
  };

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsWarning(false);
      setMsUntilTimeout(timeoutMs);
      return;
    }

    // Throttled local activity handler
    let lastActivity = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity < ACTIVITY_THROTTLE_MS) return;
      lastActivity = now;
      reset(true);
    };

    // Cross-tab sync: another tab wrote a fresh activity timestamp
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const ts = Number(e.newValue);
      if (Number.isFinite(ts) && ts > lastActivityRef.current) {
        lastActivityRef.current = ts;
        setIsWarning(false);
        setMsUntilTimeout(timeoutMs);
      }
    };

    // Returning to a hidden tab counts as activity (the user re-engaged).
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') reset(true);
    };

    for (const evt of ACTIVITY_EVENTS) {
      document.addEventListener(evt, handleActivity, { passive: true });
    }
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);

    // Tick every second to update the warning UI countdown and detect timeout.
    // We don't rely on a single setTimeout because activity in another tab
    // could push the deadline forward arbitrarily.
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = timeoutMs - elapsed;
      setMsUntilTimeout(Math.max(0, remaining));

      if (remaining <= 0) {
        onTimeoutRef.current();
      } else if (remaining <= warnBeforeMs) {
        setIsWarning(true);
      } else {
        setIsWarning(false);
      }
    }, 1000);

    // Initial reset so timer starts now (not from whatever stale value is in
    // localStorage from a previous session).
    reset(true);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        document.removeEventListener(evt, handleActivity);
      }
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, timeoutMs, warnBeforeMs]);

  return { isWarning, msUntilTimeout, reset: () => reset(true) };
}
