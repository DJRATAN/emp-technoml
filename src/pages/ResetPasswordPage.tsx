import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Lock, Loader2, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for recovery event in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setReady(true);
    } else {
      // Listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') setReady(true);
      });
      // Also check if already in recovery session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 8) return setError('Password must be at least 8 characters');
    if (newPwd !== confirm) return setError('Passwords do not match');

    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.updateUser({ password: newPwd });
    setLoading(false);
    if (err) return setError(err.message);

    // Clear force_password_change flag
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ force_password_change: false } as any).eq('id', user.id);
    }

    setSuccess(true);
    setTimeout(() => navigate('/login', { replace: true }), 3000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-elegant">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-heading font-bold text-xl text-primary">TechnoML</span>
          </div>
          <h1 className="font-heading text-xl font-semibold">Set New Password</h1>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-sm font-medium">Password updated successfully!</p>
            <p className="text-xs text-muted-foreground">Redirecting to login…</p>
          </div>
        ) : !ready ? (
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pwd"><Lock className="inline h-3 w-3 mr-1" />New Password (min 8 chars)</Label>
              <Input id="new-pwd" type="password" required minLength={8} value={newPwd} onChange={e => setNewPwd(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pwd"><Lock className="inline h-3 w-3 mr-1" />Confirm New Password</Label>
              <Input id="confirm-pwd" type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set New Password'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
