import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SbUser } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'admin' | 'employee';
export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface AppCompany { id: string; name: string; slug: string; logoUrl?: string | null; themeColor?: string | null; }

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isOwner?: boolean;
  status: AccountStatus;
  companyId: string | null;
  company: AppCompany | null;
  department?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Login validates the user belongs to the given company slug. */
  login: (companySlug: string, email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function loadAppUser(sbUser: SbUser): Promise<AppUser | null> {
  // 1. Load basic profile and roles
  const [{ data: profile, error: profErr }, { data: roles }] = await Promise.all([
    supabase.from('profiles').select('*, companies:company_id(id, name, slug, owner_id)').eq('id', sbUser.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', sbUser.id),
  ]);

  if (profErr) console.error('Error loading profile:', profErr);

  const roleSet = new Set((roles ?? []).map((r) => r.role));
  const role: UserRole = roleSet.has('super_admin') ? 'super_admin' 
    : roleSet.has('admin') ? 'admin' 
    : 'employee';

  if (!profile) {
    if (role === 'super_admin') {
      return {
        id: sbUser.id,
        email: sbUser.email || '',
        name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Super Admin',
        role: 'super_admin',
        status: 'approved',
        companyId: null,
        company: null,
      };
    }
    return null;
  }

  // 2. Safely attempt to load branding (in case migrations haven't run)
  const companyRaw = (profile as any).companies as any;
  let branding: { logoUrl?: string | null; themeColor?: string | null } = {};
  
  if (companyRaw?.id) {
    const { data: bData } = await supabase
      .from('companies')
      .select('logo_url, theme_color' as any)
      .eq('id', companyRaw.id)
      .maybeSingle();
    if (bData) branding = { logoUrl: (bData as any).logo_url, themeColor: (bData as any).theme_color };
  }

  const company: AppCompany | null = companyRaw ? { 
    id: companyRaw.id, 
    name: companyRaw.name, 
    slug: companyRaw.slug,
    ...branding
  } : null;
  
  const isOwner = companyRaw?.owner_id === sbUser.id;
  
  return {
    id: sbUser.id,
    email: profile.email,
    name: profile.full_name,
    role,
    isOwner,
    status: profile.status,
    companyId: profile.company_id,
    company,
    department: profile.department,
    jobTitle: profile.job_title,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => {
          loadAppUser(sess.user).then((u) => { setUser(u); setLoading(false); });
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      if (sess?.user) {
        loadAppUser(sess.user).then((u) => { setUser(u); setLoading(false); });
      } else {
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (companySlug: string, email: string, password: string) => {
    const slug = companySlug.trim().toLowerCase();
    const { data: company } = await supabase.from('companies').select('id, status').eq('slug', slug).maybeSingle();
    if (!company) return { error: `Company "${slug}" not found. Check the company code.` };
    if (company.status !== 'active') return { error: 'This company account is not active. Contact support.' };

    // Check if account is locked (Search by email only first)
    const { data: profileCheck } = await supabase.from('profiles')
      .select('id, is_active, locked_until, failed_login_count, company_id')
      .eq('email', email.trim()).maybeSingle();

    if (profileCheck) {
      if (!(profileCheck as any).is_active) return { error: 'Your account has been deactivated. Contact your admin.' };
      const lockedUntil = (profileCheck as any).locked_until;
      if (lockedUntil && new Date(lockedUntil) > new Date()) {
        const mins = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000);
        return { error: `Account locked. Try again in ${mins} minute(s).` };
      }
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error || !signInData.user) {
      // Increment failed login count
      if (profileCheck) {
        const newCount = ((profileCheck as any).failed_login_count ?? 0) + 1;
        const updates: any = { failed_login_count: newCount };
        if (newCount >= 5) {
          updates.locked_until = new Date(Date.now() + 30 * 60000).toISOString();
        }
        await supabase.from('profiles').update(updates).eq('id', (profileCheck as any).id);
      }
      return { error: error?.message ?? 'Login failed' };
    }

    const u = await loadAppUser(signInData.user);
    if (!u) {
      await supabase.auth.signOut();
      return { error: 'Account not found.' };
    }

    // Relaxed check: Allow super_admin regardless of company selection,
    // but check company matching for other roles.
    if (u.role !== 'super_admin' && u.companyId !== company.id) {
      await supabase.auth.signOut();
      return { error: 'This account does not belong to this company.' };
    }

    // Reset failed count on success & update last login (if profile exists)
    if (u.id) {
      await supabase.from('profiles').update({
        failed_login_count: 0, locked_until: null,
        last_login_at: new Date().toISOString(),
        last_login_device: navigator.userAgent,
      } as any).eq('id', u.id);
    }

    // Log successful login
    await supabase.from('login_logs' as any).insert({
      user_id: u.id, company_id: u.companyId, email: email.trim(),
      success: true, user_agent: navigator.userAgent,
    } as any);

    return { error: null };
  }, []);


  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (session?.user) {
      const u = await loadAppUser(session.user);
      setUser(u);
    }
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, session, loading, isAuthenticated: !!session && !!user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
