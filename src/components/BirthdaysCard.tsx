import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Cake } from 'lucide-react';

export function BirthdaysCard() {
  const { user } = useAuth();
  const [items, setItems] = useState<{ name: string; date: string; days: number }[]>([]);

  useEffect(() => {
    (async () => {
      if (!user?.companyId) return;
      const { data } = await supabase.from('profiles')
        .select('full_name, date_of_birth, created_at')
        .eq('company_id', user.companyId)
        .not('date_of_birth', 'is', null);
      const today = new Date();
      const list = (data ?? []).flatMap((p: any) => {
        const dob = new Date(p.date_of_birth);
        const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        const days = Math.round((next.getTime() - today.getTime()) / 86400000);
        if (days > 14) return [];
        return [{ name: p.full_name, date: next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), days }];
      }).sort((a, b) => a.days - b.days);
      setItems(list);
    })();
  }, [user?.companyId]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cake className="h-4 w-4 text-pink-500" />Upcoming Birthdays</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">None in the next 14 days.</p>}
        {items.map((i, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <Avatar className="h-8 w-8"><AvatarFallback>{i.name[0]}</AvatarFallback></Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{i.name}</p>
              <p className="text-xs text-muted-foreground">{i.date}</p>
            </div>
            <span className="text-xs text-muted-foreground">{i.days === 0 ? '🎉 Today!' : `in ${i.days}d`}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
