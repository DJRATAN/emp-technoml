import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, CheckCircle2, AlertTriangle, Loader2, Clock, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { haversineMeters, getCurrentPosition, formatTime } from '@/lib/helpers';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from 'sonner';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const [t, h] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', todayStr).maybeSingle(),
      supabase.from('attendance').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(10),
    ]);
    setToday(t.data); setHistory(h.data ?? []);
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
      setStep('locating');
      const pos = await getCurrentPosition();
      const dist = haversineMeters(pos.coords.latitude, pos.coords.longitude, settings.office_latitude, settings.office_longitude);
      const verified = dist <= settings.geofence_radius_m;
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, distance: dist, verified });
      
      if (!verified) {
        setError(`You are ${Math.round(dist)}m from office. Move within ${settings.geofence_radius_m}m to mark attendance.`);
        setStep('idle'); return;
      }

      setStep('camera');
      if (!window.isSecureContext) {
        throw new Error('Camera requires a secure connection (HTTPS or localhost). Please check your URL.');
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access. Please use Chrome, Safari, or Firefox.');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } } });
      } catch (err) {
        console.warn('Primary camera constraints failed, trying fallback...', err);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      
      setTimeout(() => { 
        if (videoRef.current) { 
          videoRef.current.srcObject = stream; 
          videoRef.current.play().catch((e) => {
            console.error('Camera play error:', e);
            setError('Could not start camera feed. Please check if another app is using the camera.');
            setStep('idle');
          }); 
        } 
      }, 50);
    } catch (e: any) {
      console.error('Attendance error details:', e);
      let msg = e?.message || 'Failed to start.';
      
      // Explicitly check for Geolocation errors
      const isLocationError = step === 'locating' || (e instanceof GeolocationPositionError) || e?.code === 1 || e?.code === 2 || e?.code === 3;
      
      if (isLocationError) {
        if (e?.code === 1 || e?.message?.includes('denied')) {
          msg = 'Location access denied. Please click the lock icon in the address bar and allow Location.';
        } else if (e?.code === 3 || e?.message?.includes('timeout')) {
          msg = 'Location request timed out. Please ensure you have a clear view of the sky or use a stable Wi-Fi.';
        } else {
          msg = 'Could not determine your location. Please check your GPS settings.';
        }
      } else {
        // Camera errors
        if (e?.name === 'NotAllowedError' || e?.message?.includes('denied')) {
          msg = 'Camera access denied. Please click the lock icon in the address bar and allow Camera.';
        } else if (e?.name === 'NotFoundError' || e?.name === 'DevicesNotFoundError') {
          msg = 'No camera found. Please connect a webcam.';
        } else if (e?.name === 'NotReadableError' || e?.name === 'TrackStartError') {
          msg = 'Camera is already in use by another app.';
        }
      }
      
      setError(msg);
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
      const { error: insErr } = await supabase.from('attendance').insert({
        user_id: user.id, date: dateStr, check_in: today.toISOString(), selfie_path: filename,
        latitude: position.lat, longitude: position.lng, distance_m: Math.round(position.distance),
        location_verified: true, status,
      });
      if (insErr) throw insErr;
      toast.success('Attendance marked successfully!');
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoBlob(null); setPhotoUrl(null);
      await loadData(); setStep('idle');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to submit'); setStep('preview');
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
                  <div><p className="text-sm text-muted-foreground">Status</p><StatusBadge status={today.status === 'late' ? 'late' : 'present'} /></div>
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
                  <div className="mt-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm space-y-2">
                    <div className="flex items-start gap-2 text-left">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
                    </div>
                    {window.location.hostname === 'localhost' && (
                      <Button variant="ghost" size="sm" className="w-full text-xs hover:bg-destructive/5" 
                        onClick={() => {
                          setError(null);
                          setStep('camera');
                          setPosition({ lat: settings.office_latitude, lng: settings.office_longitude, distance: 0, verified: true });
                        }}>
                        Skip verification (Demo Mode)
                      </Button>
                    )}
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
                  {history.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">{r.date}</td>
                      <td className="py-3 pr-4">{formatTime(r.check_in)}</td>
                      <td className="py-3 pr-4">{formatTime(r.check_out)}</td>
                      <td className="py-3 pr-4">{r.distance_m ?? '—'}m</td>
                      <td className="py-3"><StatusBadge status={r.status === 'late' ? 'late' : r.status === 'absent' ? 'absent' : 'present'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
