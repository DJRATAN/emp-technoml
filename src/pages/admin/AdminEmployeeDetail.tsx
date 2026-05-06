import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Loader2, Upload, Trash2, Download, User, Mail, Building2,
  Phone, Briefcase, Calendar, MapPin, ShieldAlert, FileText, Camera,
  KeyRound, Power, PowerOff, Shield, Lock, Snowflake, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

type UserRole = 'employee' | 'admin' | 'super_admin';

type ProfileForm = {
  full_name: string; phone: string; department: string; job_title: string;
  emergency_contact: string; address: string; date_of_birth: string;
  avatar_url: string; id_card_url: string;
};

type ProfileMeta = {
  status: string; is_active: boolean; force_password_change: boolean;
  profile_frozen: boolean; failed_login_count: number; locked_until: string | null;
  last_login_at: string | null; last_login_device: string | null;
};

type Doc = { id: string; document_type: string; file_name: string; storage_path: string; notes: string | null; created_at: string };
type LoginLog = { id: string; success: boolean; email: string; ip_address: string | null; user_agent: string | null; failure_reason: string | null; created_at: string };

const DOC_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'degree', label: 'Degree Certificate' },
  { value: 'medical', label: 'Medical Certificate' },
  { value: 'other', label: 'Other' },
];

export default function AdminEmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileForm>({
    full_name: '', phone: '', department: '', job_title: '',
    emergency_contact: '', address: '', date_of_birth: '', avatar_url: '', id_card_url: '',
  });
  const [meta, setMeta] = useState<ProfileMeta>({
    status: 'pending', is_active: true, force_password_change: false,
    profile_frozen: false, failed_login_count: 0, locked_until: null,
    last_login_at: null, last_login_device: null,
  });
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [permissions, setPermissions] = useState<any>(null);
  const [permSaving, setPermSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docType, setDocType] = useState('other');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setResettingPassword(true);

    try {
      console.log('Initiating password reset for user ID:', id);
      const { data, error } = await supabase.functions.invoke('bootstrap-admin', {
        body: { 
          userId: id, 
          action: 'password',
          newPassword: newPassword.trim(),
          adminId: user?.id,
          companyId: user?.companyId,
        }
      });

      if (error || !data.success) {
        console.error('Password reset failure:', error || data?.error);
        throw new Error(error?.message || data?.error || 'Failed to reset password');
      }

      toast.success(`Password for ${data.email} updated successfully. They can now log in.`);
      setResetDialogOpen(false);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResettingPassword(false);
    }
  };


  const loadDocs = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('employee_documents' as any)
      .select('id, document_type, file_name, storage_path, notes, created_at')
      .eq('employee_id', id)
      .order('created_at', { ascending: false });
    setDocs((data as any) ?? []);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: pData }, { data: rData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', id),
      ]);
      
      if (pData) {
        setEmail((pData as any).email);
        setForm({
          full_name: (pData as any).full_name ?? '',
          phone: (pData as any).phone ?? '',
          department: (pData as any).department ?? '',
          job_title: (pData as any).job_title ?? '',
          emergency_contact: (pData as any).emergency_contact ?? '',
          address: (pData as any).address ?? '',
          date_of_birth: (pData as any).date_of_birth ?? '',
          avatar_url: (pData as any).avatar_url ?? '',
          id_card_url: (pData as any).id_card_url ?? '',
        });
        setMeta({
          status: (pData as any).status ?? 'pending',
          is_active: (pData as any).is_active ?? true,
          force_password_change: (pData as any).force_password_change ?? false,
          profile_frozen: (pData as any).profile_frozen ?? false,
          failed_login_count: (pData as any).failed_login_count ?? 0,
          locked_until: (pData as any).locked_until ?? null,
          last_login_at: (pData as any).last_login_at ?? null,
          last_login_device: (pData as any).last_login_device ?? null,
        });
        if ((pData as any).avatar_url) {
          const { data: signed } = await supabase.storage.from('avatars').createSignedUrl((pData as any).avatar_url, 3600);
          setAvatarPreview(signed?.signedUrl ?? null);
        }
      }

      if (rData && rData.length > 0) {
        const roles = rData.map(r => r.role);
        if (roles.includes('super_admin')) setRole('super_admin');
        else if (roles.includes('admin')) setRole('admin');
        else setRole('employee');
      }

      // Load granular permissions if user is an admin
      if (id) {
        const { data: pData } = await supabase.from('admin_permissions' as any).select('*').eq('user_id', id).maybeSingle();
        if (pData) setPermissions(pData);
        else if (rData && rData.some(r => r.role === 'admin')) {
          // Initialize if they are an admin but have no permission record
          setPermissions({
            can_view_attendance: true,
            can_view_payroll: false,
            can_manage_tasks: true,
            can_delete_employees: false,
            can_manage_settings: false
          });
        }
      }

      await loadDocs();
      setLoading(false);
    })();
  }, [id, loadDocs]);


  function update<K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name.trim(),
      phone: form.phone?.trim() || null,
      department: form.department?.trim() || null,
      job_title: form.job_title?.trim() || null,
      emergency_contact: form.emergency_contact?.trim() || null,
      address: form.address?.trim() || null,
      date_of_birth: form.date_of_birth || null,
    } as any).eq('id', id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Profile updated');
  }

  async function toggleActive() {
    if (!id) return;
    const newActive = !meta.is_active;
    setBusyAction('toggle-active');
    const updates: any = { is_active: newActive };
    if (!newActive) updates.status = 'suspended';
    else if (meta.status === 'suspended') updates.status = 'approved';
    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    setBusyAction(null);
    if (error) return toast.error(error.message);
    setMeta(m => ({ ...m, is_active: newActive, status: updates.status ?? m.status }));
    toast.success(newActive ? 'Employee activated' : 'Employee deactivated');
  }

  async function toggleFreeze() {
    if (!id) return;
    setBusyAction('freeze');
    const { error } = await supabase.from('profiles').update({ profile_frozen: !meta.profile_frozen } as any).eq('id', id);
    setBusyAction(null);
    if (error) return toast.error(error.message);
    setMeta(m => ({ ...m, profile_frozen: !m.profile_frozen }));
    toast.success(meta.profile_frozen ? 'Profile unfrozen' : 'Profile frozen — photo locked');
  }

  async function unlockAccount() {
    if (!id) return;
    setBusyAction('unlock');
    const { error } = await supabase.from('profiles').update({ failed_login_count: 0, locked_until: null } as any).eq('id', id);
    setBusyAction(null);
    if (error) return toast.error(error.message);
    setMeta(m => ({ ...m, failed_login_count: 0, locked_until: null }));
    toast.success('Account unlocked');
  }

  async function sendPasswordReset() {
    if (!email) return;
    setBusyAction('reset-pwd');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusyAction(null);
    setResetDialogOpen(false);
    if (error) return toast.error(error.message);
    // Set force_password_change flag
    await supabase.from('profiles').update({ force_password_change: true } as any).eq('id', id);
    setMeta(m => ({ ...m, force_password_change: true }));
    toast.success(`Password reset link sent to ${email}`);
  }

  async function loadLoginLogs() {
    if (!id) return;
    setLogsLoading(true);
    const { data } = await supabase
      .from('login_logs' as any)
      .select('id, success, email, ip_address, user_agent, failure_reason, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    setLoginLogs((data as any) ?? []);
    setLogsLoading(false);
    setShowLogs(true);
  }

  async function uploadAvatar(file: File) {
    if (!id) return;
    if (meta.profile_frozen) return toast.error('Profile is frozen — cannot change photo');
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5MB');
    setUploading(true);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${id}/avatar_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', id);
      if (dbErr) throw dbErr;

      update('avatar_url', path);
      const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
      setAvatarPreview(signed?.signedUrl ?? null);
      toast.success('Profile photo updated');
      setUploading(false);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message);
      setUploading(false);
    }
  }

  async function uploadDocument(file: File) {
    if (!id || !user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('Max 10MB');
    setUploadingDoc(true);

    try {
      const path = `${id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('employee-documents').upload(path, file);
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('employee_documents' as any).insert({
        employee_id: id,
        company_id: user.companyId,
        document_type: docType,
        file_name: file.name,
        storage_path: path,
        uploaded_by: user.id
      });
      if (dbErr) throw dbErr;

      toast.success('Document uploaded');
      loadDocs();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingDoc(false);
    }
  }

  async function uploadIdCard(file: File) {
    if (!id) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5MB');
    setUploadingIdCard(true);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${id}/id_card_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('id-cards' as any).upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('profiles').update({ id_card_url: path } as any).eq('id', id);
      if (dbErr) throw dbErr;

      update('id_card_url', path);
      toast.success('ID Card updated successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingIdCard(false);
    }
  }

  async function deleteDoc(doc: Doc) {
    await supabase.storage.from('employee-documents').remove([doc.storage_path]);
    await supabase.from('employee_documents' as any).delete().eq('id', doc.id);
    toast.success('Document deleted');
    loadDocs();
  }

  async function downloadDoc(doc: Doc) {
    const { data } = await supabase.storage.from('employee-documents').createSignedUrl(doc.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  async function updateRole(newRole: UserRole) {
    if (!id) return;
    setRoleSaving(true);
    try {
      await supabase.from('user_roles').delete().eq('user_id', id);
      const { error } = await supabase.from('user_roles').insert({ user_id: id, role: newRole } as any);
      if (error) throw error;
      setRole(newRole);
      
      // If promoting to admin, ensure they have a permissions record
      if (newRole === 'admin') {
        const { data: existing } = await supabase.from('admin_permissions' as any).select('id').eq('user_id', id).maybeSingle();
        if (!existing) {
          const { data: newPerms } = await supabase.from('admin_permissions' as any).insert({
            user_id: id,
            company_id: user?.companyId,
            can_view_attendance: true,
            can_manage_tasks: true
          } as any).select().single();
          setPermissions(newPerms);
        }
      } else {
        setPermissions(null);
      }

      toast.success(`User role updated to ${newRole}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRoleSaving(false);
    }
  }

  async function savePermissions() {
    if (!id || !permissions) return;
    setPermSaving(true);
    try {
      const { error } = await supabase.from('admin_permissions' as any).upsert({
        user_id: id,
        company_id: user?.companyId,
        ...permissions
      }).eq('user_id', id);
      if (error) throw error;
      toast.success('Admin permissions updated');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPermSaving(false);
    }
  }

  if (loading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></DashboardLayout>;
  }

  const isLocked = meta.locked_until && new Date(meta.locked_until) > new Date();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/employees')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-heading font-bold">Employee Profile</h1>
            <p className="text-muted-foreground">Edit profile, manage security & documents</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!meta.is_active && <Badge variant="destructive">Deactivated</Badge>}
            {meta.profile_frozen && <Badge variant="secondary"><Snowflake className="h-3 w-3 mr-1" />Frozen</Badge>}
            {meta.force_password_change && <Badge variant="outline" className="border-warning text-warning">Must Reset Password</Badge>}
            {isLocked && <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
          </div>
        </div>

        {/* Admin Actions Bar */}
        <Card className="p-4">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Admin Controls</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={meta.is_active ? "destructive" : "default"} disabled={busyAction === 'toggle-active'} onClick={toggleActive}>
              {busyAction === 'toggle-active' ? <Loader2 className="h-3 w-3 animate-spin" /> :
                meta.is_active ? <><PowerOff className="h-3 w-3 mr-1" />Deactivate</> : <><Power className="h-3 w-3 mr-1" />Activate</>}
            </Button>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><KeyRound className="h-3 w-3 mr-1" />Reset Password</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Reset Employee Password</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">A password reset link will be sent to <strong>{email}</strong>. The employee will be required to change their password on next login.</p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                  <Button onClick={sendPasswordReset} disabled={busyAction === 'reset-pwd'}>
                    {busyAction === 'reset-pwd' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button size="sm" variant={meta.profile_frozen ? "default" : "outline"} disabled={busyAction === 'freeze'} onClick={toggleFreeze}>
              {busyAction === 'freeze' ? <Loader2 className="h-3 w-3 animate-spin" /> :
                meta.profile_frozen ? <><Snowflake className="h-3 w-3 mr-1" />Unfreeze Profile</> : <><Snowflake className="h-3 w-3 mr-1" />Freeze Profile</>}
            </Button>

            {isLocked && (
              <Button size="sm" variant="outline" disabled={busyAction === 'unlock'} onClick={unlockAccount}>
                {busyAction === 'unlock' ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Lock className="h-3 w-3 mr-1" />Unlock Account</>}
              </Button>
            )}

            <Button size="sm" variant="outline" onClick={loadLoginLogs} disabled={logsLoading}>
              {logsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><AlertTriangle className="h-3 w-3 mr-1" />Login Logs</>}
            </Button>
          </div>

          {/* Account Info */}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Failed attempts: <strong className={meta.failed_login_count >= 3 ? 'text-destructive' : ''}>{meta.failed_login_count}</strong></span>
            {meta.last_login_at && <span>Last login: {new Date(meta.last_login_at).toLocaleString()}</span>}
            {meta.last_login_device && <span>Device: {meta.last_login_device.substring(0, 50)}…</span>}
          </div>
        </Card>

        {/* Login Logs */}
        {showLogs && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Login Logs (Last 50)</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowLogs(false)}>Close</Button>
            </div>
            {loginLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No login logs found</p>
            ) : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-muted-foreground border-b">
                    <th className="py-1.5 pr-3 text-left">Time</th>
                    <th className="py-1.5 pr-3 text-left">Status</th>
                    <th className="py-1.5 pr-3 text-left">IP</th>
                    <th className="py-1.5 text-left">Reason</th>
                  </tr></thead>
                  <tbody>
                    {loginLogs.map(log => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="py-1.5 pr-3 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="py-1.5 pr-3">
                          <Badge variant={log.success ? 'default' : 'destructive'} className="text-[10px]">
                            {log.success ? 'Success' : 'Failed'}
                          </Badge>
                        </td>
                        <td className="py-1.5 pr-3 font-mono">{log.ip_address ?? '—'}</td>
                        <td className="py-1.5 text-muted-foreground">{log.failure_reason ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Profile Photo */}
        <Card className="p-6">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-4">
            <Camera className="h-4 w-4 text-primary" /> Profile Photo (Face Recognition Base)
            {meta.profile_frozen && <Badge variant="secondary" className="text-[10px]"><Snowflake className="h-3 w-3 mr-1" />Frozen</Badge>}
          </h3>
          <div className="flex items-center gap-6">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="h-24 w-24 rounded-2xl object-cover border" />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">{form.full_name?.charAt(0)}</div>
            )}
            <div>
              <input id="avatar-input" type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
              <Button variant="outline" disabled={uploading || meta.profile_frozen} onClick={() => document.getElementById('avatar-input')?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> Upload Photo</>}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {meta.profile_frozen ? 'Photo is frozen — unfreeze to change' : 'This photo is the base image for AI face matching'}
              </p>
            </div>
          </div>
        </Card>

        {/* Role Management */}
        {(user?.role === 'super_admin' || user?.isOwner) && (
          <Card className="p-6">
            <h3 className="font-heading font-semibold flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-primary" /> Role Management
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    Current Role: <Badge variant="outline" className="capitalize">{role.replace('_', ' ')}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user?.role === 'super_admin' 
                      ? 'Global Super Admin: You can assign any platform role.' 
                      : 'Company Owner: You can promote staff to Admin or demote to Employee.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={role} onValueChange={(v) => updateRole(v as UserRole)} disabled={roleSaving || (user?.id === id)}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {user?.role === 'super_admin' && <SelectItem value="super_admin">Super Admin (Platform)</SelectItem>}
                  </SelectContent>
                </Select>
                {roleSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {user?.id === id && (
                <p className="text-[10px] text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> You cannot change your own role.
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Permissions Management (only for Admins) */}
        {(user?.role === 'super_admin' || user?.isOwner) && role === 'admin' && permissions && (
          <Card className="p-6">
            <h3 className="font-heading font-semibold flex items-center gap-2 mb-1 text-primary">
              <ShieldAlert className="h-4 w-4" /> Granular Permissions
            </h3>
            <p className="text-xs text-muted-foreground mb-6">Define exactly what this Admin can access and manage.</p>
            
            <div className="space-y-4">
              {[
                { key: 'can_view_attendance', label: 'View Attendance Reports', desc: 'Allows access to company-wide attendance logs' },
                { key: 'can_view_payroll', label: 'Access Payroll/Salary', desc: 'View and manage employee compensation data' },
                { key: 'can_manage_tasks', label: 'Assign & Delete Tasks', desc: 'Control team workload and task distribution' },
                { key: 'can_delete_employees', label: 'Delete Employees', desc: 'High-level destructive permission for profile management' },
                { key: 'can_manage_settings', label: 'Edit Company Settings', desc: 'Modify geofence, working hours, and branding' },
              ].map((p) => (
                <div key={p.key} className="flex items-start justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm cursor-pointer" onClick={() => setPermissions({ ...permissions, [p.key]: !permissions[p.key] })}>
                      {p.label}
                    </Label>
                    <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                  </div>
                  <div 
                    onClick={() => setPermissions({ ...permissions, [p.key]: !permissions[p.key] })}
                    className={`w-10 h-5 rounded-full cursor-pointer transition-colors relative ${permissions[p.key] ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${permissions[p.key] ? 'right-1' : 'left-1'}`} / >
                  </div>
                </div>
              ))}
            </div>

            <Button className="mt-6 w-full" onClick={savePermissions} disabled={permSaving}>
              {permSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Save Permissions
            </Button>
          </Card>
        )}

        {/* Work ID / ID Card */}
        {(user?.role === 'super_admin' || user?.isOwner) && (
          <Card className="p-6">
            <h3 className="font-heading font-semibold flex items-center gap-2 mb-2">
              <Camera className="h-4 w-4 text-primary" /> Work ID / ID Card
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Official identification for employee access and verification.</p>
            
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="w-full sm:w-64 aspect-[3/2] rounded-xl border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden relative group">
                {form.id_card_url ? (
                  <img 
                    src={supabase.storage.from('id-cards' as any).getPublicUrl(form.id_card_url).data.publicUrl} 
                    alt="ID Card" 
                    className="object-contain h-full w-full"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">No ID Uploaded</p>
                  </div>
                )}
                {form.id_card_url && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" className="h-8" onClick={() => window.open(supabase.storage.from('id-cards' as any).getPublicUrl(form.id_card_url).data.publicUrl, '_blank')}>
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <input 
                  type="file" 
                  id="id-card-up" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadIdCard(f); }}
                />
                <Button variant="outline" onClick={() => document.getElementById('id-card-up')?.click()} disabled={uploadingIdCard}>
                  {uploadingIdCard ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  {form.id_card_url ? 'Replace ID Card' : 'Upload ID Card'}
                </Button>
                <p className="text-[10px] text-muted-foreground">Supports JPG, PNG. Max 5MB.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Security Management */}
        {(user?.role === 'super_admin' || user?.isOwner) && (
          <Card className="p-6">
            <h3 className="font-heading font-semibold flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4 text-primary" /> Security Management
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Reset User Password</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Directly update this user's password. They will be able to log in with the new password immediately.
                  </p>
                </div>
                <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <KeyRound className="h-4 w-4" /> Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset Password for {form.full_name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePasswordReset} className="space-y-4 pt-4">
                      <div className="space-y-3">
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Enter new password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
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
                        <Button 
                          className="w-full" 
                          onClick={handlePasswordReset}
                          disabled={resettingPassword || !newPassword}
                        >
                          {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                          Update Password
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </Card>
        )}

        {/* Editable Fields */}
        <Card className="p-6">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-4"><User className="h-4 w-4 text-primary" /> Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><User className="h-3 w-3" /> Full Name</Label>
              <Input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
              <Input value={email} disabled />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Department</Label>
              <Input value={form.department} onChange={(e) => update('department', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> Job Title</Label>
              <Input value={form.job_title} onChange={(e) => update('job_title', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Emergency Contact</Label>
              <Input value={form.emergency_contact} onChange={(e) => update('emergency_contact', e.target.value)} placeholder="Name & number" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Address</Label>
              <Textarea rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} />
            </div>
          </div>
          <Button className="mt-6" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </Card>

        {/* Document Vault */}
        <Card className="p-6">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-primary" /> Document Vault</h3>
          <p className="text-sm text-muted-foreground mb-4">Upload contracts, ID proofs, certificates — employee can only view/download</p>

          <div className="flex items-end gap-3 mb-4 flex-wrap">
            <div className="space-y-1">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <input id="doc-input" type="file" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(f); }} />
              <Button variant="outline" disabled={uploadingDoc} onClick={() => document.getElementById('doc-input')?.click()}>
                {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> Upload Document</>}
              </Button>
            </div>
          </div>

          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOC_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type} · {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadDoc(doc)}>
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteDoc(doc)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Security Management */}
        <Card className="p-6 border-warning/20 bg-warning/5">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-1 text-warning-foreground">
            <ShieldAlert className="h-4 w-4" /> Security Management
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Directly update this user's password. They will be able to log in with the new password immediately.</p>

          <div className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter new password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
            <Button 
              onClick={handlePasswordReset}
              disabled={resettingPassword || !newPassword}
              variant="destructive"
              className="whitespace-nowrap"
            >
              {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Change Password
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
