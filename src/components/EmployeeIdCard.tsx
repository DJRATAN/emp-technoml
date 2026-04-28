import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Building2, Mail, Phone, IdCard, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EmployeeIdCard() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [idCardUrl, setIdCardUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ id_card_url: string | null; avatar_url: string | null; phone: string | null; emergency_contact: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles')
      .select('id_card_url, avatar_url, phone, emergency_contact')
      .eq('id', user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  useEffect(() => {
    if (!profile) return;
    if (profile.avatar_url) {
      supabase.storage.from('avatars').createSignedUrl(profile.avatar_url, 3600)
        .then(({ data }) => setAvatarUrl(data?.signedUrl ?? null));
    }
    if (profile.id_card_url) {
      supabase.storage.from('id-cards').createSignedUrl(profile.id_card_url, 3600)
        .then(({ data }) => setIdCardUrl(data?.signedUrl ?? null));
    }
  }, [profile]);

  if (!user) return null;
  const initial = user.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Profile summary */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarUrl
              ? <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              : <span className="text-2xl font-heading font-bold">{initial}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-heading font-semibold text-lg truncate">{user.name}</h3>
              <Badge variant="secondary" className="bg-success/15 text-success capitalize">{user.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1"><Briefcase className="h-3 w-3" /> {user.jobTitle ?? 'Employee'}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {user.department ?? '—'} · {user.company?.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5"><Mail className="h-3 w-3" /> {user.email}</p>
            {profile?.phone && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" /> {profile.phone}</p>}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button asChild variant="outline" size="sm"><Link to="/employee/profile"><Pencil className="h-3 w-3 mr-1" />Edit profile</Link></Button>
        </div>
      </Card>

      {/* ID Card */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold flex items-center gap-2"><IdCard className="h-4 w-4 text-primary" /> ID Card</h3>
          {!profile?.id_card_url && (
            <Button asChild variant="ghost" size="sm"><Link to="/employee/profile">Upload</Link></Button>
          )}
        </div>
        {idCardUrl ? (
          <div className="rounded-xl overflow-hidden bg-muted/30 border">
            <img src={idCardUrl} alt="ID card" className="w-full max-h-56 object-contain" />
          </div>
        ) : (
          <div className="h-40 rounded-xl bg-muted/30 border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground">
            <IdCard className="h-8 w-8 mb-1 opacity-40" />
            <p className="text-xs">No ID card uploaded</p>
          </div>
        )}
      </Card>
    </div>
  );
}
