import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 8) return toast.error('New password must be at least 8 characters');
    if (newPwd !== confirm) return toast.error('Passwords do not match');

    setLoading(true);
    // Verify current password by re-signing in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setLoading(false); return toast.error('Unable to verify identity'); }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email, password: current,
    });
    if (signInErr) { setLoading(false); return toast.error('Current password is incorrect'); }

    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setLoading(false);
    if (error) return toast.error(error.message);

    toast.success('Password changed successfully');
    setCurrent(''); setNewPwd(''); setConfirm('');
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="h-4 w-4 mr-2" /> Change Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Change Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cur-pwd">Current Password</Label>
            <Input id="cur-pwd" type="password" required value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pwd">New Password (min 8 chars)</Label>
            <Input id="new-pwd" type="password" required minLength={8} value={newPwd} onChange={e => setNewPwd(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pwd">Confirm New Password</Label>
            <Input id="confirm-pwd" type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
