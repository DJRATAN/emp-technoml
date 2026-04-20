import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User, Phone, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login, signup, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupDept, setSignupDept] = useState('');
  const [signupTitle, setSignupTitle] = useState('');

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      navigate(`/${user.role}`, { replace: true });
    }
  }, [isAuthenticated, user, loading, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await login(loginEmail.trim(), loginPassword);
    setSubmitting(false);
    if (err) {
      setError(err.includes('Invalid') ? 'Invalid email or password' : err);
      return;
    }
    toast.success('Welcome back!');
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await signup({
      email: signupEmail.trim(),
      password: signupPassword,
      fullName: signupName.trim(),
      phone: signupPhone.trim() || undefined,
      department: signupDept.trim() || 'General',
      jobTitle: signupTitle.trim() || 'Employee',
    });
    setSubmitting(false);
    if (err) { setError(err); return; }
    toast.success('Account created! Awaiting admin approval.');
    setSignupEmail(''); setSignupPassword(''); setSignupName('');
    setSignupPhone(''); setSignupDept(''); setSignupTitle('');
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="h-7 w-7" />
          <span className="font-heading font-bold text-2xl">EMS Pro</span>
        </div>
        <div>
          <h1 className="font-heading text-4xl font-bold leading-tight mb-4">
            Run your workforce.<br />Beautifully.
          </h1>
          <p className="text-primary-foreground/85 text-lg">
            Attendance with selfie + 200m geo-fence. Tasks. Leave. Performance.
            Everything your team needs in one place.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-primary-foreground/85">
            <li>✓ Real-time attendance verification</li>
            <li>✓ Role-based admin & employee portals</li>
            <li>✓ Production-grade authentication & data security</li>
          </ul>
        </div>
        <div className="text-xs text-primary-foreground/70">© {new Date().getFullYear()} TechnoML. All rights reserved.</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 rounded-2xl shadow-elegant">
          <div className="mb-6 text-center lg:hidden">
            <div className="inline-flex items-center gap-2 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-heading font-bold text-xl text-primary">EMS Pro</span>
            </div>
          </div>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <h2 className="font-heading text-xl font-semibold">Welcome back</h2>
                <div className="space-y-2">
                  <Label htmlFor="login-email"><Mail className="inline h-3 w-3 mr-1" />Email</Label>
                  <Input id="login-email" type="email" required autoComplete="email"
                    value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-pwd"><Lock className="inline h-3 w-3 mr-1" />Password</Label>
                  <Input id="login-pwd" type="password" required autoComplete="current-password"
                    value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                </div>
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Signing in…' : 'Sign In'}
                </Button>
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Admin: <code className="font-mono">service@technoml.in</code>
                </p>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3">
                <h2 className="font-heading text-xl font-semibold">Create employee account</h2>
                <p className="text-xs text-muted-foreground">Your account will be reviewed by an admin before activation.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="su-name"><User className="inline h-3 w-3 mr-1" />Full name</Label>
                    <Input id="su-name" required value={signupName} onChange={(e) => setSignupName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="su-email"><Mail className="inline h-3 w-3 mr-1" />Email</Label>
                    <Input id="su-email" type="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="su-pwd"><Lock className="inline h-3 w-3 mr-1" />Password (min 6)</Label>
                    <Input id="su-pwd" type="password" required minLength={6} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-phone"><Phone className="inline h-3 w-3 mr-1" />Phone</Label>
                    <Input id="su-phone" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-dept"><Briefcase className="inline h-3 w-3 mr-1" />Department</Label>
                    <Input id="su-dept" value={signupDept} onChange={(e) => setSignupDept(e.target.value)} placeholder="Engineering" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="su-title">Job title</Label>
                    <Input id="su-title" value={signupTitle} onChange={(e) => setSignupTitle(e.target.value)} placeholder="Software Engineer" />
                  </div>
                </div>
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
