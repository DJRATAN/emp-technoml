import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { toast } from 'sonner';
import { Hash, Plus, Send } from 'lucide-react';

interface Channel { id: string; name: string; type: string; created_by: string; }
interface Message { id: string; channel_id: string; author_id: string; body: string; created_at: string; }

export default function EmployeeChat() {
  const { user } = useAuth();
  const { features } = useCompanyFeatures();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [active, setActive] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [authors, setAuthors] = useState<Map<string, string>>(new Map());
  const [body, setBody] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadChannels = async () => {
    if (!user?.companyId) return;
    const { data } = await supabase.from('chat_channels' as any).select('*').eq('company_id', user.companyId).order('created_at');
    const list = (data ?? []) as any[];
    setChannels(list);
    if (!active && list.length) setActive(list[0]);
  };

  const loadMessages = async (channelId: string) => {
    const { data } = await supabase.from('chat_messages' as any).select('*').eq('channel_id', channelId).order('created_at').limit(200);
    const list = (data ?? []) as any[];
    setMessages(list);
    const ids = Array.from(new Set(list.map(m => m.author_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      setAuthors(new Map((profs ?? []).map(p => [p.id, p.full_name])));
    }
  };

  // Auto-join public channels
  const ensureMembership = async (channel: Channel) => {
    if (!user) return;
    if (channel.type === 'public') {
      await supabase.from('chat_channel_members' as any).insert({ channel_id: channel.id, user_id: user.id }).select();
    }
  };

  useEffect(() => { loadChannels(); }, [user?.companyId]);

  useEffect(() => {
    if (!active) return;
    ensureMembership(active);
    loadMessages(active.id);
    const ch = supabase.channel(`chat-${active.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${active.id}` },
        () => loadMessages(active.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const send = async () => {
    if (!body.trim() || !active || !user?.companyId) return;
    const text = body.trim().slice(0, 2000);
    setBody('');
    const { error } = await supabase.from('chat_messages' as any).insert({
      channel_id: active.id, company_id: user.companyId, author_id: user.id, body: text,
    });
    if (error) toast.error(error.message);
  };

  const createChannel = async () => {
    if (!newName.trim() || !user?.companyId) return;
    const { data, error } = await supabase.from('chat_channels' as any).insert({
      company_id: user.companyId, name: newName.trim().slice(0, 50), type: 'public', created_by: user.id,
    }).select().single();
    if (error) return toast.error(error.message);
    setNewName(''); setCreating(false);
    await loadChannels();
    setActive(data as any);
  };

  if (!features?.chat_enabled) {
    return <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-heading font-semibold">Chat</h1></div><Card><CardContent className="py-10 text-center text-muted-foreground">This feature is disabled by your administrator.</CardContent></Card></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-heading font-semibold">Team Chat</h1><p className="text-sm text-muted-foreground">Realtime, tenant-scoped</p></div>
      <div className="grid gap-4 lg:grid-cols-4 h-[calc(100vh-220px)]">
        <Card className="lg:col-span-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center justify-between">Channels
            <Dialog open={creating} onOpenChange={setCreating}>
              <DialogTrigger asChild><Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New channel</DialogTitle></DialogHeader>
                <Input placeholder="channel-name" value={newName} onChange={e => setNewName(e.target.value)} />
                <DialogFooter><Button onClick={createChannel}>Create</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle></CardHeader>
          <CardContent className="flex-1 overflow-auto space-y-1">
            {channels.length === 0 && <p className="text-xs text-muted-foreground">No channels yet — create one.</p>}
            {channels.map(c => (
              <button key={c.id} onClick={() => setActive(c)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${active?.id === c.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                <Hash className="h-4 w-4" />{c.name}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col overflow-hidden">
          <CardHeader className="pb-3"><CardTitle className="text-base">{active ? `# ${active.name}` : 'Select a channel'}</CardTitle></CardHeader>
          <CardContent className="flex-1 overflow-auto space-y-2">
            {messages.map(m => (
              <div key={m.id} className={`flex flex-col ${m.author_id === user?.id ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.author_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  {m.author_id !== user?.id && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{authors.get(m.author_id) ?? '...'}</p>}
                  {m.body}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
            <div ref={endRef} />
          </CardContent>
          {active && (
            <div className="p-3 border-t flex gap-2">
              <Input value={body} onChange={e => setBody(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message…" maxLength={2000} />
              <Button onClick={send} disabled={!body.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
