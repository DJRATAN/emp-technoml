import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Building2, Phone, Briefcase, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeProfile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: name.trim(), phone: phone.trim() || null,
    }).eq('id', user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Profile updated');
    await refreshUser();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-heading font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">{user?.name?.charAt(0)}</span>
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">{user?.name}</h3>
              <p className="text-sm text-muted-foreground">{user?.department} · {user?.jobTitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><User className="h-3 w-3" /> Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
              <Input value={user?.email ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Department</Label>
              <Input value={user?.department ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> Job Title</Label>
              <Input value={user?.jobTitle ?? ''} disabled />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <Button className="mt-6" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}
