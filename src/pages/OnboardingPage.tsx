import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, User, Lock, Camera, CheckCircle2 } from 'lucide-react';
import { useRef } from 'react';

export default function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [onboardStep, setOnboardStep] = useState(1); // 1: Password, 2: Face Enrollment
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  useEffect(() => {
    async function verify() {
      if (!token) return setLoading(false);
      const { data, error } = await supabase
        .from('invitations' as any)
        .select('*, companies(name)')
        .eq('token', token)
        .single() as any;
      
      if (error || !data) {
        toast.error('Invalid or expired invitation link');
        return setLoading(false);
      }
      
      setInvitation(data);
      setLoading(false);
    }
    verify();
  }, [token]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      toast.error('Could not access camera');
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setPhotoBlob(blob);
      setPhotoUrl(URL.createObjectURL(blob));
      streamRef.current?.getTracks().forEach(t => t.stop());
    }, 'image/jpeg', 0.85);
  }

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    if (!invitation || !token || !photoBlob) return;
    
    setSubmitting(true);
    try {
      // 1. Sign up the user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          data: {
            full_name: invitation.full_name,
            department: invitation.department,
            job_title: invitation.job_title,
            company_id: invitation.company_id
          }
        }
      });
      
      if (authErr) throw authErr;
      if (!authData.user) throw new Error('Signup failed');

      // 2. Upload baseline face photo
      const filename = `${authData.user.id}/baseline.jpg`;
      await supabase.storage.from('avatars').upload(filename, photoBlob, { contentType: 'image/jpeg' });

      // 3. Mark invitation as used
      await supabase.from('invitations' as any).update({ used_at: new Date().toISOString() } as any).eq('token', token);

      // 4. Update profile status to approved
      await supabase.from('profiles').update({ 
        status: 'approved',
        avatar_url: filename
      }).eq('id', authData.user.id);

      toast.success('Onboarding complete! Welcome to the team.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!invitation) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Invalid Invitation</h1>
        <p className="text-muted-foreground mb-6">This link is either invalid, expired, or has already been used.</p>
        <Button onClick={() => navigate('/')} className="w-full">Go to Home</Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <Card className="max-w-md w-full p-8 shadow-elegant">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 text-primary mb-4">
            {onboardStep === 1 ? <ShieldCheck className="h-8 w-8" /> : <Camera className="h-8 w-8" />}
          </div>
          <h1 className="text-2xl font-bold">{onboardStep === 1 ? 'Secure Onboarding' : 'Face Enrollment'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {onboardStep === 1 
              ? <>Welcome to <span className="font-semibold text-foreground">{invitation.companies?.name}</span></>
              : 'Enroll your face for biometeric attendance.'}
          </p>
        </div>

        {onboardStep === 1 ? (
          <form onSubmit={(e) => { e.preventDefault(); setOnboardStep(2); startCamera(); }} className="space-y-6">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input disabled value={invitation.full_name} className="pl-9 bg-muted" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input disabled value={invitation.email} className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pass">Create Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="pass" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" minLength={6} />
              </div>
              <p className="text-[10px] text-muted-foreground">Minimum 6 characters. This will be your account password.</p>
            </div>

            <Button type="submit" className="w-full">
              Next: Enroll Face
            </Button>
          </form>
        ) : (
          <div className="space-y-6 text-center">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border-2 border-primary/20">
              {!photoUrl ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
              ) : (
                <img src={photoUrl} className="w-full h-full object-cover mirror" />
              )}
              {!photoUrl && <div className="absolute inset-0 border-2 border-dashed border-white/30 rounded-2xl m-8 pointer-events-none" />}
            </div>

            {!photoUrl ? (
              <Button onClick={capture} className="w-full h-12 rounded-xl">
                <Camera className="h-5 w-5 mr-2" /> Capture Enrollment Photo
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-success text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Face Sample Captured
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => { setPhotoUrl(null); startCamera(); }}>Retake</Button>
                  <Button onClick={handleOnboard} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete Setup'}
                  </Button>
                </div>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">This photo will be used as a baseline to verify your attendance daily.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
