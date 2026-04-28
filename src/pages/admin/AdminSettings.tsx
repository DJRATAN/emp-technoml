import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentPosition } from '@/lib/helpers';

export default function AdminSettings() {
  const { settings, refresh } = useCompanySettings();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings) setForm({ ...settings }); }, [settings]);

  if (!form) return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></DashboardLayout>;

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
    const { error } = await supabase.from('company_settings').update({
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
    }).eq('company_id', form.company_id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Settings saved');
    refresh();
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

        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save All Changes'}
        </Button>
      </div>
    </DashboardLayout>
  );
}
