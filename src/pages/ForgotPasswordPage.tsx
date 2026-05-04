import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) return setError(err.message);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-elegant">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-heading font-bold text-xl text-primary">TechnoML</span>
          </div>
          <h1 className="font-heading text-xl font-semibold">Forgot Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-sm">We've sent a password reset link to <strong>{email}</strong>. Check your inbox and click the link to set a new password.</p>
            <p className="text-xs text-muted-foreground">The link expires in 10 minutes.</p>
            <Link to="/login">
              <Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email"><Mail className="inline h-3 w-3 mr-1" />Registered Email</Label>
              <Input id="reset-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
            </Button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="inline h-3 w-3 mr-1" />Back to Login</Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
