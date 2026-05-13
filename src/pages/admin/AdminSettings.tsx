import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, Upload, Palette, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';
import { getCurrentPosition } from '@/lib/helpers';
import { Slider } from '@/components/ui/slider';

export default function AdminSettings() {
  const { settings, loading: settingsLoading, refresh } = useCompanySettings();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { log } = useAuditLog();

  useEffect(() => { if (settings) setForm({ ...settings }); }, [settings]);

  if (settingsLoading) return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></DashboardLayout>;
  if (!form) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <h2 className="text-xl font-heading font-bold">No Company Settings</h2>
        <p className="text-muted-foreground max-w-md">You are logged in as a Super Admin without a specific company association. Navigate to a company's admin panel to configure its settings.</p>
      </div>
    </DashboardLayout>
  );

  function update<K extends keyof typeof form>(key: K, val: any) {
    setForm({ ...form, [key]: val });
  }

  async function useMyLocation() {
    try {
      const pos = await getCurrentPosition();
      update('office_latitude', pos.coords.latitude);
      update('office_longitude', pos.coords.longitude);
      toast.success('Location captured. Click Save to apply.');
    } catch (e: any) { toast.error(e?.message ?? 'Failed to get location'); }
  }

  async function save() {
    setSaving(true);
    try {
      // 1. Update company branding
      const { error: compErr } = await supabase.from('companies').update({
        logo_url: form.logo_url,
        theme_color: form.theme_color,
      } as any).eq('id', form.company_id);
      if (compErr) throw compErr;

      // 2. Update company settings
      const { error: setErr } = await supabase.from('company_settings').update({
        company_name: form.company_name,
        office_latitude: Number(form.office_latitude),
        office_longitude: Number(form.office_longitude),
        geofence_radius_m: Number(form.geofence_radius_m),
        work_start_time: form.work_start_time,
        work_end_time: form.work_end_time,
        late_threshold_minutes: Number(form.late_threshold_minutes),
        annual_leave_quota: Number(form.annual_leave_quota),
        sick_leave_quota: Number(form.sick_leave_quota),
        casual_leave_quota: Number(form.casual_leave_quota),
        leave_approval_sla_hours: Number(form.leave_approval_sla_hours),
        face_recognition_sensitivity: Number(form.face_recognition_sensitivity),
      } as any).eq('company_id', form.company_id);
      if (setErr) throw setErr;

      toast.success('Settings saved');
      log('settings.updated', 'settings', form.company_id, { company_name: form.company_name });
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !form.company_id) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Max logo size is 2MB');

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${form.company_id}/logo_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('company-assets').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

      if (upErr) {
        const isBucketMissing =
          upErr.message?.toLowerCase().includes('bucket') ||
          upErr.message?.toLowerCase().includes('not found') ||
          (upErr as any)?.statusCode === 404;

        if (isBucketMissing) {
          toast.error(
            'Storage bucket missing. Run migration 20260507030000_company_assets_bucket.sql in Supabase SQL Editor.',
            { duration: 8000 }
          );
        } else {
          toast.error(upErr.message);
        }
        return;
      }

      update('logo_url', path);
      toast.success('Logo uploaded. Click Save to apply.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-heading font-bold">Settings</h1>
          <p className="text-muted-foreground">Company configuration, attendance rules, and leave policy</p>
        </div>

        <Card className="p-6 space-y-4">
          <h3 className="font-heading font-semibold">Company</h3>
          <div className="space-y-2">
            <Label>Company name</Label>
            <Input value={form.company_name} onChange={(e) => update('company_name', e.target.value)} />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-heading font-semibold flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Tenant Branding</h3>
          <p className="text-xs text-muted-foreground">Upload your company logo and choose a primary theme color.</p>
          
          <div className="flex items-center gap-6 pt-2">
            <div className="h-16 w-16 rounded-xl border bg-muted flex items-center justify-center overflow-hidden">
              {form.logo_url ? (
                <img src={`${supabase.storage.from('company-assets').getPublicUrl(form.logo_url).data.publicUrl}`} alt="Logo" className="object-contain h-full w-full" />
              ) : (
                <span className="text-[10px] text-muted-foreground px-2 text-center">No Logo</span>
              )}
            </div>
            <div className="space-y-2">
              <input type="file" id="logo-up" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              <Button variant="outline" size="sm" onClick={() => document.getElementById('logo-up')?.click()} disabled={uploadingLogo}>
                {uploadingLogo ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Upload className="h-3 w-3 mr-2" />}
                Change Logo
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-w-[200px]">
            <Label>Theme Color</Label>
            <div className="flex gap-2">
              <Input type="color" className="h-9 w-12 p-0 border-none bg-transparent" value={form.theme_color ?? '#0ea5e9'} onChange={(e) => update('theme_color', e.target.value)} />
              <Input value={form.theme_color ?? '#0ea5e9'} onChange={(e) => update('theme_color', e.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold">Office Location & Geo-fence</h3>
            <Button variant="outline" size="sm" onClick={useMyLocation}><MapPin className="h-3 w-3 mr-1" />Use my location</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Latitude</Label><Input type="number" step="0.000001" value={form.office_latitude} onChange={(e) => update('office_latitude', e.target.value)} /></div>
            <div className="space-y-2"><Label>Longitude</Label><Input type="number" step="0.000001" value={form.office_longitude} onChange={(e) => update('office_longitude', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Geo-fence radius (meters)</Label><Input type="number" min={50} value={form.geofence_radius_m} onChange={(e) => update('geofence_radius_m', e.target.value)} /></div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-heading font-semibold">Working Hours</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Start time</Label><Input type="time" value={form.work_start_time} onChange={(e) => update('work_start_time', e.target.value)} /></div>
            <div className="space-y-2"><Label>End time</Label><Input type="time" value={form.work_end_time} onChange={(e) => update('work_end_time', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Late threshold (minutes after start)</Label><Input type="number" min={0} value={form.late_threshold_minutes} onChange={(e) => update('late_threshold_minutes', e.target.value)} /></div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-heading font-semibold">Leave Policy (days/year)</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Annual</Label><Input type="number" min={0} value={form.annual_leave_quota} onChange={(e) => update('annual_leave_quota', e.target.value)} /></div>
            <div className="space-y-2"><Label>Sick</Label><Input type="number" min={0} value={form.sick_leave_quota} onChange={(e) => update('sick_leave_quota', e.target.value)} /></div>
            <div className="space-y-2"><Label>Casual</Label><Input type="number" min={0} value={form.casual_leave_quota} onChange={(e) => update('casual_leave_quota', e.target.value)} /></div>
          </div>
          <div className="space-y-2 pt-2 border-t">
            <Label>Leave-approval SLA (hours)</Label>
            <Input type="number" min={1} max={720} value={form.leave_approval_sla_hours ?? 48}
              onChange={(e) => update('leave_approval_sla_hours', e.target.value)} />
            <p className="text-xs text-muted-foreground">Time admins have to review each request. Employees see a countdown until this deadline.</p>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold">AI & Security</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>Face Recognition Sensitivity</Label>
              <span className="text-xs font-mono text-primary font-bold">{Math.round(form.face_recognition_sensitivity * 100)}%</span>
            </div>
            <Slider 
              value={[form.face_recognition_sensitivity * 100]} 
              min={10} max={90} step={5}
              onValueChange={([v]) => update('face_recognition_sensitivity', v / 100)}
            />
            <p className="text-[10px] text-muted-foreground">Higher sensitivity reduces false check-ins but might require better lighting.</p>
          </div>
        </Card>

        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save All Changes'}
        </Button>
      </div>
    </DashboardLayout>
  );
}
