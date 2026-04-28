import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function useUserNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setItems((data ?? []) as UserNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const unread = items.filter((i) => !i.read).length;

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, read: true } : i));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  }, [user]);

  return { items, unread, loading, markRead, markAllRead, refresh: load };
}
