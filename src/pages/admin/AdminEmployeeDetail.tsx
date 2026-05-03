import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Loader2, Upload, Trash2, Download, User, Mail, Building2,
  Phone, Briefcase, Calendar, MapPin, ShieldAlert, FileText, Camera
} from 'lucide-react';
import { toast } from 'sonner';

type ProfileForm = {
  full_name: string; phone: string; department: string; job_title: string;
  emergency_contact: string; address: string; date_of_birth: string;
  avatar_url: string; id_card_url: string;
};

type Doc = { id: string; document_type: string; file_name: string; storage_path: string; notes: string | null; created_at: string };

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
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docType, setDocType] = useState('other');
  const [uploadingDoc, setUploadingDoc] = useState(false);

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
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, phone, department, job_title, emergency_contact, address, date_of_birth, avatar_url, id_card_url')
        .eq('id', id)
        .maybeSingle();
      if (data) {
        setEmail(data.email);
        setForm({
          full_name: data.full_name ?? '',
          phone: data.phone ?? '',
          department: data.department ?? '',
          job_title: data.job_title ?? '',
          emergency_contact: data.emergency_contact ?? '',
          address: data.address ?? '',
          date_of_birth: data.date_of_birth ?? '',
          avatar_url: data.avatar_url ?? '',
          id_card_url: data.id_card_url ?? '',
        });
        if (data.avatar_url) {
          const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(data.avatar_url, 3600);
          setAvatarPreview(signed?.signedUrl ?? null);
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
    }).eq('id', id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Profile updated');
  }

  async function uploadAvatar(file: File) {
    if (!id) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5MB');
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    await supabase.from('profiles').update({ avatar_url: path }).eq('id', id);
    update('avatar_url', path);
    const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
    setAvatarPreview(signed?.signedUrl ?? null);
    setUploading(false);
    toast.success('Profile photo updated — this will be used for face recognition');
  }

  async function uploadDocument(file: File) {
    if (!id || !user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('Max 10MB');
    setUploadingDoc(true);
    const path = `${id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('employee-documents').upload(path, file);
    if (upErr) { setUploadingDoc(false); return toast.error(upErr.message); }
    const { error } = await supabase.from('employee_documents' as any).insert({
      employee_id: id,
      company_id: user.companyId,
      document_type: docType,
      file_name: file.name,
      storage_path: path,
      uploaded_by: user.id,
    } as any);
    setUploadingDoc(false);
    if (error) return toast.error(error.message);
    toast.success('Document uploaded');
    loadDocs();
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

  if (loading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/employees')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold">Employee Profile</h1>
            <p className="text-muted-foreground">Edit profile, upload photo & manage documents</p>
          </div>
        </div>

        {/* Profile Photo */}
        <Card className="p-6">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-4"><Camera className="h-4 w-4 text-primary" /> Profile Photo (Face Recognition Base)</h3>
          <div className="flex items-center gap-6">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="h-24 w-24 rounded-2xl object-cover border" />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">{form.full_name?.charAt(0)}</div>
            )}
            <div>
              <input id="avatar-input" type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
              <Button variant="outline" disabled={uploading} onClick={() => document.getElementById('avatar-input')?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> Upload Photo</>}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">This photo is the base image for AI face matching</p>
            </div>
          </div>
        </Card>

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
      </div>
    </DashboardLayout>
  );
}
