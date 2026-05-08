import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SbUser } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'admin' | 'employee';
export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface AppCompany { id: string; name: string; slug: string; logoUrl?: string | null; themeColor?: string | null; planType: 'basic' | 'pro' | 'enterprise'; }

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
      .select('logo_url, theme_color, plan_type' as any)
      .eq('id', companyRaw.id)
      .maybeSingle();
    if (bData) branding = { 
      logoUrl: (bData as any).logo_url, 
      themeColor: (bData as any).theme_color,
      planType: (bData as any).plan_type || 'basic'
    };
  }

  const company: AppCompany | null = companyRaw ? { 
    id: companyRaw.id, 
    name: companyRaw.name, 
    slug: companyRaw.slug,
    planType: (branding as any).planType || 'basic',
    logoUrl: branding.logoUrl,
    themeColor: branding.themeColor
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
    
    // 1. Attempt authentication first
    const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password 
    });

    if (authError || !signInData.user) {
      // Handle failed login
      const { data: profileCheck } = await supabase.from('profiles')
        .select('id, failed_login_count')
        .eq('email', email.trim()).maybeSingle();
      
      if (profileCheck) {
        const newCount = ((profileCheck as any).failed_login_count ?? 0) + 1;
        await supabase.from('profiles').update({ failed_login_count: newCount }).eq('id', (profileCheck as any).id);
      }
      return { error: authError?.message ?? 'Login failed' };
    }

    // 2. Load the app user to check roles
    const u = await loadAppUser(signInData.user);
    if (!u) {
      await supabase.auth.signOut();
      return { error: 'Account profile not found.' };
    }

    // 3. Reset failed count and update login info (shared for all roles)
    await supabase.from('profiles').update({
      failed_login_count: 0, locked_until: null,
      last_login_at: new Date().toISOString(),
      last_login_device: navigator.userAgent,
    } as any).eq('id', u.id);

    // 4. Check for Super Admin bypass
    if (u.role === 'super_admin') {
      return { error: null };
    }

    // 5. For non-super admins, validate the company slug
    const { data: company } = await supabase.from('companies').select('id, status').eq('slug', slug).maybeSingle();
    if (!company) {
      await supabase.auth.signOut();
      return { error: `Company "${slug}" not found.` };
    }
    if (company.status !== 'active') {
      await supabase.auth.signOut();
      return { error: 'This company account is not active.' };
    }

    if (u.companyId !== company.id) {
      await supabase.auth.signOut();
      return { error: 'This account does not belong to this company.' };
    }

    // Log successful login for audit trail
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
