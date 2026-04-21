import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SbUser } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'admin' | 'employee';
export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface AppCompany { id: string; name: string; slug: string; }

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from('profiles').select('*, companies:company_id(id, name, slug)').eq('id', sbUser.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', sbUser.id),
  ]);
  if (!profile) return null;
  const roleSet = new Set((roles ?? []).map((r) => r.role));
  const role: UserRole = roleSet.has('super_admin') ? 'super_admin' : roleSet.has('admin') ? 'admin' : 'employee';
  const company = (profile as any).companies as AppCompany | null;
  return {
    id: sbUser.id,
    email: profile.email,
    name: profile.full_name,
    role,
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
    // Look up company first (anon SELECT policy permits this)
    const { data: company } = await supabase.from('companies').select('id, status').eq('slug', slug).maybeSingle();
    if (!company) return { error: `Company "${slug}" not found. Check the company code.` };
    if (company.status !== 'active') return { error: 'This company account is not active. Contact support.' };

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !signInData.user) return { error: error?.message ?? 'Login failed' };

    // Verify the signed-in user belongs to this company (or is super_admin)
    const u = await loadAppUser(signInData.user);
    if (!u) {
      await supabase.auth.signOut();
      return { error: 'Account not found.' };
    }
    if (u.role !== 'super_admin' && u.companyId !== company.id) {
      await supabase.auth.signOut();
      return { error: 'This account does not belong to this company.' };
    }
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
