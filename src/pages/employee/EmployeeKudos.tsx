import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { toast } from 'sonner';
import { Award, Star, Heart, ThumbsUp, Trophy } from 'lucide-react';
import { formatDate } from '@/lib/helpers';

const BADGES = [
  { value: 'star', label: 'Star', Icon: Star },
  { value: 'heart', label: 'Helpful', Icon: Heart },
  { value: 'thumb', label: 'Great Work', Icon: ThumbsUp },
  { value: 'trophy', label: 'MVP', Icon: Trophy },
];

export default function EmployeeKudos() {
  const { user } = useAuth();
  const { features } = useCompanyFeatures();
  const [employees, setEmployees] = useState<any[]>([]);
  const [kudos, setKudos] = useState<any[]>([]);
  const [toUser, setToUser] = useState('');
  const [message, setMessage] = useState('');
  const [badge, setBadge] = useState('star');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user?.companyId) return;
    const [emps, kRows] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url').eq('company_id', user.companyId).neq('id', user.id),
      supabase.from('kudos' as any).select('*').eq('company_id', user.companyId).order('created_at', { ascending: false }).limit(50),
    ]);
    setEmployees(emps.data ?? []);
    const list = (kRows.data ?? []) as any[];
    // join names
    const ids = Array.from(new Set(list.flatMap(k => [k.from_user, k.to_user])));
    const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
    const m = new Map((profs ?? []).map(p => [p.id, p]));
    setKudos(list.map(k => ({ ...k, from: m.get(k.from_user), to: m.get(k.to_user) })));
  };

  useEffect(() => { load(); }, [user?.companyId]);

  const submit = async () => {
    if (!toUser || !message.trim() || !user?.companyId) return;
    setSubmitting(true);
    const { error } = await supabase.from('kudos' as any).insert({
      company_id: user.companyId, from_user: user.id, to_user: toUser,
      message: message.trim().slice(0, 500), badge,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Kudos sent! 🎉');
    setMessage(''); setToUser('');
    load();
  };

  if (!features?.kudos_enabled) {
    return <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-heading font-semibold">Kudos</h1></div><Card><CardContent className="py-10 text-center text-muted-foreground">This feature is disabled by your administrator.</CardContent></Card></DashboardLayout>;
  }

  const BadgeIcon = ({ name }: { name: string }) => {
    const b = BADGES.find(b => b.value === name) ?? BADGES[0];
    return <b.Icon className="h-4 w-4 text-amber-500" />;
  };

  return (
    <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-heading font-semibold">Kudos Wall</h1><p className="text-sm text-muted-foreground">Recognize your teammates</p></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" />Send Kudos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={toUser} onValueChange={setToUser}>
              <SelectTrigger><SelectValue placeholder="Choose teammate" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={badge} onValueChange={setBadge}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BADGES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea maxLength={500} placeholder="Why are they awesome?" value={message} onChange={e => setMessage(e.target.value)} />
            <Button onClick={submit} disabled={submitting || !toUser || !message.trim()} className="w-full">Send</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Wall of Fame</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-auto">
            {kudos.length === 0 && <p className="text-sm text-muted-foreground">Be the first to send kudos.</p>}
            {kudos.map(k => (
              <div key={k.id} className="flex gap-3 p-3 rounded-2xl border bg-card">
                <Avatar><AvatarFallback>{k.to?.full_name?.[0] ?? '?'}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <BadgeIcon name={k.badge} />
                    <span className="font-medium">{k.from?.full_name ?? 'Someone'}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{k.to?.full_name ?? 'Someone'}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(k.created_at)}</span>
                  </div>
                  <p className="text-sm mt-1">{k.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
