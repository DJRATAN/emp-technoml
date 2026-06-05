import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, XCircle, Clock, MapPin, Camera, AlertCircle, 
  ArrowRight, Loader2, Calendar, User, FileEdit
} from 'lucide-react';
import { toast } from 'sonner';
import { formatTime } from '@/lib/helpers';

type CorrectionRequest = {
  id: string;
  date: string;
  requested_check_in: string | null;
  requested_check_out: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  user_id: string;
  profiles: { full_name: string; email: string; department: string | null };
  original_attendance_id: string | null;
  attendance?: {
    check_in: string | null;
    check_out: string | null;
    selfie_path: string | null;
    latitude: number | null;
    longitude: number | null;
    distance_m: number | null;
    status: string;
  } | null;
};

export default function AdminCorrections() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!user?.companyId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('attendance_corrections' as any)
      .select('*')
      .eq('company_id', user.companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      const isTableMissing =
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache') ||
        error.message?.includes('attendance_corrections');

      if (!isTableMissing) {
        toast.error(error.message);
      } else {
        console.warn('attendance_corrections table not found — migration may be pending.');
      }
      setRequests([]);
    } else {
      const rows = (data as any[] ?? []);
      
      // Fetch profiles separately (FK type mismatch: text vs uuid)
      const userIds = [...new Set(rows.map((d: any) => d.user_id).filter(Boolean))];
      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, department')
          .in('id', userIds);
        profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      }

      // Fetch attendance records separately (FK type mismatch: text vs uuid)
      const attIds = [...new Set(rows.map((d: any) => d.original_attendance_id).filter(Boolean))];
      let attMap = new Map();
      if (attIds.length > 0) {
        const { data: attData } = await supabase
          .from('attendance')
          .select('id, check_in, check_out, selfie_path, latitude, longitude, distance_m, location_verified, status')
          .in('id', attIds);
        attMap = new Map((attData ?? []).map(a => [a.id, a]));
      }

      const merged = rows.map((d: any) => ({
        ...d,
        profiles: profileMap.get(d.user_id) || { full_name: 'Unknown', email: '', department: null },
        attendance: attMap.get(d.original_attendance_id) || null,
      }));
      setRequests(merged);
    }
    setLoading(false);
  }, [user?.companyId]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function handleReview(req: CorrectionRequest, status: 'approved' | 'rejected') {
    setBusyId(req.id);
    try {
      // 1. Update the request status
      const { error: reqErr } = await supabase
        .from('attendance_corrections' as any)
        .update({ status, reviewed_by: user?.id, updated_at: new Date().toISOString() } as any)
        .eq('id', req.id);

      if (reqErr) throw reqErr;

      // 2. If approved, update or insert the attendance record
      if (status === 'approved') {
        if (req.original_attendance_id) {
          const { error: attErr } = await supabase
            .from('attendance')
            .update({
              check_in: req.requested_check_in,
              check_out: req.requested_check_out,
              status: 'present', // Force present if manually approved
              notes: `Manually corrected: ${req.reason}`
            } as any)
            .eq('id', req.original_attendance_id);
          if (attErr) throw attErr;
        } else {
          // Create new record
          const { error: attErr } = await supabase
            .from('attendance')
            .insert({
              user_id: req.user_id,
              company_id: user?.companyId,
              date: req.date,
              check_in: req.requested_check_in,
              check_out: req.requested_check_out,
              status: 'present',
              notes: `Manual insertion: ${req.reason}`
            } as any);
          if (attErr) throw attErr;
        }
      }

      toast.success(`Request ${status}`);
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-warning" />
            Attendance Corrections
          </h1>
          <p className="text-muted-foreground text-sm">Review employee requests to fix punch-in/out times.</p>
        </div>

        {requests.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground bg-muted/20 border-dashed">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No pending correction requests.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {requests.map((req) => (
              <Card key={req.id} className="overflow-hidden shadow-elegant border-warning/20">
                <div className="flex flex-col lg:flex-row">
                  {/* Left: Request Info */}
                  <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r bg-card">
                    <div className="flex items-center gap-4 mb-6">
                      <Avatar className="h-12 w-12 ring-2 ring-warning/20 ring-offset-2">
                        <AvatarFallback className="bg-warning/10 text-warning font-bold">{req.profiles.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-lg">{req.profiles.full_name}</h3>
                        <p className="text-xs text-muted-foreground">{req.profiles.department} · {req.profiles.email}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto bg-warning/5 text-warning border-warning/20">
                        Pending Review
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-3 rounded-xl bg-muted/30 border">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Requested For</p>
                        <div className="flex items-center gap-2 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          {new Date(req.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/30 border">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Reason</p>
                        <p className="text-sm font-medium italic truncate">"{req.reason}"</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-dashed">
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-muted-foreground mb-1 uppercase">Original</p>
                          <p className="font-mono text-sm">{req.attendance?.check_in ? formatTime(req.attendance.check_in) : '--:--'}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-primary mb-1 uppercase font-bold">Requested</p>
                          <p className="font-mono text-sm font-bold text-primary">{req.requested_check_in ? formatTime(req.requested_check_in) : '--:--'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-xl border border-dashed">
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-muted-foreground mb-1 uppercase">Original Out</p>
                          <p className="font-mono text-sm">{req.attendance?.check_out ? formatTime(req.attendance.check_out) : '--:--'}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-primary mb-1 uppercase font-bold">Requested Out</p>
                          <p className="font-mono text-sm font-bold text-primary">{req.requested_check_out ? formatTime(req.requested_check_out) : '--:--'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                      <Button 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11" 
                        disabled={busyId === req.id}
                        onClick={() => handleReview(req, 'approved')}
                      >
                        {busyId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Approve Correction</>}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/5 h-11"
                        disabled={busyId === req.id}
                        onClick={() => handleReview(req, 'rejected')}
                      >
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                    </div>
                  </div>

                  {/* Right: Verification Proof (Smart UI) */}
                  <div className="lg:w-80 p-6 bg-muted/10 flex flex-col gap-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Camera className="h-3.5 w-3.5" /> Verification Evidence
                      </h4>
                      
                      {req.attendance?.selfie_path ? (
                        <div className="relative group">
                          <div className="aspect-[3/4] rounded-2xl overflow-hidden border-2 border-muted bg-black">
                            <SelfieImage path={req.attendance.selfie_path} />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <p className="text-[10px] text-white font-medium">Attempted Selfie · {formatTime(req.attendance.check_in)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-4 bg-muted/20">
                          <Camera className="h-8 w-8 text-muted-foreground mb-2 opacity-30" />
                          <p className="text-[10px] text-muted-foreground">No face-attendance photo found for this date.</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-background border flex items-center gap-3">
                          <MapPin className={`h-5 w-5 ${(req.attendance as any)?.location_verified ? 'text-emerald-500' : 'text-destructive'}`} />
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">GPS Evidence</p>
                            <p className="text-sm font-medium">
                              {req.attendance?.distance_m !== null ? `${req.attendance?.distance_m}m from office` : 'No GPS Data'}
                            </p>
                          </div>
                          {(req.attendance as any)?.location_verified ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px]">Verified</Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 text-[9px]">Failed</Badge>
                          )}
                        </div>
                        
                        {!(req.attendance as any)?.location_verified && (
                          <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                            <p className="text-[10px] text-destructive leading-tight">
                              The original check-in attempt failed geofencing. Verify the reason manually before approving.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function SelfieImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.storage.from('selfies').createSignedUrl(path, 3600).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl);
    });
  }, [path]);

  if (!url) return <div className="w-full h-full flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  return <img src={url} className="w-full h-full object-cover" alt="Verification proof" />;
}
