import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Loader2, Bell, AlertTriangle, CheckCircle2, Megaphone, Ban, Send, Download, Building, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

type AdminMessage = {
  id: string; sender_id: string; message_type: string; subject: string | null; body: string;
  is_broadcast: boolean; disable_replies: boolean; require_acknowledgement: boolean;
  expires_at: string | null; read_at: string | null; acknowledged_at: string | null;
  created_at: string; scheduled_at: string | null; attachment_url: string | null;
};

export default function EmployeeInbox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Layout State
  const [selectedChannel, setSelectedChannel] = useState<'broadcasts' | 'direct'>('broadcasts');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Direct Message State
  const [replyBody, setReplyBody] = useState('');

  const loadMessages = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('admin_messages' as any)
      .select('*')
      .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`)
      .order('created_at', { ascending: true }); // chronological for chat
      
    // Filter expired and future scheduled messages
    const now = new Date();
    const filtered = ((data as any) ?? []).filter((m: AdminMessage) => {
      if (m.expires_at && new Date(m.expires_at) < now) return false;
      if (m.scheduled_at && new Date(m.scheduled_at) > now) return false;
      return true;
    });
    setMessages(filtered);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime
  useEffect(() => {
    if (!user?.companyId) return;
    const channel = supabase.channel('emp-inbox')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'admin_messages', 
        filter: `company_id=eq.${user.companyId}` 
      },
        () => loadMessages()
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.companyId, loadMessages]);

  useEffect(() => {
    // Scroll to bottom of chat when messages change
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, selectedChannel]);

  // Mark all unread in current channel as read
  useEffect(() => {
    const unreadMsgs = messages.filter(m => 
      !m.read_at && 
      ((selectedChannel === 'broadcasts' && m.is_broadcast) || (selectedChannel === 'direct' && !m.is_broadcast))
    );
    if (unreadMsgs.length > 0) {
      unreadMsgs.forEach(async (msg) => {
        await supabase.from('admin_messages' as any).update({ read_at: new Date().toISOString() } as any).eq('id', msg.id);
      });
      // Optimistic update
      setMessages(prev => prev.map(m => unreadMsgs.find(u => u.id === m.id) ? { ...m, read_at: new Date().toISOString() } : m));
    }
  }, [messages, selectedChannel]);

  async function acknowledge(msg: AdminMessage) {
    await supabase.from('admin_messages' as any)
      .update({ acknowledged_at: new Date().toISOString() } as any)
      .eq('id', msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, acknowledged_at: new Date().toISOString() } : m));
    toast.success('Message acknowledged');
  }

  async function sendReply() {
    if (!user?.companyId || !replyBody.trim()) return;
    try {
      // Find an admin to send to. Since we only have 'receiver_id', we'll send it back to the sender of the last received message, or any admin in company.
      // But we are sending a message, so we are the sender, receiver is the admin.
      // Easiest is to send to the sender_id of the last message received.
      const lastMsg = messages.find(m => m.sender_id !== user.id);
      if (!lastMsg) return toast.error("Cannot determine administrator to reply to.");

      const { error } = await supabase.from('admin_messages' as any).insert({
        company_id: user.companyId,
        sender_id: user.id,
        receiver_id: lastMsg.sender_id,
        message_type: 'general',
        body: replyBody.trim(),
        is_broadcast: false,
        disable_replies: false,
        require_acknowledgement: false,
      } as any);
      if (error) throw error;
      setReplyBody('');
      loadMessages();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const broadcastMsgs = messages.filter(m => m.is_broadcast);
  const directMsgs = messages.filter(m => !m.is_broadcast);

  const unreadBroadcasts = broadcastMsgs.filter(m => !m.read_at).length;
  const unreadDirect = directMsgs.filter(m => !m.read_at && m.sender_id !== user?.id).length;

  const currentMessages = selectedChannel === 'broadcasts' ? broadcastMsgs : directMsgs;

  const typeColor: Record<string, string> = {
    update: 'bg-blue-500/10 text-blue-600', emergency: 'bg-destructive/10 text-destructive',
    general: 'bg-muted text-muted-foreground', attachment: 'bg-primary/10 text-primary',
  };

  if (loading) return <DashboardLayout><div className="flex justify-center items-center h-[calc(100vh-8rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  // Check if replies are disabled by looking at the last message received from admin in this channel
  const lastReceivedMsg = [...currentMessages].reverse().find(m => m.sender_id !== user?.id);
  const isRepliesDisabled = selectedChannel === 'broadcasts' || (lastReceivedMsg && lastReceivedMsg.disable_replies);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-6rem)] bg-background border rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Top Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-card/50">
          <h1 className="text-xl font-heading font-bold">Office Communications</h1>
          <Badge variant="outline" className="font-mono text-xs"><ShieldCheck className="h-3 w-3 mr-1 text-green-500"/> Secure Channel</Badge>
        </div>

        {/* 3-Pane Layout */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Pane: Channels */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="bg-muted/10">
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  <div>
                    <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Company Channels</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedChannel('broadcasts')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${selectedChannel === 'broadcasts' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${selectedChannel === 'broadcasts' ? 'bg-primary/20' : 'bg-muted-foreground/20'}`}>
                            <Megaphone className="h-4 w-4" />
                          </div>
                          Broadcasts
                        </div>
                        {unreadBroadcasts > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{unreadBroadcasts}</Badge>}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Direct Support</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedChannel('direct')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${selectedChannel === 'direct' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${selectedChannel === 'direct' ? 'bg-primary/20' : 'bg-muted-foreground/20'}`}>
                            <Bell className="h-4 w-4" />
                          </div>
                          Administrator
                        </div>
                        {unreadDirect > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{unreadDirect}</Badge>}
                      </button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center Pane: Chat History */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col bg-background relative">
              {/* Center Header */}
              <div className="px-6 py-4 border-b flex items-center gap-3 shadow-sm z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className={`p-2 rounded-lg ${selectedChannel === 'broadcasts' ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'}`}>
                  {selectedChannel === 'broadcasts' ? <Megaphone className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{selectedChannel === 'broadcasts' ? 'Company Broadcasts' : 'Direct Support'}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedChannel === 'broadcasts' ? 'Official announcements and updates' : 'Private chat with your administrator'}
                  </p>
                </div>
              </div>

              {/* Chat Area */}
              <ScrollArea className="flex-1 p-6" ref={chatScrollRef}>
                <div className="space-y-6 max-w-3xl mx-auto flex flex-col pb-4">
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Beginning of {selectedChannel} history</p>
                  </div>
                  
                  {currentMessages.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>No messages in this channel yet.</p>
                    </div>
                  )}

                  {currentMessages.map(msg => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isMe && (
                            <Avatar className="h-8 w-8 mt-auto shrink-0 border">
                              <AvatarFallback className="text-xs font-bold text-primary bg-primary/10">AD</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            
                            {/* Message Bubble Header (for Admin messages) */}
                            {!isMe && (
                              <div className="flex items-center gap-2 mb-1 ml-1">
                                <span className="text-xs font-semibold">Administrator</span>
                                <Badge variant="outline" className={`h-5 text-[10px] px-1 ${typeColor[msg.message_type] ?? typeColor.general}`}>
                                  {msg.message_type === 'emergency' && <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
                                  {msg.message_type}
                                </Badge>
                                {msg.disable_replies && selectedChannel !== 'broadcasts' && <span className="text-[10px] text-muted-foreground flex items-center"><Ban className="h-2.5 w-2.5 mr-0.5"/> Read Only</span>}
                              </div>
                            )}

                            {/* The Bubble */}
                            <div className={`px-4 py-3 shadow-sm flex flex-col gap-2 ${
                              isMe 
                                ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm' 
                                : 'bg-card border border-muted-foreground/20 text-foreground rounded-2xl rounded-bl-sm'
                            }`}>
                              {msg.subject && !isMe && <h3 className="font-semibold text-sm border-b border-border/50 pb-1">{msg.subject}</h3>}
                              
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                              
                              {msg.attachment_url && (
                                <a href={msg.attachment_url} target="_blank" rel="noreferrer" className={`mt-2 flex items-center justify-center gap-2 p-2.5 rounded-lg transition text-xs border font-medium ${isMe ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20 border-primary-foreground/20' : 'bg-muted hover:bg-muted/80 border-border'}`}>
                                  <Download className="h-4 w-4" /> Download Attachment
                                </a>
                              )}

                              {/* Acknowledge Action (Only in Admin messages) */}
                              {!isMe && msg.require_acknowledgement && (
                                <div className="mt-2 pt-2 border-t border-border/50">
                                  {msg.acknowledged_at ? (
                                    <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                                      <CheckCircle2 className="h-4 w-4" /> Acknowledged on {new Date(msg.acknowledged_at).toLocaleDateString()}
                                    </p>
                                  ) : (
                                    <Button size="sm" className="w-full h-8 text-xs font-semibold" onClick={() => acknowledge(msg)}>
                                      <CheckCircle2 className="h-4 w-4 mr-2" /> I Have Read This
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            <span className="text-[10px] text-muted-foreground mt-1 px-1">
                              {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t bg-card/50">
                {isRepliesDisabled ? (
                  <div className="py-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2 bg-muted/30 rounded-xl border border-dashed">
                    <Ban className="h-4 w-4" /> 
                    {selectedChannel === 'broadcasts' ? 'Replies are disabled in broadcast channels.' : 'The Administrator has disabled replies for this thread.'}
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); sendReply(); }} className="flex gap-3">
                    <div className="flex-1 relative">
                      <Input 
                        value={replyBody} 
                        onChange={e => setReplyBody(e.target.value)}
                        placeholder="Type a message to the Administrator..." 
                        className="pr-12 py-6 rounded-xl bg-background"
                      />
                    </div>
                    <Button type="submit" disabled={!replyBody.trim()} size="icon" className="h-[50px] w-[50px] rounded-xl shrink-0">
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Pane: Info Details */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={30} className="bg-muted/5">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b font-semibold flex items-center justify-between bg-card/50">
                About
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8">
                  <div className="text-center flex flex-col items-center">
                    <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-sm border border-primary/20">
                      <Building className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="font-bold text-xl">Command Center</h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">Official Company Channel</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Information</h4>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        This is your secure communication line with the company administration. 
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <strong>Broadcasts</strong> are read-only official updates. <strong>Direct Support</strong> allows you to chat privately with an administrator if they have opened a line with you.
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </DashboardLayout>
  );
}
