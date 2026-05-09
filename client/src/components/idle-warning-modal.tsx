import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface IdleWarningModalProps {
  open: boolean;
  msUntilTimeout: number;
  onStay: () => void;
  onSignOut: () => void;
}

export function IdleWarningModal({ open, msUntilTimeout, onStay, onSignOut }: IdleWarningModalProps) {
  const seconds = Math.max(0, Math.ceil(msUntilTimeout / 1000));

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You've been inactive</AlertDialogTitle>
          <AlertDialogDescription>
            You'll be signed out in {seconds} second{seconds === 1 ? '' : 's'}.
            Click "Stay signed in" to keep your session active.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onSignOut}>Sign out now</AlertDialogCancel>
          <AlertDialogAction onClick={onStay} autoFocus>Stay signed in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
