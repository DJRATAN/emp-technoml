import React, { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Building2, Users, Clock, Shield, UserCog, UserCheck, Lock, Globe, Trash2, Check, X, Star, Zap, Crown } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  status: string;
  plan_type: 'basic' | 'pro' | 'enterprise';
  created_at: string;
  employee_count?: number;
  owner_name?: string;
  owner_email?: string;
  logo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  login_preference?: 'email' | 'id' | 'both';
  employee_id_prefix?: string | null;
}

const ALL_FEATURES = [
  // Basic tier
  { key: 'tasks_enabled', label: 'Tasks Management', description: 'Assign and track tasks', plan: 'basic' as const, icon: '📋' },
  { key: 'birthdays_enabled', label: 'Birthdays & Events', description: 'Celebrate team milestones', plan: 'basic' as const, icon: '🎂' },
  // Pro tier
  { key: 'chat_enabled', label: 'Team Chat', description: 'Enable realtime chat between employees', plan: 'pro' as const, icon: '💬' },
  { key: 'kudos_enabled', label: 'Kudos Wall', description: 'Employee recognition platform', plan: 'pro' as const, icon: '🏆' },
  { key: 'helpdesk_enabled', label: 'IT Helpdesk', description: 'Ticketing system for internal support', plan: 'pro' as const, icon: '🎫' },
  { key: 'multi_level_approvals_enabled', label: 'Multi-Level Approvals', description: 'Advanced approval workflows', plan: 'pro' as const, icon: '✅' },
  // Enterprise tier
  { key: 'ai_analytics_enabled', label: 'AI Analytics', description: 'Smart insights and predictions', plan: 'enterprise' as const, icon: '🤖' },
  { key: 'payroll_export_enabled', label: 'Payroll Export', description: 'Export attendance to payroll formats', plan: 'enterprise' as const, icon: '💰' },
  { key: 'ip_whitelist_enabled', label: 'IP Whitelisting', description: 'Restrict access by IP address', plan: 'enterprise' as const, icon: '🔒' },
  { key: 'mock_gps_detection_enabled', label: 'Mock GPS Detection', description: 'Prevent fake location check-ins', plan: 'enterprise' as const, icon: '📍' },
  { key: 'wellbeing_enabled', label: 'Employee Wellbeing', description: 'Mental health & wellness tracking', plan: 'enterprise' as const, icon: '❤️' },
];

const PLAN_DEFAULTS: Record<string, string[]> = {
  basic: ['tasks_enabled', 'birthdays_enabled'],
  pro: ['tasks_enabled', 'birthdays_enabled', 'chat_enabled', 'kudos_enabled', 'helpdesk_enabled', 'multi_level_approvals_enabled'],
  enterprise: [
    'tasks_enabled', 'birthdays_enabled', 'chat_enabled', 'kudos_enabled',
    'helpdesk_enabled', 'multi_level_approvals_enabled', 'ai_analytics_enabled',
    'payroll_export_enabled', 'ip_whitelist_enabled', 'mock_gps_detection_enabled',
    'wellbeing_enabled'
  ]
};

const PLAN_COLORS = {
  basic: 'text-slate-600 bg-slate-100 border-slate-200',
  pro: 'text-blue-600 bg-blue-100 border-blue-200',
  enterprise: 'text-purple-600 bg-purple-100 border-purple-200',
};

const PLAN_CARD_COLORS = {
  basic: 'border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-slate-400',
  pro: 'border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:border-blue-400',
  enterprise: 'border-purple-200 bg-gradient-to-br from-purple-50 to-white hover:border-purple-400',
};

const PLAN_ACTIVE_COLORS = {
  basic: 'border-slate-500 bg-gradient-to-br from-slate-100 to-slate-50 ring-2 ring-slate-300',
  pro: 'border-blue-500 bg-gradient-to-br from-blue-100 to-blue-50 ring-2 ring-blue-300',
  enterprise: 'border-purple-500 bg-gradient-to-br from-purple-100 to-purple-50 ring-2 ring-purple-300',
};

