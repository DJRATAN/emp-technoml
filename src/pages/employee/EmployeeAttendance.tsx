import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, CheckCircle2, AlertTriangle, Loader2, Clock, RotateCcw, FileEdit, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { haversineMeters, getCurrentPosition, formatTime } from '@/lib/helpers';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type Step = 'idle' | 'locating' | 'camera' | 'preview' | 'submitting';

export default function EmployeeAttendance() {
  const { user } = useAuth();
  const { settings } = useCompanySettings();
  const [step, setStep] = useState<Step>('idle');
  const [today, setToday] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [position, setPosition] = useState<{ lat: number; lng: number; distance: number; verified: boolean } | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMoodDialog, setShowMoodDialog] = useState(false);
  const [isSubmittingMood, setIsSubmittingMood] = useState(false);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionDate, setCorrectionDate] = useState('');
  const [correctionCheckIn, setCorrectionCheckIn] = useState('');
  const [correctionCheckOut, setCorrectionCheckOut] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [corrections, setCorrections] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const [t, h] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', todayStr).maybeSingle(),
      supabase.from('attendance').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(10),
    ]);
    setToday(t.data); setHistory(h.data ?? []);
    // Load correction requests
    const { data: corrData } = await supabase
      .from('attendance_corrections' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setCorrections((corrData as any) ?? []);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startFlow() {
    setError(null); setStep('locating');
    if (!settings) { setError('Settings not loaded'); setStep('idle'); return; }
    try {
      const pos = await getCurrentPosition();
      const dist = haversineMeters(pos.coords.latitude, pos.coords.longitude, settings.office_latitude, settings.office_longitude);
      const verified = dist <= settings.geofence_radius_m;
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, distance: dist, verified });
      if (!verified) {
        setError(`You are ${Math.round(dist)}m from office. Move within ${settings.geofence_radius_m}m to mark attendance.`);
        setStep('idle'); return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } } });
      streamRef.current = stream;
      setStep('camera');
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    } catch (e: any) {
      setError(e?.message?.includes('denied') ? 'Permission denied. Allow location & camera access.' : (e?.message ?? 'Failed to start.'));
      setStep('idle');
    }
  }

  function capture() {
    const video = videoRef.current; if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480; canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setPhotoBlob(blob); setPhotoUrl(URL.createObjectURL(blob)); stopCamera(); setStep('preview');
    }, 'image/jpeg', 0.85);
  }

  function retake() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoBlob(null); setPhotoUrl(null); startFlow();
  }

  async function submit() {
    if (!user || !photoBlob || !position || !settings) return;
    setStep('submitting');
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const filename = `${user.id}/${dateStr}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('selfies').upload(filename, photoBlob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      const [h, m] = settings.work_start_time.split(':').map(Number);
      const cutoff = new Date(today); cutoff.setHours(h, m + settings.late_threshold_minutes, 0, 0);
      const status = today > cutoff ? 'late' : 'present';
      if (!user.companyId) throw new Error('No company associated with this account');
      const { error: insErr } = await supabase.from('attendance').insert({
        user_id: user.id, company_id: user.companyId, date: dateStr, check_in: today.toISOString(),
        selfie_path: filename, latitude: position.lat, longitude: position.lng,
        distance_m: Math.round(position.distance), location_verified: true, status,
      });
      if (insErr) throw insErr;
      toast.success('Attendance marked successfully!');
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoBlob(null); setPhotoUrl(null);
      await loadData(); setStep('idle');
      
      // If it's a check-in (not a late check-in updating something, though currently we just insert),
      // we show the mood dialog!
      setShowMoodDialog(true);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to submit'); setStep('preview');
    }
  }

  async function submitMood(score: number, note: string = '') {
    if (!user?.companyId) return;
    setIsSubmittingMood(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('employee_moods' as any).insert({
        company_id: user.companyId,
        user_id: user.id,
        date: todayStr,
        mood: score,
        note
      });
      if (error) throw error;
      toast.success('Thank you for sharing!');
      setShowMoodDialog(false);
      navigate('/employee');
    } catch (e: any) {
      console.error("Error saving mood:", e);
      toast.error(e?.message || 'Failed to save mood');
    } finally {
      setIsSubmittingMood(false);
    }
  }

  async function checkOut() {
    if (!user || !today) return;
    const { error } = await supabase.from('attendance').update({ check_out: new Date().toISOString() }).eq('id', today.id);
    if (error) return toast.error(error.message);
    toast.success('Checked out'); loadData();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Attendance</h1>
          <p className="text-muted-foreground">Verify your location and capture a selfie to mark attendance</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Today · {new Date().toLocaleDateString()}</h3>
            {today ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-success/10">
                  <div><p className="text-sm text-muted-foreground">Status</p><StatusBadge status={today.status === 'late' ? 'Late' : 'Present'} /></div>
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-muted/40"><p className="text-muted-foreground text-xs">Check-in</p><p className="font-semibold">{formatTime(today.check_in)}</p></div>
                  <div className="p-3 rounded-xl bg-muted/40"><p className="text-muted-foreground text-xs">Check-out</p><p className="font-semibold">{formatTime(today.check_out)}</p></div>
                </div>
                {!today.check_out && <Button onClick={checkOut} variant="outline" className="w-full"><Clock className="h-4 w-4 mr-2" /> Check Out Now</Button>}
              </div>
            ) : step === 'idle' ? (
              <div className="text-center py-6">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">You haven't marked attendance today</p>
                <Button size="lg" onClick={startFlow}><Camera className="h-4 w-4 mr-2" /> Mark Attendance</Button>
                {error && (
                  <div className="mt-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm flex items-start gap-2 text-left">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
                  </div>
                )}
              </div>
            ) : step === 'locating' ? (
              <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" /><p className="text-sm text-muted-foreground">Verifying your location…</p></div>
            ) : step === 'camera' ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden bg-black aspect-square"><video ref={videoRef} className="w-full h-full object-cover" playsInline muted /></div>
                <Button onClick={capture} className="w-full"><Camera className="h-4 w-4 mr-2" />Capture Selfie</Button>
              </div>
            ) : step === 'preview' && photoUrl ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden bg-muted aspect-square"><img src={photoUrl} alt="Selfie preview" className="w-full h-full object-cover" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={retake}><RotateCcw className="h-4 w-4 mr-2" />Retake</Button>
                  <Button onClick={submit}><CheckCircle2 className="h-4 w-4 mr-2" />Submit</Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" /><p className="text-sm text-muted-foreground">Submitting…</p></div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Location Verification</h3>
            <div className="rounded-xl bg-muted/40 aspect-video flex items-center justify-center mb-3 relative overflow-hidden">
              <MapPin className="h-12 w-12 text-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-32 w-32 rounded-full border-2 border-primary/40 bg-primary/5 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Office location</span><span className="font-mono text-xs">{settings ? `${settings.office_latitude.toFixed(4)}, ${settings.office_longitude.toFixed(4)}` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Geo-fence radius</span><span>{settings?.geofence_radius_m ?? 200}m</span></div>
              {position && (<>
                <div className="flex justify-between"><span className="text-muted-foreground">Your location</span><span className="font-mono text-xs">{position.lat.toFixed(4)}, {position.lng.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Distance</span><span className={position.verified ? 'text-success font-medium' : 'text-destructive font-medium'}>{Math.round(position.distance)}m</span></div>
              </>)}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4">Recent Attendance</h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No attendance records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Check-in</th><th className="py-2 pr-4">Check-out</th><th className="py-2 pr-4">Distance</th><th className="py-2">Status</th>
                </tr></thead>
                <tbody>
                  {history.map((r, index) => (
                    <tr key={r.id || index} className="border-b last:border-0">
                      <td className="py-3 pr-4">{r.date}</td>
                      <td className="py-3 pr-4">{formatTime(r.check_in)}</td>
                      <td className="py-3 pr-4">{formatTime(r.check_out)}</td>
                      <td className="py-3 pr-4">{r.distance_m ?? '—'}m</td>
                      <td className="py-3"><StatusBadge status={r.status === 'late' ? 'Late' : r.status === 'absent' ? 'Absent' : 'Present'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Attendance Correction Request */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-primary" />
              Attendance Corrections
            </h3>
            <Button variant="outline" size="sm" onClick={() => setShowCorrectionForm(!showCorrectionForm)}>
              {showCorrectionForm ? 'Cancel' : 'Request Correction'}
            </Button>
          </div>
          
          {showCorrectionForm && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!user?.companyId || !correctionDate || !correctionReason.trim()) return;
              setSubmittingCorrection(true);
              try {
                const { error: err } = await supabase.from('attendance_corrections' as any).insert({
                  company_id: user.companyId,
                  user_id: user.id,
                  date: correctionDate,
                  requested_check_in: correctionCheckIn ? new Date(`${correctionDate}T${correctionCheckIn}`).toISOString() : null,
                  requested_check_out: correctionCheckOut ? new Date(`${correctionDate}T${correctionCheckOut}`).toISOString() : null,
                  reason: correctionReason.trim(),
                  status: 'pending'
                } as any);
                if (err) throw err;
                toast.success('Correction request submitted');
                setCorrectionDate(''); setCorrectionCheckIn(''); setCorrectionCheckOut(''); setCorrectionReason('');
                setShowCorrectionForm(false);
                loadData();
              } catch (err: any) {
                toast.error(err?.message || 'Failed to submit');
              } finally {
                setSubmittingCorrection(false);
              }
            }} className="space-y-4 mb-6 p-4 rounded-xl border bg-muted/20">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" required value={correctionDate} onChange={e => setCorrectionDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Correct Check-in</Label>
                  <Input type="time" value={correctionCheckIn} onChange={e => setCorrectionCheckIn(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Correct Check-out</Label>
                  <Input type="time" value={correctionCheckOut} onChange={e => setCorrectionCheckOut(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason for Correction</Label>
                <Textarea required value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} rows={2} placeholder="e.g., Face wasn't recognized due to low light" />
              </div>
              <Button type="submit" disabled={submittingCorrection} className="w-full">
                {submittingCorrection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Correction Request
              </Button>
            </form>
          )}

          {corrections.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No correction requests.</p>
          ) : (
            <div className="space-y-2">
              {corrections.map((c: any, index) => (
                <div key={c.id || index} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.date}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.reason}</p>
                  </div>
                  <Badge variant="outline" className={
                    c.status === 'approved' ? 'bg-success/10 text-success border-success/20'
                    : c.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20'
                    : 'bg-warning/10 text-warning border-warning/20'
                  }>
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        {/* Mood Tracker Dialog */}
        <Dialog open={showMoodDialog} onOpenChange={setShowMoodDialog}>
          <DialogContent className="sm:max-w-md text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">How are you feeling today?</DialogTitle>
              <DialogDescription>
                Your well-being matters to us. Let us know how you're starting your day.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center items-center gap-2 sm:gap-4 py-8">
              {[
                { score: 1, emoji: '😫', label: 'Terrible' },
                { score: 2, emoji: '😟', label: 'Bad' },
                { score: 3, emoji: '😐', label: 'Okay' },
                { score: 4, emoji: '🙂', label: 'Good' },
                { score: 5, emoji: '🤩', label: 'Great' }
              ].map((mood) => (
                <button
                  key={mood.score}
                  onClick={() => submitMood(mood.score)}
                  disabled={isSubmittingMood}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-muted transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                >
                  <span className="text-4xl">{mood.emoji}</span>
                  <span className="text-xs font-medium text-muted-foreground">{mood.label}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
