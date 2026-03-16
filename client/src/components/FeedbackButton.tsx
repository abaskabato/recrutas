import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useSession } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export function FeedbackButton() {
  const session = useSession();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('Bug');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          userEmail: session?.user?.email,
          userName: session?.user?.user_metadata?.full_name,
        }),
      });
      toast({ title: 'Feedback sent', description: "Thanks — we'll look into it." });
      setOpen(false);
      setMessage('');
      setType('Bug');
    } catch {
      toast({ title: 'Failed to send', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 sm:bottom-5 z-50 flex items-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium shadow-lg hover:opacity-80 transition-opacity"
      >
        <MessageSquare className="h-4 w-4" />
        Feedback
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bug">Bug</SelectItem>
                <SelectItem value="Suggestion">Suggestion</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Describe the issue or idea..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
            <Button onClick={handleSubmit} disabled={submitting || !message.trim()}>
              {submitting ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
