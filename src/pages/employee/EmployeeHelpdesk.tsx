import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { toast } from 'sonner';
import { TicketIcon, Plus, Paperclip, Clock } from 'lucide-react';
import { formatDate } from '@/lib/helpers';

const CATEGORIES = ['it', 'hr', 'facilities', 'finance', 'general'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const priorityColor = (p: string) => p === 'urgent' ? 'destructive' : p === 'high' ? 'default' : 'secondary';
const statusColor = (s: string) => s === 'resolved' || s === 'closed' ? 'default' : s === 'in_progress' ? 'secondary' : 'destructive';

export default function EmployeeHelpdesk() {
  const { user } = useAuth();
  const { features } = useCompanyFeatures();
  const [tickets, setTickets] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [form, setForm] = useState({ title: '', description: '', category: 'general', priority: 'medium' });
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('helpdesk_tickets' as any).select('*').eq('created_by', user.id).order('created_at', { ascending: false });
    setTickets((data ?? []) as any[]);
  };

  const loadDetails = async (id: string) => {
    const [c, a] = await Promise.all([
      supabase.from('helpdesk_comments' as any).select('*').eq('ticket_id', id).order('created_at'),
      supabase.from('helpdesk_attachments' as any).select('*').eq('ticket_id', id).order('created_at'),
    ]);
    setComments((c.data ?? []) as any[]);
    setAttachments((a.data ?? []) as any[]);
  };

  useEffect(() => { load(); }, [user?.id]);
  useEffect(() => { if (active) loadDetails(active.id); }, [active?.id]);

  const create = async () => {
    if (!form.title.trim() || !user?.companyId) return;
    const sla = form.priority === 'urgent' ? 4 : form.priority === 'high' ? 12 : form.priority === 'medium' ? 48 : 96;
    const due = new Date(Date.now() + sla * 3600 * 1000).toISOString();
    const { data, error } = await supabase.from('helpdesk_tickets' as any).insert({
      company_id: user.companyId, created_by: user.id,
      title: form.title.trim().slice(0, 200), description: form.description.trim().slice(0, 2000),
      category: form.category, priority: form.priority, sla_hours: sla, due_at: due,
    }).select().single();
    if (error) return toast.error(error.message);
    if (file && data) {
      const path = `${user.companyId}/${(data as any).id}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from('helpdesk').upload(path, file);
      if (!up.error) {
        await supabase.from('helpdesk_attachments' as any).insert({
          ticket_id: (data as any).id, company_id: user.companyId, uploaded_by: user.id,
          storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size,
        });
      }
    }
    toast.success('Ticket created');
    setOpen(false); setFile(null);
    setForm({ title: '', description: '', category: 'general', priority: 'medium' });
    load();
  };

  const addComment = async () => {
    if (!newComment.trim() || !active || !user?.companyId) return;
    const { error } = await supabase.from('helpdesk_comments' as any).insert({
      ticket_id: active.id, company_id: user.companyId, author_id: user.id, body: newComment.trim().slice(0, 1000),
    });
    if (error) return toast.error(error.message);
    setNewComment('');
    loadDetails(active.id);
  };

  const downloadAttachment = async (path: string, name: string) => {
    const { data } = await supabase.storage.from('helpdesk').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (!features?.helpdesk_enabled) {
    return <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-heading font-semibold">Helpdesk</h1></div><Card><CardContent className="py-10 text-center text-muted-foreground">This feature is disabled by your administrator.</CardContent></Card></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-heading font-semibold">Helpdesk</h1><p className="text-sm text-muted-foreground">Raise tickets to admin</p></div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Ticket</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Raise a ticket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Describe the issue…" maxLength={2000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>My Tickets</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-auto">
            {tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
            {tickets.map(t => (
              <button key={t.id} onClick={() => setActive(t)} className={`w-full text-left p-3 rounded-2xl border transition ${active?.id === t.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm flex-1 truncate">{t.title}</span>
                  <Badge variant={priorityColor(t.priority) as any}>{t.priority}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Badge variant={statusColor(t.status) as any} className="text-[10px]">{t.status}</Badge>
                  <span className="uppercase">{t.category}</span>
                  <Clock className="h-3 w-3 ml-auto" /><span>Due {formatDate(t.due_at)}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TicketIcon className="h-5 w-5" />{active?.title ?? 'Select a ticket'}</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-auto">
            {!active && <p className="text-sm text-muted-foreground">Select a ticket to see comments.</p>}
            {active && (
              <>
                <p className="text-sm whitespace-pre-wrap">{active.description}</p>
                {attachments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Attachments</p>
                    {attachments.map(a => (
                      <button key={a.id} onClick={() => downloadAttachment(a.storage_path, a.file_name)} className="flex items-center gap-2 text-xs text-primary hover:underline">
                        <Paperclip className="h-3 w-3" />{a.file_name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Conversation</p>
                  {comments.map(c => (
                    <div key={c.id} className="text-sm p-2 rounded-xl bg-muted">
                      <p className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</p>
                      {c.body}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment…" maxLength={1000} />
                    <Button onClick={addComment}>Post</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
