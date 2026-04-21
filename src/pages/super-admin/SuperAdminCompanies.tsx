import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  employee_count?: number;
}

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

  const load = useCallback(async () => {
    setLoading(true);
    const { data: cs } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    const { data: profs } = await supabase.from('profiles').select('company_id');
    const counts = new Map<string, number>();
    (profs ?? []).forEach((p) => counts.set(p.company_id, (counts.get(p.company_id) ?? 0) + 1));
    setCompanies((cs ?? []).map((c) => ({ ...c, employee_count: counts.get(c.id) ?? 0 })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !ownerEmail.trim() || !ownerName.trim() || ownerPassword.length < 6) {
      toast.error('Fill all fields (password ≥ 6 chars)'); return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('provision-company', {
      body: {
        company: { name: name.trim(), slug: slug.trim().toLowerCase() },
        owner: { email: ownerEmail.trim(), full_name: ownerName.trim(), password: ownerPassword },
      },
    });
    setSubmitting(false);
    if (error || !data?.success) {
      toast.error(data?.error ?? error?.message ?? 'Failed to create company');
      return;
    }
    toast.success(`Company "${name}" created with admin ${ownerEmail}`);
    setName(''); setSlug(''); setOwnerEmail(''); setOwnerName(''); setOwnerPassword('');
    setOpen(false);
    load();
  }

  async function toggleStatus(c: CompanyRow) {
    const next = c.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('companies').update({ status: next }).eq('id', c.id);
    if (error) return toast.error(error.message);
    toast.success(`Company ${next}`);
    load();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Companies</h1>
            <p className="text-muted-foreground">Manage all tenant organizations on the platform</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Company</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create company + admin owner</DialogTitle></DialogHeader>
              <form onSubmit={createCompany} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Company name</Label>
                  <Input required value={name} onChange={(e) => {
                    const v = e.target.value;
                    setName(v);
                    setSlug(v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40));
                  }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Company code (auto)</Label>
                  <Input readOnly value={slug} className="bg-muted font-mono" placeholder="auto-generated from name" />
                  <p className="text-xs text-muted-foreground">Auto-generated from the company name. Employees use this code to sign in.</p>
                </div>
                <div className="border-t pt-3 space-y-1.5">
                  <Label>Owner / Admin name</Label>
                  <Input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Owner email</Label>
                  <Input type="email" required value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Initial password (min 6)</Label>
                  <Input type="password" required minLength={6} value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-6">
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No companies yet.</p>
          ) : (
            <div className="space-y-3">
              {companies.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold truncate">{c.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">{c.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />{c.employee_count}
                    </span>
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(c)}>
                      {c.status === 'active' ? 'Suspend' : 'Activate'}
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
