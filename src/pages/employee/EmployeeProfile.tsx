import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Building2, Phone, Briefcase, Loader2, MapPin, Calendar, ShieldAlert, IdCard, Upload } from 'lucide-react';
import { toast } from 'sonner';

type ProfileExtra = {
  full_name: string;
  phone: string | null;
  department: string | null;
  job_title: string | null;
  emergency_contact: string | null;
  address: string | null;
  date_of_birth: string | null;
  id_card_url: string | null;
};

export default function EmployeeProfile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState<ProfileExtra>({
    full_name: '', phone: '', department: '', job_title: '',
    emergency_contact: '', address: '', date_of_birth: '', id_card_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, department, job_title, emergency_contact, address, date_of_birth, id_card_url')
        .eq('id', user.id)
        .maybeSingle();
      if (data) setForm({
        full_name: data.full_name ?? '',
        phone: data.phone ?? '',
        department: data.department ?? '',
        job_title: data.job_title ?? '',
        emergency_contact: data.emergency_contact ?? '',
        address: data.address ?? '',
        date_of_birth: data.date_of_birth ?? '',
        id_card_url: data.id_card_url ?? '',
      });
      if (data?.id_card_url) {
        const { data: signed } = await supabase.storage.from('id-cards').createSignedUrl(data.id_card_url, 3600);
        setIdCardPreview(signed?.signedUrl ?? null);
      }
      setLoading(false);
    })();
  }, [user]);

  function update<K extends keyof ProfileExtra>(k: K, v: ProfileExtra[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name.trim(),
      phone: form.phone?.trim() || null,
      department: form.department?.trim() || null,
      job_title: form.job_title?.trim() || null,
      emergency_contact: form.emergency_contact?.trim() || null,
      address: form.address?.trim() || null,
      date_of_birth: form.date_of_birth || null,
    }).eq('id', user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Profile updated');
    await refreshUser();
  }

  async function uploadIdCard(file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5MB');
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/id-card.${ext}`;
    const { error: upErr } = await supabase.storage.from('id-cards').upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error } = await supabase.from('profiles').update({ id_card_url: path }).eq('id', user.id);
    if (error) { setUploading(false); return toast.error(error.message); }
    update('id_card_url', path);
    const { data: signed } = await supabase.storage.from('id-cards').createSignedUrl(path, 3600);
    setIdCardPreview(signed?.signedUrl ?? null);
    setUploading(false);
    toast.success('ID card uploaded');
  }

  if (loading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-heading font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and documents</p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">{form.full_name?.charAt(0) || user?.name?.charAt(0)}</span>
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">{form.full_name || user?.name}</h3>
              <p className="text-sm text-muted-foreground">{form.department || '—'} · {form.job_title || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><User className="h-3 w-3" /> Full Name</Label>
              <Input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
              <Input value={user?.email ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Department</Label>
              <Input value={form.department ?? ''} onChange={(e) => update('department', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> Job Title</Label>
              <Input value={form.job_title ?? ''} onChange={(e) => update('job_title', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
              <Input value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Emergency Contact</Label>
              <Input value={form.emergency_contact ?? ''} onChange={(e) => update('emergency_contact', e.target.value)} placeholder="Name & number" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Date of Birth</Label>
              <Input type="date" value={form.date_of_birth ?? ''} onChange={(e) => update('date_of_birth', e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Address</Label>
              <Textarea rows={2} value={form.address ?? ''} onChange={(e) => update('address', e.target.value)} />
            </div>
          </div>
          <Button className="mt-6" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-1"><IdCard className="h-4 w-4 text-primary" /> ID Card</h3>
          <p className="text-sm text-muted-foreground mb-4">Visible only to you and your company admins</p>
          <div className="flex items-start gap-6 flex-wrap">
            {idCardPreview ? (
              <img src={idCardPreview} alt="ID card" className="h-40 rounded-xl border object-cover" />
            ) : (
              <div className="h-40 w-64 rounded-xl border-2 border-dashed flex items-center justify-center text-muted-foreground text-sm">No ID card uploaded</div>
            )}
            <div>
              <input
                id="id-card-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadIdCard(f); }}
              />
              <Button variant="outline" disabled={uploading} onClick={() => document.getElementById('id-card-input')?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> {form.id_card_url ? 'Replace' : 'Upload'} ID Card</>}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">PNG / JPG, max 5MB</p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
