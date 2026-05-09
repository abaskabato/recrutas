import { useAuth } from '@/hooks/use-auth';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { signOut } from '@/lib/auth-client';
import { IdleWarningModal } from '@/components/idle-warning-modal';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_WARN_BEFORE_MS = 60 * 1000;

export function IdleWatcher() {
  const { isAuthenticated } = useAuth();

  const { isWarning, msUntilTimeout, reset } = useIdleTimeout({
    timeoutMs: IDLE_TIMEOUT_MS,
    warnBeforeMs: IDLE_WARN_BEFORE_MS,
    enabled: isAuthenticated,
    onTimeout: () => { void signOut(); },
  });

  return (
    <IdleWarningModal
      open={isAuthenticated && isWarning}
      msUntilTimeout={msUntilTimeout}
      onStay={reset}
      onSignOut={() => { void signOut(); }}
    />
  );
}
