import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, History } from 'lucide-react';

interface Props {
  /** Filter by single target id (employee view) OR by month + bank (admin view). */
  loanTargetId?: string;
  companyId?: string;
  month?: string; // YYYY-MM-DD
  bank?: string;
  limit?: number;
}

interface Row {
  id: string;
  field: string;
  old_value: number | null;
  new_value: number | null;
  changed_at: string;
  changed_by: string;
  bank: string;
  user_id: string;
}

interface Profile { id: string; full_name: string }

export function TargetHistory({ loanTargetId, companyId, month, bank, limit = 30 }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let q = supabase.from('loan_target_history')
        .select('id, field, old_value, new_value, changed_at, changed_by, bank, user_id')
        .order('changed_at', { ascending: false })
        .limit(limit);
      if (loanTargetId) q = q.eq('loan_target_id', loanTargetId);
      if (companyId) q = q.eq('company_id', companyId);
      if (month) q = q.eq('month', month);
      if (bank) q = q.eq('bank', bank);
      const { data } = await q;
      const list = (data ?? []) as Row[];
      const ids = Array.from(new Set(list.flatMap((r) => [r.changed_by, r.user_id])));
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        const map = new Map<string, string>();
        (profs as Profile[] ?? []).forEach((p) => map.set(p.id, p.full_name));
        if (!cancelled) setProfiles(map);
      }
      if (!cancelled) { setRows(list); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [loanTargetId, companyId, month, bank, limit]);

  if (loading) return <div className="py-6 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;
  if (rows.length === 0) return (
    <div className="py-6 text-center text-sm text-muted-foreground">
      <History className="h-6 w-6 mx-auto mb-1 opacity-40" />
      No change history yet.
    </div>
  );

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
      {rows.map((r) => {
        const who = profiles.get(r.changed_by) ?? 'Someone';
        const employee = profiles.get(r.user_id);
        return (
          <div key={r.id} className="text-xs p-2.5 rounded-lg bg-muted/40 border border-border/50">
            <div className="flex justify-between gap-2 mb-0.5">
              <span className="font-medium">
                {r.bank} · <span className="capitalize">{r.field}</span>
              </span>
              <span className="text-muted-foreground">{new Date(r.changed_at).toLocaleString()}</span>
            </div>
            <p className="text-muted-foreground">
              {r.field === 'created'
                ? <>Target set to <strong className="text-foreground">{r.new_value}</strong></>
                : <><span className="line-through">{r.old_value ?? 0}</span> → <strong className="text-foreground">{r.new_value ?? 0}</strong></>}
              {' · by '}<strong className="text-foreground">{who}</strong>
              {employee && employee !== who && <> for <strong className="text-foreground">{employee}</strong></>}
            </p>
          </div>
        );
      })}
    </div>
  );
}