export default function SuperAdminCompanies() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyThemeColor, setCompanyThemeColor] = useState('#0ea5e9');
  const [loginPreference, setLoginPreference] = useState<'email' | 'id' | 'both'>('both');
  const [idPrefix, setIdPrefix] = useState('');
  const [planType, setPlanType] = useState<'basic' | 'pro' | 'enterprise'>('basic');

  const [editOpen, setEditOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editThemeColor, setEditThemeColor] = useState('#0ea5e9');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLoginPreference, setEditLoginPreference] = useState<'email' | 'id' | 'both'>('both');
  const [editIdPrefix, setEditIdPrefix] = useState('');
  const [editPlanType, setEditPlanType] = useState<'basic' | 'pro' | 'enterprise'>('basic');
  
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerEmail, setEditOwnerEmail] = useState('');
  const [editOwnerPassword, setEditOwnerPassword] = useState('');

  const [usersOpen, setUsersOpen] = useState(false);
  const [managingCompany, setManagingCompany] = useState<CompanyRow | null>(null);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [configuringCompany, setConfiguringCompany] = useState<CompanyRow | null>(null);
  const [currentFeatures, setCurrentFeatures] = useState<any>({});
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<CompanyRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCompanyUsers = async (company: CompanyRow) => {
    setManagingCompany(company);
    setUsersOpen(true);
    setUsersLoading(true);
    
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email, job_title, status')
      .eq('company_id', company.id);
    
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', (profs ?? []).map(p => p.id));
    
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]));
    setCompanyUsers((profs ?? []).map(p => ({
      ...p,
      role: roleMap.get(p.id) || 'employee'
    })));
    setUsersLoading(false);
  };

  async function promoteToAdmin(userId: string) {
    const { error } = await supabase.from('user_roles').upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });
    if (error) return toast.error(error.message);
    toast.success('User promoted to Admin');
    if (managingCompany) loadCompanyUsers(managingCompany);
  }

  async function demoteToEmployee(userId: string) {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
    if (error) return toast.error(error.message);
    toast.success('User demoted to Employee');
    if (managingCompany) loadCompanyUsers(managingCompany);
  }

  async function makeOwner(userId: string) {
    if (!managingCompany) return;
    const { error } = await supabase.from('companies').update({ owner_id: userId }).eq('id', managingCompany.id);
    if (error) return toast.error(error.message);
    
    // Also ensure they are an admin
    await supabase.from('user_roles').upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });
    
    toast.success('Company owner updated');
    load(); // Refresh global list
    setUsersOpen(false);
  }

  async function handleUserPasswordReset() {
    if (!resettingUserId || resetPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setIsResetting(true);
    try {
      const { data, error } = await (supabase as any).rpc('admin_reset_password', {
        p_user_id: resettingUserId, 
        p_new_password: resetPassword
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to reset password');
      toast.success('Password updated successfully');
      setResettingUserId(null);
      setResetPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsResetting(false);
    }
  }

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, companies:company_id(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPendingUsers(data ?? []);
    setPendingLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cs } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      
      // Efficiently count employees per company using a single query if possible, 
      // or map them if the list is small enough. For now, let's use the count feature.
      const companiesWithCounts: CompanyRow[] = await Promise.all((cs ?? []).map(async (c) => {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', c.id);
        
        // Also get owner name and email
        let ownerName = 'Not Set';
        let ownerEmail = '';
        if (c.owner_id) {
          const { data: owner } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', c.owner_id)
            .maybeSingle();
          if (owner) {
             ownerName = owner.full_name;
             ownerEmail = owner.email;
          }
        }

        return { 
          ...c, 
          employee_count: count ?? 0,
          owner_name: ownerName,
          owner_email: ownerEmail,
          plan_type: (c.plan_type || 'basic') as 'basic' | 'pro' | 'enterprise'
        } as CompanyRow;
      }));
      
      setCompanies(companiesWithCounts);
    } catch (err) {
      console.error('Error loading companies:', err);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
      loadPending();
    }
  }, [loadPending]);

  async function approveUser(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: 'approved' } as any)
      .eq('id', id)
      .select('id, status');
    if (error) return toast.error('Approve failed: ' + error.message);
    if (!data || data.length === 0) {
      toast.error('Update blocked by RLS policy. Check database permissions.');
      return;
    }
    toast.success('User approved');
    loadPending();
    load();
  }

  async function rejectUser(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: 'rejected' } as any)
      .eq('id', id)
      .select('id, status');
    if (error) return toast.error('Reject failed: ' + error.message);
    if (!data || data.length === 0) {
      toast.error('Update blocked by RLS policy. Check database permissions.');
      return;
    }
    toast.success('User rejected');
    loadPending();
    load();
  }

  const loadFeatures = async (company: CompanyRow) => {
    setConfiguringCompany(company);
    setFeaturesOpen(true);
    setFeaturesLoading(true);
    const { data } = await supabase.from('company_features' as any).select('*').eq('company_id', company.id).maybeSingle();
    setCurrentFeatures(data || {});
    setFeaturesLoading(false);
  };

  const updateFeature = async (key: string, value: boolean) => {
    if (!configuringCompany) return;
    setCurrentFeatures(prev => ({ ...prev, [key]: value }));
  };

  const applyPlanDefaults = (plan: string) => {
    if (!configuringCompany) return;
    const defaults = PLAN_DEFAULTS[plan] || [];
    const newFeatures: any = {};
    ALL_FEATURES.forEach(f => {
      newFeatures[f.key] = defaults.includes(f.key);
    });
    setCurrentFeatures(newFeatures);
    setConfiguringCompany({ ...configuringCompany, plan_type: plan as any });
  };

  const saveAllFeatures = async () => {
    if (!configuringCompany) return;
    setSavingFeatures(true);
    try {
      // Use select-then-insert/update to avoid ON CONFLICT issues (id may be NULL)
      const { data: existing } = await supabase
        .from('company_features' as any).select('company_id')
        .eq('company_id', configuringCompany.id).maybeSingle();

      let featErr;
      if (existing) {
        const r = await supabase.from('company_features' as any)
          .update({ ...currentFeatures })
          .eq('company_id', configuringCompany.id);
        featErr = r.error;
      } else {
        const r = await supabase.from('company_features' as any)
          .insert({ company_id: configuringCompany.id, ...currentFeatures });
        featErr = r.error;
      }
      if (featErr) throw new Error(featErr.message);

      // Also update plan type on the company record
      await supabase.from('companies')
        .update({ plan_type: configuringCompany.plan_type })
        .eq('id', configuringCompany.id);

      toast.success(`✅ Features saved for ${configuringCompany.name}`);
      setFeaturesOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingFeatures(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error('Fill company name and slug'); return;
    }
    setSubmitting(true);
    try {
      // 1. Upload logo if provided
      let uploadedLogoUrl = null;
      if (logoFile) {
        setUploadingLogo(true);
        const ext = logoFile.name.split('.').pop();
        const path = `logos/${slug}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('company-assets').upload(path, logoFile, {
          upsert: true,
          contentType: logoFile.type,
        });
        if (upErr) throw upErr;
        uploadedLogoUrl = path;
      }

      // 2. Create company record directly
      const { data: company, error: cErr } = await supabase.from('companies').insert({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        status: 'active',
        logo_url: uploadedLogoUrl,
        email: companyEmail.trim() || null,
        phone: companyPhone.trim() || null,
        address: companyAddress.trim() || null,
        theme_color: companyThemeColor,
        login_preference: loginPreference,
        employee_id_prefix: idPrefix.trim().toUpperCase() || null,
        plan_type: planType,
      } as any).select().single();
      if (cErr) throw new Error(cErr.message);

      // 3. Create company settings
      await supabase.from('company_settings').insert({
        company_id: company.id,
        company_name: name.trim(),
      } as any);

      // Create company features based on plan defaults
      const defaults = PLAN_DEFAULTS[planType] || [];
      const newFeatures: any = { company_id: company.id };
      ALL_FEATURES.forEach(f => {
        newFeatures[f.key] = defaults.includes(f.key);
      });
      const { error: featErr } = await supabase.from('company_features' as any).insert(newFeatures);
      if (featErr) console.error('Error inserting default company features:', featErr.message);

      // 4. If admin details are provided, create via RPC
      if (ownerEmail.trim() && ownerName.trim() && ownerPassword.length >= 6) {
        try {
          const { data: fnData, error: fnErr } = await (supabase as any).rpc('create_company_admin', {
            p_company_id: company.id,
            p_email: ownerEmail.trim(),
            p_full_name: ownerName.trim(),
            p_password: ownerPassword
          });
          if (fnErr || !fnData?.success) {
            toast.error(`Admin creation failed: ${fnErr?.message || fnData?.error || 'Unknown error'}`);
            setSubmitting(false);
            return;
          }
        } catch (e: any) {
          toast.error(`Error: ${e.message}`);
          setSubmitting(false);
          return;
        }
      }

      toast.success(`Company "${name}" created successfully!`);
      setName(''); setSlug(''); setOwnerEmail(''); setOwnerName(''); setOwnerPassword('');
      setLogoFile(null); setLogoPreview(null);
      setCompanyEmail(''); setCompanyPhone(''); setCompanyAddress(''); setCompanyThemeColor('#0ea5e9');
      setPlanType('basic');
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
      setUploadingLogo(false);
    }
  }

  async function updateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCompany || !editName.trim() || !editSlug.trim()) return;
    setSubmitting(true);
    try {
      let logoUrl = editingCompany.logo_url;
      // Upload new logo if selected
      if (editLogoFile) {
        const ext = editLogoFile.name.split('.').pop();
        const path = `logos/${editSlug}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('company-assets').upload(path, editLogoFile, {
          upsert: true,
          contentType: editLogoFile.type,
        });
        if (upErr) throw upErr;
        logoUrl = path;
      }
      const { error } = await supabase.from('companies').update({
        name: editName.trim(),
        slug: editSlug.trim().toLowerCase(),
        logo_url: logoUrl,
        theme_color: editThemeColor,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
        login_preference: editLoginPreference,
        employee_id_prefix: editIdPrefix.trim().toUpperCase() || null,
        plan_type: editPlanType,
      } as any).eq('id', editingCompany.id);
      if (error) throw error;

      // If plan type changed, update the defaults in company_features
      if (editPlanType !== editingCompany.plan_type) {
        const { data: existing } = await supabase
          .from('company_features' as any).select('company_id')
          .eq('company_id', editingCompany.id).maybeSingle();

        const defaults = PLAN_DEFAULTS[editPlanType] || [];
        const newFeatures: any = {};
        ALL_FEATURES.forEach(f => {
          newFeatures[f.key] = defaults.includes(f.key);
        });

        if (existing) {
          await supabase.from('company_features' as any)
            .update(newFeatures)
            .eq('company_id', editingCompany.id);
        } else {
          await supabase.from('company_features' as any)
            .insert({ company_id: editingCompany.id, ...newFeatures });
        }
      }
      
      // Handle Owner Info
      if (editOwnerName.trim() && editOwnerEmail.trim() && editOwnerPassword.length >= 6 && !editingCompany.owner_id) {
        // Create new owner
        const { data: fnData, error: fnErr } = await (supabase as any).rpc('create_company_admin', {
          p_company_id: editingCompany.id,
          p_email: editOwnerEmail.trim(),
          p_full_name: editOwnerName.trim(),
          p_password: editOwnerPassword
        });
        if (fnErr || !fnData?.success) {
          toast.error(`Failed to create owner: ${fnErr?.message || fnData?.error || 'Unknown error'}`);
        }
      } else if (editingCompany.owner_id && (editOwnerName || editOwnerEmail || editOwnerPassword)) {
        // Update existing owner
        await (supabase as any).rpc('update_company_admin', {
          p_user_id: editingCompany.owner_id,
          p_email: editOwnerEmail.trim() || null,
          p_full_name: editOwnerName.trim() || null,
          p_password: editOwnerPassword || null
        });
      }

      toast.success('Company updated');
      setEditOpen(false);
      setEditLogoFile(null);
      setEditLogoPreview(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(c: CompanyRow) {
    const next = c.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('companies').update({ status: next }).eq('id', c.id);
    if (error) return toast.error(error.message);
    toast.success(`Company ${next}`);
    load();
  }

  function deleteCompany(c: CompanyRow) {
    setDeletingCompany(c);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingCompany) return;
    setIsDeleting(true);
    try {
      const { data, error } = await (supabase as any).rpc('admin_delete_company', {
        p_company_id: deletingCompany.id
      });
      
      if (error) throw error;
      
      toast.success(`Company ${deletingCompany.name} deleted successfully.`);
      setDeleteOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete company');
    } finally {
      setIsDeleting(false);
      setDeletingCompany(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Platform Administration</h1>
            <p className="text-muted-foreground">Global control for {companies.length} tenant organizations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/20"><Plus className="h-4 w-4 mr-2" />New Organization</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Provision New Company
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={createCompany} className="space-y-4 pt-2">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Organization Name</Label>
                      <Input required placeholder="e.g. Acme Corp" value={name} onChange={(e) => {
                        const v = e.target.value;
                        setName(v);
                        const newSlug = v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
                        setSlug(newSlug);
                        // Auto-fill admin details for convenience
                        setOwnerName('Admin');
                        setOwnerEmail(`admin@${newSlug || 'company'}.com`);
                        if (!ownerPassword) setOwnerPassword('Admin@123');
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Slug / Code</Label>
                      <div className="relative">
                        <Input readOnly value={slug} className="bg-muted font-mono pr-10" />
                        <Lock className="h-3 w-3 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">This unique code is used by employees to sign in.</p>
                    </div>

                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Company Logo</Label>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-xl border bg-muted flex items-center justify-center overflow-hidden">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="object-contain h-full w-full" />
                          ) : (
                            <Building2 className="h-6 w-6 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <input 
                            type="file" 
                            id="logo-upload" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) return toast.error('Max logo size is 2MB');
                                setLogoFile(file);
                                setLogoPreview(URL.createObjectURL(file));
                              }
                            }} 
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => document.getElementById('logo-upload')?.click()}
                          >
                            <Building2 className="h-3 w-3 mr-2" />
                            {logoPreview ? 'Change Logo' : 'Select Logo'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Information</Label>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Email</Label>
                        <Input type="email" placeholder="contact@company.com" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Phone</Label>
                        <Input type="tel" placeholder="+91 98765 43210" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Address</Label>
                        <Input placeholder="123 Business Park, City" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                      </div>
                    </div>

                    {/* Employee ID Configuration */}
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Employee ID System</Label>
                      <div className="space-y-1.5">
                        <Label className="text-xs">ID Prefix (3 letters)</Label>
                        <Input maxLength={4} placeholder="e.g. TML" value={idPrefix} onChange={(e) => setIdPrefix(e.target.value.toUpperCase())} className="font-mono uppercase w-32" />
                        <p className="text-[10px] text-muted-foreground">Used for auto-generating IDs like TML-26-001. Defaults to first 3 letters of slug.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Login Method</Label>
                        <Select value={loginPreference} onValueChange={(v: any) => setLoginPreference(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select login method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Email and Employee ID</SelectItem>
                            <SelectItem value="email">Email Only</SelectItem>
                            <SelectItem value="id">Employee ID Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* Subscription Plan Configuration */}
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Subscription Plan</Label>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Subscription Tier</Label>
                        <Select value={planType} onValueChange={(v: any) => setPlanType(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic Plan (Core features)</SelectItem>
                            <SelectItem value="pro">Pro Plan (Adds Chat, Kudos, Helpdesk, Approvals)</SelectItem>
                            <SelectItem value="enterprise">Enterprise Plan (All features unlocked)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary Administrator</Label>
                      <div className="space-y-2">
                        <Label className="text-xs">Full Name</Label>
                        <Input required placeholder="John Doe" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Work Email</Label>
                        <Input type="email" required placeholder="admin@company.com" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Initial Password</Label>
                        <Input type="password" required minLength={6} value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-2" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Provision Organization'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-primary/5 border-primary/10 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Tenants</p>
              <p className="text-2xl font-bold">{companies.length}</p>
            </div>
          </Card>
          <Card className="p-4 bg-emerald-500/5 border-emerald-500/10 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Platform Users</p>
              <p className="text-2xl font-bold">{companies.reduce((acc, c) => acc + (c.employee_count || 0), 0)}</p>
            </div>
          </Card>
          <Card className="p-4 bg-amber-500/5 border-amber-500/10 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Status</p>
              <p className="text-2xl font-bold">Healthy</p>
            </div>
          </Card>
        </div>

        {pendingUsers.length > 0 && (
          <Card className="p-6 border-warning/50 bg-warning/5">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2 text-warning">
              <Clock className="h-4 w-4" /> Pending Platform Accounts ({pendingUsers.length})
            </h3>
            <p className="text-xs text-muted-foreground mb-4 font-body">Users who signed up or were created and are awaiting global approval.</p>
            <div className="space-y-2">
              {pendingUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-card border shadow-sm">
                  <div>
                    <p className="font-medium text-sm">{u.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">{u.email} · <span className="text-primary">{u.companies?.name || 'No Company'}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveUser(u.id)}>
                      <Check className="h-3 w-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectUser(u.id)}>
                      <X className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Edit Company</DialogTitle></DialogHeader>
            <form onSubmit={updateCompany} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input required value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Company code (slug)</Label>
                <Input required value={editSlug} onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="font-mono" />
              </div>
              
              {/* Logo Upload */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl border bg-muted flex items-center justify-center overflow-hidden">
                    {editLogoPreview ? (
                      <img src={editLogoPreview} alt="Logo" className="object-contain h-full w-full" />
                    ) : editingCompany?.logo_url ? (
                      <img src={supabase.storage.from('company-assets').getPublicUrl(editingCompany.logo_url).data.publicUrl} alt="Logo" className="object-contain h-full w-full" />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input type="file" id="edit-logo-upload" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) return toast.error('Max logo size is 2MB');
                        setEditLogoFile(file);
                        setEditLogoPreview(URL.createObjectURL(file));
                      }
                    }} />
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('edit-logo-upload')?.click()}>
                      <Building2 className="h-3 w-3 mr-2" />
                      {editLogoPreview || editingCompany?.logo_url ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Information</Label>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" placeholder="contact@company.com" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input type="tel" placeholder="+91 98765 43210" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Address</Label>
                  <Input placeholder="123 Business Park, City" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                </div>
              </div>

              {/* Primary Administrator (Owner) Info */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary Administrator</Label>
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name</Label>
                  <Input placeholder="John Doe" value={editOwnerName} onChange={(e) => setEditOwnerName(e.target.value)} required={!editingCompany?.owner_id && editOwnerEmail.length > 0} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Login Email</Label>
                  <Input type="email" placeholder="admin@company.com" value={editOwnerEmail} onChange={(e) => setEditOwnerEmail(e.target.value)} required={!editingCompany?.owner_id && editOwnerName.length > 0} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {editingCompany?.owner_id ? "New Password (leave blank to keep current)" : "Initial Password"}
                  </Label>
                  <Input type="password" minLength={6} value={editOwnerPassword} onChange={(e) => setEditOwnerPassword(e.target.value)} required={!editingCompany?.owner_id && editOwnerName.length > 0} />
                </div>
              </div>

              {/* Employee ID Configuration */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Employee ID System</Label>
                <div className="space-y-1.5">
                  <Label className="text-xs">ID Prefix (3 letters)</Label>
                  <Input maxLength={4} placeholder="e.g. TML" value={editIdPrefix} onChange={(e) => setEditIdPrefix(e.target.value.toUpperCase())} className="font-mono uppercase w-32" />
                  <p className="text-[10px] text-muted-foreground">Format: PREFIX-YY-NNN (e.g. TML-26-001)</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Login Method</Label>
                  <Select value={editLoginPreference} onValueChange={(v: any) => setEditLoginPreference(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select login method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Email and Employee ID</SelectItem>
                      <SelectItem value="email">Email Only</SelectItem>
                      <SelectItem value="id">Employee ID Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subscription Plan Configuration */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Subscription Plan</Label>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subscription Tier</Label>
                  <Select value={editPlanType} onValueChange={(v: any) => setEditPlanType(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Plan (Core features)</SelectItem>
                      <SelectItem value="pro">Pro Plan (Adds Chat, Kudos, Helpdesk, Approvals)</SelectItem>
                      <SelectItem value="enterprise">Enterprise Plan (All features unlocked)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* User Management Dialog */}
        <Dialog open={usersOpen} onOpenChange={setUsersOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" /> 
                Manage Users - {managingCompany?.name}
              </DialogTitle>
            </DialogHeader>
            {usersLoading ? (
              <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3">
                  {companyUsers.map((u) => {
                    const isOwner = managingCompany?.owner_id === u.id;
                    return (
                      <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                        <div className="min-w-0">
                          <p className="font-semibold flex items-center gap-2">
                            {u.full_name} 
                            {isOwner && <Badge className="bg-amber-500 hover:bg-amber-600 border-none flex items-center gap-1"><Shield className="h-3 w-3" /> Owner</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email} · {u.job_title}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={u.role === 'admin' ? 'default' : 'outline'} className="capitalize">
                              {u.role}
                            </Badge>
                            
                            {!isOwner && (
                              <Button size="sm" variant="ghost" className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => makeOwner(u.id)}>
                                <UserCheck className="h-3 w-3 mr-1" /> Make Owner
                              </Button>
                            )}
                            
                            {u.role === 'employee' ? (
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => promoteToAdmin(u.id)}>
                                Promote to Admin
                              </Button>
                            ) : (
                              !isOwner && (
                                <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => demoteToEmployee(u.id)}>
                                  Demote to Employee
                                </Button>
                              )
                            )}
                            
                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setResettingUserId(resettingUserId === u.id ? null : u.id)}>
                              <Lock className="h-3 w-3 mr-1" /> Reset
                            </Button>
                          </div>

                          {resettingUserId === u.id && (
                            <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                              <Input 
                                size={1} 
                                className="h-8 text-xs w-32" 
                                placeholder="New password" 
                                type="password"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                              />
                              <Button size="sm" className="h-8 text-xs" onClick={handleUserPasswordReset} disabled={isResetting}>
                                {isResetting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Update'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Features Management Dialog */}
        <Dialog open={featuresOpen} onOpenChange={setFeaturesOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-5 w-5 text-primary" />
                Feature Gating — <span className="text-primary">{configuringCompany?.name}</span>
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Select a plan tier, then fine-tune individual features.</p>
            </DialogHeader>

            {featuresLoading ? (
              <div className="py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
            ) : (
              <div className="space-y-6 pt-2">

                {/* Plan Tier Selector */}
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">Subscription Tier</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['basic', 'pro', 'enterprise'] as const).map((t) => {
                      const isActive = configuringCompany?.plan_type === t;
                      const featCount = PLAN_DEFAULTS[t].length;
                      const Icon = t === 'basic' ? Star : t === 'pro' ? Zap : Crown;
                      const activeRing = t === 'basic' ? 'ring-slate-400' : t === 'pro' ? 'ring-blue-400' : 'ring-purple-400';
                      const activeBg = t === 'basic' ? 'bg-gradient-to-br from-slate-50 to-white border-slate-300' : t === 'pro' ? 'bg-gradient-to-br from-blue-50 to-white border-blue-300' : 'bg-gradient-to-br from-purple-50 to-white border-purple-300';
                      const iconColor = t === 'basic' ? 'text-slate-600' : t === 'pro' ? 'text-blue-600' : 'text-purple-600';
                      const iconBg = t === 'basic' ? 'bg-slate-200' : t === 'pro' ? 'bg-blue-200' : 'bg-purple-200';
                      const buttonBg = t === 'basic' ? 'bg-slate-800 hover:bg-slate-700' : t === 'pro' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700';

                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => applyPlanDefaults(t)}
                          className={`relative flex flex-col p-5 rounded-2xl border transition-all duration-300 overflow-hidden group text-left ${
                            isActive 
                              ? `border-transparent ring-2 shadow-md ${activeRing} ${activeBg} scale-[1.02] z-10` 
                              : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
                          }`}
                        >
                          {/* Background decoration for active */}
                          {isActive && (
                            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-current opacity-5 blur-2xl pointer-events-none" style={{ color: t === 'pro' ? '#3b82f6' : t === 'enterprise' ? '#a855f7' : '#64748b' }} />
                          )}

                          <div className="flex items-start justify-between w-full mb-4">
                            <div className={`p-2.5 rounded-xl ${isActive ? iconBg : 'bg-muted'} transition-colors shadow-sm`}>
                              <Icon className={`h-5 w-5 ${isActive ? iconColor : 'text-muted-foreground group-hover:text-foreground'}`} />
                            </div>
                            {isActive && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none border-0 font-bold px-2 py-0.5">
                                Active
                              </Badge>
                            )}
                          </div>
                          
                          <div className="w-full flex-1">
                            <h3 className={`font-heading text-lg font-bold capitalize mb-1 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{t}</h3>
                            <div className="flex items-baseline gap-1.5 mb-2">
                              <span className="text-3xl font-bold tracking-tight text-foreground">{featCount}</span> 
                              <span className="text-sm font-medium text-muted-foreground">modules</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed h-8">
                              {t === 'basic' && 'Core attendance & task management.'}
                              {t === 'pro' && 'Everything in Basic + Chat & Helpdesk.'}
                              {t === 'enterprise' && 'All premium features unlocked.'}
                            </p>
                          </div>

                          {/* Selection indicator */}
                          <div className={`mt-4 w-full rounded-full py-2 text-xs font-semibold tracking-wide text-center transition-all ${
                            isActive ? `${buttonBg} text-white shadow-sm` : 'bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground'
                          }`}>
                            {isActive ? 'CURRENT PLAN' : 'SELECT TIER'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Features by Tier Group */}
                <div className="space-y-5">
                  {(['basic', 'pro', 'enterprise'] as const).map((tier) => {
                    const tierFeatures = ALL_FEATURES.filter(f => f.plan === tier);
                    return (
                      <div key={tier}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${PLAN_COLORS[tier]}`}>
                            {tier === 'basic' ? '⭐ Basic' : tier === 'pro' ? '🚀 Pro' : '💎 Enterprise'}
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {tierFeatures.map((f) => {
                            const isOn = !!currentFeatures[f.key];
                            return (
                              <div
                                key={f.key}
                                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                                  isOn
                                    ? 'border-primary/30 bg-primary/5 shadow-sm'
                                    : 'border-border bg-muted/20 opacity-60'
                                }`}
                                onClick={() => updateFeature(f.key, !isOn)}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-lg">{f.icon}</span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold leading-tight">{f.label}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{f.description}</p>
                                  </div>
                                </div>
                                <div className={`ml-2 h-6 w-11 rounded-full relative transition-colors flex-shrink-0 ${
                                  isOn ? 'bg-primary' : 'bg-muted'
                                }`}>
                                  <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                    isOn ? 'translate-x-5' : ''
                                  }`} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Bar */}
                <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3 border">
                  <div className="text-sm">
                    <span className="font-bold text-primary">{Object.values(currentFeatures).filter(Boolean).length}</span>
                    <span className="text-muted-foreground"> of {ALL_FEATURES.length} features enabled</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      const all: any = {}; ALL_FEATURES.forEach(f => all[f.key] = true); setCurrentFeatures(all);
                    }}>Enable All</Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const none: any = {}; ALL_FEATURES.forEach(f => none[f.key] = false); setCurrentFeatures(none);
                    }}>Disable All</Button>
                  </div>
                </div>

                <Button className="w-full h-11 text-base" onClick={saveAllFeatures} disabled={savingFeatures}>
                  {savingFeatures ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : '💾 Apply Configuration'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card className="p-6">
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No companies yet.</p>
          ) : (
            <div className="space-y-4">
              {companies.map((c) => (
                <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border bg-card/50 hover:border-primary/20 transition-colors shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {c.logo_url ? (
                        <img src={supabase.storage.from('company-assets').getPublicUrl(c.logo_url).data.publicUrl} alt="" className="object-contain h-full w-full" />
                      ) : (
                        <Building2 className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-lg truncate leading-tight flex items-center gap-2">
                        {c.name}
                        <Badge variant="outline" className="text-[10px] uppercase py-0 px-1.5 h-4 font-bold border-primary/20 text-primary bg-primary/5">
                          {c.plan_type || 'basic'}
                        </Badge>
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded">{c.slug}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-amber-500" /> 
                          <span className="font-medium text-foreground">{c.owner_name}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/50 mr-2">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary/60" />{c.employee_count}
                      </span>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="rounded-md uppercase text-[10px] tracking-wider">
                        {c.status}
                      </Badge>
                    </div>
                    
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => loadFeatures(c)}>
                      <Shield className="h-4 w-4" /> Features
                    </Button>

                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => loadCompanyUsers(c)}>
                      <UserCog className="h-4 w-4" /> Users
                    </Button>
                    
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingCompany(c);
                      setEditName(c.name);
                      setEditSlug(c.slug);
                      setEditLogoFile(null);
                      setEditLogoPreview(null);
                      setEditThemeColor((c as any).theme_color || '#0ea5e9');
                      setEditEmail(c.email || '');
                      setEditPhone(c.phone || '');
                      setEditAddress(c.address || '');
                      setEditLoginPreference(c.login_preference || 'both');
                      setEditIdPrefix(c.employee_id_prefix || '');
                      setEditPlanType(c.plan_type || 'basic');
                      setEditOwnerName(c.owner_name !== 'Not Set' ? (c.owner_name || '') : '');
                      setEditOwnerEmail((c as any).owner_email || '');
                      setEditOwnerPassword('');
                      setEditOpen(true);
                    }}>Edit</Button>
                    
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(c)}>
                      {c.status === 'active' ? 'Suspend' : 'Activate'}
                    </Button>

                    <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" onClick={() => deleteCompany(c)}>
                      <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the 
                company <strong className="text-foreground">{deletingCompany?.name}</strong> and remove all 
                associated data including users, tasks, and settings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  confirmDelete();
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Company
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </DashboardLayout>
  );
}
