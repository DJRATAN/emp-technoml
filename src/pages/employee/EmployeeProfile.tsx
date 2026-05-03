import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Building2, Phone, Briefcase, Loader2, MapPin, Calendar, ShieldAlert, IdCard, FileText, Download } from 'lucide-react';

type ProfileData = {
  full_name: string;
  phone: string | null;
  department: string | null;
  job_title: string | null;
  emergency_contact: string | null;
  address: string | null;
  date_of_birth: string | null;
  id_card_url: string | null;
  avatar_url: string | null;
};

type Doc = { id: string; document_type: string; file_name: string; storage_path: string; created_at: string };

export default function EmployeeProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, department, job_title, emergency_contact, address, date_of_birth, id_card_url, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setProfile(data as ProfileData);
        if (data.id_card_url) {
          const { data: signed } = await supabase.storage.from('id-cards').createSignedUrl(data.id_card_url, 3600);
          setIdCardPreview(signed?.signedUrl ?? null);
        }
        if (data.avatar_url) {
          const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(data.avatar_url, 3600);
          setAvatarPreview(signed?.signedUrl ?? null);
        }
      }
      // Load documents
      const { data: docData } = await supabase
        .from('employee_documents' as any)
        .select('id, document_type, file_name, storage_path, created_at')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });
      setDocs((docData as any) ?? []);
      setLoading(false);
    })();
  }, [user]);

  async function downloadDoc(doc: Doc) {
    const { data } = await supabase.storage.from('employee-documents').createSignedUrl(doc.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  if (loading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></DashboardLayout>;
  }

  const p = profile;
  const fields = [
    { icon: User, label: 'Full Name', value: p?.full_name },
    { icon: Mail, label: 'Email', value: user?.email },
    { icon: Building2, label: 'Department', value: p?.department },
    { icon: Briefcase, label: 'Job Title', value: p?.job_title },
    { icon: Phone, label: 'Phone', value: p?.phone },
    { icon: ShieldAlert, label: 'Emergency Contact', value: p?.emergency_contact },
    { icon: Calendar, label: 'Date of Birth', value: p?.date_of_birth },
    { icon: MapPin, label: 'Address', value: p?.address },
  ];

  const docTypeLabels: Record<string, string> = {
    contract: 'Contract', id_proof: 'ID Proof', degree: 'Degree Certificate',
    medical: 'Medical Certificate', other: 'Other',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-heading font-bold">My Profile</h1>
          <p className="text-muted-foreground">Your profile is managed by your company admin</p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">{p?.full_name?.charAt(0)}</span>
              </div>
            )}
            <div>
              <h3 className="font-heading font-semibold text-lg">{p?.full_name}</h3>
              <p className="text-sm text-muted-foreground">{p?.department || '—'} · {p?.job_title || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label} className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <f.icon className="h-3 w-3" /> {f.label}
                </p>
                <p className="text-sm font-medium">{f.value || '—'}</p>
              </div>
            ))}
          </div>
        </Card>

        {idCardPreview && (
          <Card className="p-6">
            <h3 className="font-heading font-semibold flex items-center gap-2 mb-4"><IdCard className="h-4 w-4 text-primary" /> ID Card</h3>
            <img src={idCardPreview} alt="ID card" className="h-40 rounded-xl border object-cover" />
          </Card>
        )}

        <Card className="p-6">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-primary" /> Document Vault</h3>
          <p className="text-sm text-muted-foreground mb-4">Documents uploaded by your admin — view and download only</p>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{docTypeLabels[doc.document_type] || doc.document_type} · {new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadDoc(doc)}>
                    <Download className="h-3 w-3 mr-1" /> Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
