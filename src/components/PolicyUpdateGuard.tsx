import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Megaphone, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PolicyUpdateGuard() {
  const { user } = useAuth();
  const [pendingPolicy, setPendingPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check for unacknowledged policy updates
    const checkPolicies = async () => {
      const { data, error } = await supabase
        .from('admin_messages' as any)
        .select('*')
        .eq('receiver_id', user.id)
        .eq('require_acknowledgement', true)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) {
        setPendingPolicy(data);
      }
    };

    checkPolicies();
    
    // Also listen for new broadcasts
    const channel = supabase.channel('policy-updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'admin_messages',
        filter: `receiver_id=eq.${user.id}` 
      }, (payload) => {
        if (payload.new.require_acknowledgement && !payload.new.acknowledged_at) {
          setPendingPolicy(payload.new);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function handleAcknowledge() {
    if (!pendingPolicy) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('admin_messages' as any)
        .update({ acknowledged_at: new Date().toISOString() } as any)
        .eq('id', pendingPolicy.id);

      if (error) throw error;
      toast.success('Policy acknowledged');
      setPendingPolicy(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!pendingPolicy) return null;

  return (
    <Dialog open={!!pendingPolicy}>
      <DialogContent className="sm:max-w-md border-primary/20 shadow-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl font-heading font-bold">Mandatory Policy Update</DialogTitle>
          <div className="p-4 rounded-xl bg-muted/50 border border-primary/10">
            <h4 className="font-bold text-sm mb-2">{pendingPolicy.subject || 'Company Update'}</h4>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {pendingPolicy.body}
            </div>
          </div>
          <DialogDescription className="text-center text-xs text-warning flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" /> You must acknowledge this update to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center mt-2">
          <Button 
            className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20" 
            onClick={handleAcknowledge}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
            I Acknowledge & Agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
