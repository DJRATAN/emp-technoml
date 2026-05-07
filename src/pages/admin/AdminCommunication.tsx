import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Send, Megaphone, Search, Clock, Eye, CheckCircle2,
  Loader2, MessageSquarePlus, Bell, AlertTriangle, Paperclip, Ban, MoreHorizontal, Download, User
} from 'lucide-react';
import { toast } from 'sonner';

type Employee = { id: string; full_name: string; department: string | null; email: string };
type AdminMessage = {
  id: string; sender_id: string; receiver_id: string | null; message_type: string; subject: string | null;
  body: string; is_broadcast: boolean; disable_replies: boolean; require_acknowledgement: boolean;
  scheduled_at: string | null; expires_at: string | null; read_at: string | null;
  acknowledged_at: string | null; created_at: string; group_id: string | null; attachment_url: string | null;
};

export default function AdminCommunication() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Layout State
  const [selectedChat, setSelectedChat] = useState<string>('broadcasts'); // 'broadcasts' or employee_id
  const [searchQuery, setSearchQuery] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Compose Broadcast State
  const [composeOpen, setComposeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageType, setMessageType] = useState('general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [disableReplies, setDisableReplies] = useState(false);
  const [requireAck, setRequireAck] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [targetDept, setTargetDept] = useState<string>('all');
  const [scheduledAt, setScheduledAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // Direct Message State
  const [directMsgBody, setDirectMsgBody] = useState('');

  const loadData = useCallback(async () => {
    if (!user?.companyId) return;
    const [empRes, msgRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, department, email')
        .eq('company_id', user.companyId).eq('is_active', true).order('full_name'),
      supabase.from('admin_messages' as any).select('*')
        .eq('company_id', user.companyId).order('created_at', { ascending: true }), // chronological for chat
    ]);
    setEmployees((empRes.data as any) ?? []);
    setMessages((msgRes.data as any) ?? []);
    setLoading(false);
  }, [user?.companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime
  useEffect(() => {
    if (!user?.companyId) return;
    const channel = supabase.channel('admin-msgs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_messages', filter: `company_id=eq.${user.companyId}` },
        () => loadData()
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.companyId, loadData]);

  useEffect(() => {
    // Scroll to bottom of chat when messages change
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, selectedChat]);

  async function sendBroadcast() {
    if (!user?.companyId || !body.trim()) return toast.error('Message body is required');
    setSending(true);
    try {
      let attachmentUrl = null;
      if (attachment) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/mp4'];
        if (attachment.size > maxSize) { setSending(false); return toast.error('File too large. Max 10MB.'); }
        if (!allowedTypes.includes(attachment.type)) { setSending(false); return toast.error('Unsupported file type. PDF, images, or audio only.'); }
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('admin-attachments').upload(`${user.companyId}/${fileName}`, attachment);
        if (uploadError) throw new Error('Failed to upload attachment: ' + uploadError.message);
        const { data: { publicUrl } } = supabase.storage.from('admin-attachments').getPublicUrl(`${user.companyId}/${fileName}`);
        attachmentUrl = publicUrl;
      }

      const groupId = crypto.randomUUID();
      const targetEmployees = targetDept === 'all' ? employees : employees.filter(e => e.department === targetDept);
      
      if (targetEmployees.length === 0) {
        setSending(false);
        return toast.error('No employees found in the selected department');
      }

      const rows = targetEmployees.map(emp => ({
        company_id: user.companyId,
        sender_id: user.id,
        receiver_id: emp.id,
        message_type: messageType,
        subject: subject || null,
        body: body.trim(),
        is_broadcast: true,
        disable_replies: disableReplies,
        require_acknowledgement: requireAck,
        group_id: groupId,
        attachment_url: attachmentUrl,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }));
      const { error } = await supabase.from('admin_messages' as any).insert(rows as any);
      if (error) throw error;
      toast.success(scheduledAt ? `Broadcast scheduled for ${new Date(scheduledAt).toLocaleString()}` : `Broadcast sent to ${targetEmployees.length} employees`);
      
      setComposeOpen(false);
      setSubject(''); setBody(''); setDisableReplies(false); setRequireAck(false); setAttachment(null); setTargetDept('all'); setScheduledAt(''); setExpiresAt('');
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  }

  const uniqueDepartments = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[];

  async function sendDirectMessage() {
    if (!user?.companyId || !directMsgBody.trim() || selectedChat === 'broadcasts') return;
    try {
      const { error } = await supabase.from('admin_messages' as any).insert({
        company_id: user.companyId,
        sender_id: user.id,
        receiver_id: selectedChat,
        message_type: 'general',
        body: directMsgBody.trim(),
        is_broadcast: false,
        disable_replies: false,
        require_acknowledgement: false,
      } as any);
      if (error) throw error;
      setDirectMsgBody('');
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  // --- Process Data for UI ---

  // 1. Group Broadcasts (for the Broadcasts view)
  const groupedBroadcasts: any[] = [];
  const groupMap = new Map<string, any>();
  
  messages.filter(m => m.is_broadcast).forEach(msg => {
    if (msg.group_id) {
      if (!groupMap.has(msg.group_id)) {
        groupMap.set(msg.group_id, {
          ...msg,
          total_recipients: 0,
          read_count: 0,
          ack_count: 0,
        });
        groupedBroadcasts.push(groupMap.get(msg.group_id));
      }
      const group = groupMap.get(msg.group_id);
      group.total_recipients += 1;
      if (msg.read_at) group.read_count += 1;
      if (msg.acknowledged_at) group.ack_count += 1;
    }
  });

  // Sort broadcasts descending for the list
  groupedBroadcasts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // 2. Direct Messages for selected employee
  const directMessages = messages.filter(m => 
    !m.is_broadcast && 
    ((m.sender_id === user?.id && m.receiver_id === selectedChat) || 
     (m.sender_id === selectedChat && m.receiver_id === user?.id))
  );

  const filteredEmployees = employees.filter(e => e.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedEmployeeData = employees.find(e => e.id === selectedChat);

  const typeColor: Record<string, string> = {
    update: 'bg-blue-500/10 text-blue-600', emergency: 'bg-destructive/10 text-destructive',
    general: 'bg-muted text-muted-foreground', attachment: 'bg-primary/10 text-primary',
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-[calc(100vh-8rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-6rem)] bg-background border rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Top Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-card/50">
          <h1 className="text-xl font-heading font-bold">Communication Hub</h1>
          <Badge variant="outline" className="font-mono text-xs">{user?.email}</Badge>
        </div>

        {/* 3-Pane Layout */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Pane: Channels & Contacts */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="bg-muted/10">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search employees..." 
                    className="pl-9 bg-background" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-4">
                  {/* Broadcasts Channel */}
                  <div>
                    <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Channels</p>
                    <button
                      onClick={() => setSelectedChat('broadcasts')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${selectedChat === 'broadcasts' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}
                    >
                      <div className={`p-1.5 rounded-md ${selectedChat === 'broadcasts' ? 'bg-primary/20' : 'bg-muted-foreground/20'}`}>
                        <Megaphone className="h-4 w-4" />
                      </div>
                      Company Broadcasts
                    </button>
                  </div>

                  {/* Direct Messages */}
                  <div>
                    <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                      Direct Messages
                      <Badge variant="secondary" className="text-[10px]">{employees.length}</Badge>
                    </p>
                    <div className="space-y-0.5">
                      {filteredEmployees.map(emp => {
                        // Check if there are unread direct messages from this employee
                        const unreadCount = messages.filter(m => !m.is_broadcast && m.sender_id === emp.id && m.receiver_id === user?.id && !m.read_at).length;
                        return (
                          <button
                            key={emp.id}
                            onClick={() => setSelectedChat(emp.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${selectedChat === emp.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}
                          >
                            <Avatar className="h-8 w-8 border">
                              <AvatarFallback className={selectedChat === emp.id ? 'bg-primary/20 text-primary' : ''}>
                                {emp.full_name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 truncate">{emp.full_name}</div>
                            {unreadCount > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{unreadCount}</Badge>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center Pane: Chat History */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col bg-background">
              {/* Center Header */}
              <div className="px-6 py-4 border-b flex items-center justify-between shadow-sm z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-3">
                  {selectedChat === 'broadcasts' ? (
                    <>
                      <div className="p-2 bg-primary/10 rounded-lg"><Megaphone className="h-5 w-5 text-primary" /></div>
                      <div>
                        <h2 className="font-semibold text-lg">Company Broadcasts</h2>
                        <p className="text-xs text-muted-foreground">Manage mass updates to all employees</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Avatar className="h-10 w-10 border shadow-sm">
                        <AvatarFallback className="bg-primary/5">{selectedEmployeeData?.full_name.substring(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="font-semibold text-lg">{selectedEmployeeData?.full_name}</h2>
                        <p className="text-xs text-muted-foreground">{selectedEmployeeData?.department || 'No Department'}</p>
                      </div>
                    </>
                  )}
                </div>
                <Button variant="ghost" size="icon"><MoreHorizontal className="h-5 w-5" /></Button>
              </div>

              {/* Chat Area */}
              <ScrollArea className="flex-1 p-6" ref={chatScrollRef}>
                {selectedChat === 'broadcasts' ? (
                  <div className="space-y-4 max-w-3xl mx-auto">
                    {groupedBroadcasts.length === 0 && (
                      <div className="text-center py-20 text-muted-foreground">
                        <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No broadcasts sent yet.</p>
                      </div>
                    )}
                    {groupedBroadcasts.map(msg => (
                      <Card key={msg.group_id} className="p-5 shadow-sm border-muted/60">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={typeColor[msg.message_type] ?? typeColor.general}>{msg.message_type}</Badge>
                            {msg.disable_replies && <Badge variant="secondary" className="text-xs"><Ban className="h-3 w-3 mr-1" />No Replies</Badge>}
                            {msg.require_acknowledgement && <Badge variant="outline" className="border-warning text-warning bg-warning/5 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Ack Req</Badge>}
                            {msg.attachment_url && <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs"><Paperclip className="h-3 w-3 mr-1" />Attached</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center whitespace-nowrap"><Clock className="h-3 w-3 mr-1" />{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        {msg.subject && <h3 className="font-semibold text-base mb-1">{msg.subject}</h3>}
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap mb-4">{msg.body}</p>
                        
                        <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-around divide-x divide-border">
                          <div className="text-center px-4">
                            <p className="text-2xl font-bold">{msg.read_count} <span className="text-sm font-normal text-muted-foreground">/ {msg.total_recipients}</span></p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 flex items-center justify-center"><Eye className="h-3 w-3 mr-1" />Read</p>
                          </div>
                          {msg.require_acknowledgement && (
                            <div className="text-center px-4">
                              <p className="text-2xl font-bold">{msg.ack_count} <span className="text-sm font-normal text-muted-foreground">/ {msg.total_recipients}</span></p>
                              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 flex items-center justify-center"><CheckCircle2 className="h-3 w-3 mr-1" />Ack</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6 max-w-3xl mx-auto flex flex-col">
                    <div className="text-center py-6">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">Beginning of direct message history</p>
                    </div>
                    {directMessages.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">
                        <p>No direct messages yet. Send a message to start chatting.</p>
                      </div>
                    )}
                    {directMessages.map((msg, i) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex max-w-[75%] gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!isMe && (
                              <Avatar className="h-8 w-8 mt-auto shrink-0 border">
                                <AvatarFallback className="text-xs">{selectedEmployeeData?.full_name.substring(0,2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            )}
                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`px-4 py-2.5 rounded-2xl shadow-sm whitespace-pre-wrap text-sm ${
                                isMe 
                                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                                  : 'bg-muted/60 text-foreground rounded-bl-sm border'
                              }`}>
                                {msg.body}
                                {msg.attachment_url && (
                                  <a href={msg.attachment_url} target="_blank" rel="noreferrer" className={`mt-2 flex items-center gap-2 p-2 rounded bg-background/20 hover:bg-background/40 transition text-xs border ${isMe ? 'border-primary-foreground/20' : 'border-border'}`}>
                                    <Download className="h-4 w-4" /> Download Attachment
                                  </a>
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
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t bg-card/50">
                {selectedChat === 'broadcasts' ? (
                  <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full py-6 text-base" size="lg">
                        <Megaphone className="h-5 w-5 mr-2" /> Compose New Broadcast
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle className="text-xl">New Broadcast Message</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Message Type</Label>
                            <select 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                              value={messageType} onChange={e => setMessageType(e.target.value)}
                            >
                              <option value="general">General</option>
                              <option value="update">Official Update</option>
                              <option value="emergency">Emergency</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Target Audience</Label>
                            <select 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                              value={targetDept} onChange={e => setTargetDept(e.target.value)}
                            >
                              <option value="all">All Employees</option>
                              {uniqueDepartments.map(dept => (
                                <option key={dept} value={dept}>{dept} Only</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Attachment (Optional)</Label>
                          <Input type="file" onChange={e => setAttachment(e.target.files?.[0] || null)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Subject (Optional)</Label>
                          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Keep it clear and concise..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Message Body</Label>
                          <Textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Type your broadcast message here..." className="resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-normal">Disable Replies</Label>
                            <Switch checked={disableReplies} onCheckedChange={setDisableReplies} />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-normal">Require Acknowledgement</Label>
                            <Switch checked={requireAck} onCheckedChange={setRequireAck} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Schedule Send (Optional)</Label>
                            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0,16)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Expires At (Optional)</Label>
                            <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} min={new Date().toISOString().slice(0,16)} />
                          </div>
                        </div>
                        <Button className="w-full mt-4" size="lg" onClick={sendBroadcast} disabled={sending}>
                          {sending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
                          {scheduledAt ? 'Schedule' : 'Send to'} {targetDept === 'all' ? employees.length : employees.filter(e => e.department === targetDept).length} Employees
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); sendDirectMessage(); }} className="flex gap-3">
                    <div className="flex-1 relative">
                      <Input 
                        value={directMsgBody} 
                        onChange={e => setDirectMsgBody(e.target.value)}
                        placeholder={`Message ${selectedEmployeeData?.full_name}...`} 
                        className="pr-12 py-6 rounded-xl bg-background"
                      />
                    </div>
                    <Button type="submit" disabled={!directMsgBody.trim()} size="icon" className="h-[50px] w-[50px] rounded-xl shrink-0">
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Pane: Profile Details */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={30} className="bg-muted/5">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b font-semibold flex items-center justify-between bg-card/50">
                Details
              </div>
              <ScrollArea className="flex-1 p-6">
                {selectedChat === 'broadcasts' ? (
                  <div className="space-y-6">
                    <div className="text-center p-6 bg-primary/5 rounded-xl border border-primary/10">
                      <Megaphone className="h-10 w-10 text-primary mx-auto mb-3" />
                      <h3 className="font-semibold text-lg">Broadcasts Hub</h3>
                      <p className="text-sm text-muted-foreground mt-2">Manage all top-down communications.</p>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Overall Stats</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total Broadcasts</span>
                          <span className="font-bold">{groupedBroadcasts.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total Messages Sent</span>
                          <span className="font-bold">{messages.filter(m => m.is_broadcast).length}</span>
                        </div>
                        {(() => {
                          const broadcastMsgs = messages.filter(m => m.is_broadcast);
                          const totalRead = broadcastMsgs.filter(m => m.read_at).length;
                          const totalAck = broadcastMsgs.filter(m => m.acknowledged_at).length;
                          const readRate = broadcastMsgs.length > 0 ? Math.round((totalRead / broadcastMsgs.length) * 100) : 0;
                          const ackRate = broadcastMsgs.length > 0 ? Math.round((totalAck / broadcastMsgs.length) * 100) : 0;
                          return (
                            <>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Read Rate</span>
                                <span className="font-bold text-emerald-600">{readRate}%</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Ack Rate</span>
                                <span className="font-bold text-blue-600">{ackRate}%</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Unacknowledged employees for latest broadcast requiring ack */}
                    {(() => {
                      const latestAckBroadcast = groupedBroadcasts.find(b => b.require_acknowledgement);
                      if (!latestAckBroadcast) return null;
                      const groupMsgs = messages.filter(m => m.is_broadcast && (m as any).group_id === latestAckBroadcast.group_id);
                      const unackedEmpIds = groupMsgs.filter(m => !m.acknowledged_at).map(m => m.receiver_id);
                      const unackedEmps = employees.filter(e => unackedEmpIds.includes(e.id));
                      if (unackedEmps.length === 0) return null;
                      return (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Pending Acknowledgement <Badge variant="destructive" className="ml-1 text-[10px]">{unackedEmps.length}</Badge>
                          </h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {unackedEmps.map(emp => (
                              <div key={emp.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                                <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                                <span className="truncate">{emp.full_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  selectedEmployeeData && (
                    <div className="space-y-8">
                      <div className="text-center flex flex-col items-center">
                        <Avatar className="h-24 w-24 border-4 border-background shadow-md mb-4">
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary">{selectedEmployeeData.full_name.substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-xl">{selectedEmployeeData.full_name}</h3>
                        <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1"><User className="h-3 w-3"/> {selectedEmployeeData.department || 'Employee'}</p>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Contact Information</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Email Address</p>
                            <p className="text-sm font-medium">{selectedEmployeeData.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Local Time</p>
                            <p className="text-sm font-medium flex items-center gap-1"><Clock className="h-3 w-3"/> {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </DashboardLayout>
  );
}
