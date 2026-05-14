import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, ArrowRight, ArrowLeft, Loader2, User as UserIcon, Phone, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Step = 'company' | 'auth' | 'reset';
type Mode = 'login' | 'signup';
interface CompanyOption { id: string; name: string; slug: string; login_preference?: 'email' | 'id' | 'both'; }

export default function LoginPage() {
  const { login, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('company');
  const [mode, setMode] = useState<Mode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompanyOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CompanyOption | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const target = user.role === 'super_admin' ? '/super-admin'
        : user.role === 'admin' ? '/admin'
        : (user.status === 'approved' ? '/employee' : '/pending');
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, loading, navigate]);

  // Debounced company search (anon SELECT policy permits this)
  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) { setResults([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from('companies')
        .select('id, name, slug, login_preference')
        .eq('status', 'active')
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
        .order('name')
        .limit(8);
      setResults((data as CompanyOption[]) ?? []);
      setSearching(false);
    }, 200);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query, selected]);

  function pickCompany(c: CompanyOption) {
    setSelected(c);
    setQuery(c.name);
    setResults([]);
    setError(null);
    setStep('auth');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true); setError(null);

    let loginEmail = email.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail);

    // If it's not an email, try to resolve it as an Employee ID (case-insensitive)
    if (!isEmail) {
      const { data, error: rpcErr } = await (supabase as any).rpc('resolve_email_by_employee_id', {
        p_employee_id: loginEmail.toUpperCase(),
        p_company_slug: selected.slug
      });

      if (rpcErr || !data) {
        setSubmitting(false);
        setError('Invalid login details. Please check your ID and try again.');
        return;
      }
      loginEmail = data;
    }

    const { error: err } = await login(selected.slug, loginEmail, password);
    setSubmitting(false);
    if (err) { setError(err); return; }
    toast.success(`Welcome back to ${selected.name}!`);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSubmitting(true); setError(null);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          department: department.trim() || 'General',
          job_title: 'Employee',
          company_id: selected.id,
        },
      },
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    toast.success('Account created — awaiting admin approval.');
    setMode('login'); setPassword(''); setFullName(''); setPhone(''); setDepartment('');
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="h-7 w-7" />
          <span className="font-heading font-bold text-2xl">TechnoML</span>
        </div>
        <div>
          <h1 className="font-heading text-4xl font-bold leading-tight mb-4">
            Intelligent workforce management.
          </h1>
          <p className="text-primary-foreground/85 text-lg">
            Modern management platform with deep insights.
            Attendance, tasks, leave and performance — all in one place.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-primary-foreground/85">
            <li>✓ Strict data isolation</li>
            <li>✓ AI-powered insights</li>
            <li>✓ Modern enterprise portals</li>
          </ul>
        </div>
        <div className="text-xs text-primary-foreground/70">© {new Date().getFullYear()} TechnoML. All rights reserved.</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 rounded-2xl shadow-elegant">
          <div className="mb-6 text-center lg:hidden">
            <div className="inline-flex items-center gap-2 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-heading font-bold text-xl text-primary">TechnoML</span>
            </div>
          </div>

          {step === 'company' ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading text-xl font-semibold">Find your company</h2>
                <p className="text-sm text-muted-foreground mt-1">Search by name or company code</p>
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="company"><Building2 className="inline h-3 w-3 mr-1" />Company name or code</Label>
                <Input id="company" autoFocus value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                  placeholder="Start typing… e.g. tech" autoComplete="off" />
                {(results.length > 0 || searching) && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-popover border rounded-xl shadow-lg overflow-hidden">
                    {searching && <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Searching…</div>}
                    {results.map((c) => (
                      <button key={c.id} type="button" onClick={() => pickCompany(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-accent flex items-center justify-between gap-2 border-b last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">{c.slug}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                {!searching && query.trim() && results.length === 0 && !selected && (
                  <p className="text-xs text-muted-foreground">No matching companies. Try a different name or contact your admin.</p>
                )}
              </div>
              <div className="flex flex-col items-center gap-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Don't have a company yet? Ask your administrator.
                </p>
                <button type="button" 
                  onClick={() => { setSelected({ id: 'platform', name: 'Platform Admin', slug: 'platform' }); setStep('auth'); }}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1.5"
                >
                  <Shield className="h-3 w-3" /> Are you a Platform Admin?
                </button>
                <button type="button" 
                  onClick={() => setStep('reset')}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors mt-2"
                >
                  Trouble logging in? Reset App State
                </button>
              </div>
            </div>
          ) : step === 'reset' ? (
            <div className="space-y-6 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-semibold text-destructive">Reset Application</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  This will clear all local data, sign you out, and refresh the app. Use this if you are stuck in a redirect loop.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button variant="destructive" onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/';
                }}>
                  Confirm Reset & Refresh
                </Button>
                <Button variant="ghost" onClick={() => setStep('company')}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
              <button type="button" onClick={() => { setStep('company'); setError(null); setSelected(null); setQuery(''); }}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3 mr-1" /> Change company
              </button>
              <div>
                <h2 className="font-heading text-xl font-semibold">
                  {mode === 'login' ? 'Welcome to' : 'Join'} {selected?.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {mode === 'login' 
                    ? (selected?.login_preference === 'id' ? 'Sign in with your Employee ID' : 'Sign in with your work credentials') 
                    : 'Create your account — admin will approve it'}
                </p>
              </div>

              {mode === 'signup' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="full-name"><UserIcon className="inline h-3 w-3 mr-1" />Full name</Label>
                    <Input id="full-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone"><Phone className="inline h-3 w-3 mr-1" />Phone</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dept">Department</Label>
                      <Input id="dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="General" />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="login-email">
                  {mode === 'login' ? (
                    selected?.login_preference === 'email' ? <><Mail className="inline h-3 w-3 mr-1" />Email Address</> :
                    selected?.login_preference === 'id' ? <><Shield className="inline h-3 w-3 mr-1" />Employee ID</> :
                    <><Mail className="inline h-3 w-3 mr-1" />Email or Employee ID</>
                  ) : <><Mail className="inline h-3 w-3 mr-1" />Email Address</>}
                </Label>
                <Input id="login-email" required
                  placeholder={mode === 'login' ? (
                    selected?.login_preference === 'email' ? 'email@company.com' :
                    selected?.login_preference === 'id' ? 'e.g. TML-001' :
                    'Email or ID'
                  ) : 'email@company.com'}
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-pwd"><Lock className="inline h-3 w-3 mr-1" />Password</Label>
                <div className="relative">
                  <Input id="login-pwd" type={showPassword ? "text" : "password"} required minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
              </Button>

              {mode === 'login' && (
                <div className="text-center">
                  <a href="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</a>
                </div>
              )}
              <div className="text-center text-sm text-muted-foreground pt-1">
                {mode === 'login' ? (
                  <>New employee at <strong>{selected?.name}</strong>?{' '}
                    <button type="button" className="text-primary hover:underline font-medium"
                      onClick={() => { setMode('signup'); setError(null); }}>Sign up</button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button type="button" className="text-primary hover:underline font-medium"
                      onClick={() => { setMode('login'); setError(null); }}>Sign in</button>
                  </>
                )}
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
