import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, Upload, Palette, Cpu, Building2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';
import { getCurrentPosition } from '@/lib/helpers';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DEFAULT_SETTINGS = {
  company_name: '',
  office_latitude: 12.9716,
  office_longitude: 77.5946,
  geofence_radius_m: 200,
  work_start_time: '09:00',
  work_end_time: '18:00',
  late_threshold_minutes: 15,
  annual_leave_quota: 21,
  sick_leave_quota: 10,
  casual_leave_quota: 7,
  leave_approval_sla_hours: 48,
  face_recognition_sensitivity: 50,
  theme_color: '#0ea5e9',
};

interface CompanyOption {
  id: string;
  name: string;
  slug: string;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  
  // Super Admin: company selector state
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // For regular admins, use the hook as before
  const { settings, loading: settingsLoading, refresh } = useCompanySettings();
  
  // Super Admin: manual settings fetch
  const [saSettings, setSaSettings] = useState<any>(null);
  const [saLoading, setSaLoading] = useState(false);

  // Super Admin: Global overview state
  const [allSettings, setAllSettings] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [activeTab, setActiveTab] = useState('config');

  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { log } = useAuditLog();

  // Load companies list for Super Admin
  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoadingCompanies(true);
    supabase.from('companies').select('id, name, slug').order('name').then(({ data }) => {
      setCompanies(data ?? []);
      // Auto-select first company if available
      if (data && data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].id);
      }
      setLoadingCompanies(false);
    });
  }, [isSuperAdmin]);

  // Load settings for selected company (Super Admin)
  useEffect(() => {
    if (!isSuperAdmin || !selectedCompanyId) return;
    setSaLoading(true);
    Promise.all([
      supabase.from('company_settings').select('*').eq('company_id', selectedCompanyId).maybeSingle(),
      supabase.from('companies').select('name, logo_url, theme_color, address, email, phone' as any).eq('id', selectedCompanyId).maybeSingle()
    ]).then(([settingsRes, companyRes]) => {
      if (settingsRes.data) {
        setSaSettings({
          ...settingsRes.data,
          office_latitude: Number(settingsRes.data.office_latitude),
          office_longitude: Number(settingsRes.data.office_longitude),
          logo_url: (companyRes.data as any)?.logo_url,
          theme_color: (companyRes.data as any)?.theme_color,
          address: (companyRes.data as any)?.address,
          email: (companyRes.data as any)?.email,
          phone: (companyRes.data as any)?.phone,
        });
      } else {
        // Provide defaults if no row exists
        setSaSettings({
          ...DEFAULT_SETTINGS,
          company_id: selectedCompanyId,
          company_name: (companyRes.data as any)?.name || '',
          logo_url: (companyRes.data as any)?.logo_url,
          theme_color: (companyRes.data as any)?.theme_color || DEFAULT_SETTINGS.theme_color,
          address: (companyRes.data as any)?.address || '',
          email: (companyRes.data as any)?.email || '',
          phone: (companyRes.data as any)?.phone || '',
          face_recognition_sensitivity: Number(settingsRes.data?.face_recognition_sensitivity ?? DEFAULT_SETTINGS.face_recognition_sensitivity),
        });
      }
      setSaLoading(false);
    });
  }, [isSuperAdmin, selectedCompanyId]);

  // Load all settings for Global Overview
  useEffect(() => {
    if (!isSuperAdmin || activeTab !== 'global') return;
    setLoadingAll(true);
    supabase.from('company_settings').select('*').then(({ data }) => {
      setAllSettings(data ?? []);
      setLoadingAll(false);
    });
  }, [isSuperAdmin, activeTab]);

  // Set form from the appropriate source
  useEffect(() => {
    if (isSuperAdmin) {
      if (saSettings) setForm({ ...saSettings });
      else setForm(null);
    } else {
      if (settings) setForm({ ...settings });
    }
  }, [isSuperAdmin, settings, saSettings]);

  const isLoading = isSuperAdmin 
    ? (loadingCompanies || saLoading || (companies.length > 0 && !selectedCompanyId)) 
    : settingsLoading;

  if (isLoading) return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></DashboardLayout>;

  // Super Admin with no companies at all
  if (isSuperAdmin && companies.length === 0) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <Building2 className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-xl font-heading font-bold">No Companies Found</h2>
        <p className="text-muted-foreground max-w-md">Create a company first from the Super Admin dashboard to configure its settings.</p>
      </div>
    </DashboardLayout>
  );

  // Super Admin selected a company but it has no settings row yet - REMOVED (now auto-initialized)

  // Regular admin with no company
  if (!isSuperAdmin && !form) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <h2 className="text-xl font-heading font-bold">No Company Settings</h2>
        <p className="text-muted-foreground max-w-md">You are logged in without a specific company association. Contact your administrator.</p>
      </div>
    </DashboardLayout>
  );


  if (!form) return null;

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
      const companyId = isSuperAdmin ? selectedCompanyId : form.company_id;
      
      // 1. Update company branding and name
      const { error: compErr } = await supabase.from('companies').update({
        name: form.company_name,
        logo_url: form.logo_url,
        theme_color: form.theme_color,
        address: form.address,
        email: form.email,
        phone: form.phone,
      } as any).eq('id', companyId);
      if (compErr) throw compErr;

      // 2. Update company settings (using upsert to handle missing rows)
      const { error: setErr } = await supabase.from('company_settings').upsert({
        company_id: companyId,
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
      } as any);
      if (setErr) throw setErr;

      toast.success('Settings saved');
      log('settings.updated', 'settings', companyId, { company_name: form.company_name });
      
      if (!isSuperAdmin) {
        refresh();
      } else {
        // Super Admin: trigger a re-fetch of the saSettings and companies list
        setSaLoading(true);
        const [settingsRes, companyRes] = await Promise.all([
          supabase.from('company_settings').select('*').eq('company_id', companyId).maybeSingle(),
          supabase.from('companies').select('id, name, slug, logo_url, theme_color, address, email, phone' as any).eq('id', companyId).maybeSingle()
        ]);
        
        if (settingsRes.data) {
          setSaSettings({
            ...settingsRes.data,
            office_latitude: Number(settingsRes.data.office_latitude),
            office_longitude: Number(settingsRes.data.office_longitude),
            logo_url: (companyRes.data as any)?.logo_url,
            theme_color: (companyRes.data as any)?.theme_color,
            address: (companyRes.data as any)?.address,
            email: (companyRes.data as any)?.email,
            phone: (companyRes.data as any)?.phone,
          });
        }
        
        // Also refresh the companies list to show the new name
        const { data: allComps } = await supabase.from('companies').select('id, name, slug').order('name');
        if (allComps) setCompanies(allComps);
        
        setSaLoading(false);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const companyId = isSuperAdmin ? selectedCompanyId : form.company_id;
    if (!file || !companyId) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Max logo size is 2MB');

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${companyId}/logo_${Date.now()}.${ext}`;
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

  const selectedCompanyName = isSuperAdmin 
    ? companies.find(c => c.id === selectedCompanyId)?.name 
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-heading font-bold">Settings</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin 
              ? 'Platform-wide tenant configuration and global settings overview.' 
              : 'Company configuration, attendance rules, and leave policy'}
          </p>
        </div>

        {isSuperAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Company Config
              </TabsTrigger>
              <TabsTrigger value="global" className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Global Overview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-6">
              <SuperAdminCompanySelector
                companies={companies}
                selectedCompanyId={selectedCompanyId!}
                onSelect={(id) => {
                  setSelectedCompanyId(id);
                  setForm(null);
                }}
              />
              <div className="max-w-3xl">
                {renderForm()}
              </div>
            </TabsContent>

            <TabsContent value="global">
              <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b">
                  <h3 className="font-heading font-semibold">Global Settings Comparison</h3>
                  <p className="text-xs text-muted-foreground">Overview of attendance and leave policies across all initialized companies.</p>
                </div>
                {loadingAll ? (
                  <div className="p-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Working Hours</TableHead>
                        <TableHead>Late (min)</TableHead>
                        <TableHead>Geofence</TableHead>
                        <TableHead>Annual Leave</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map(c => {
                        const s = allSettings.find(st => st.company_id === c.id);
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              <div>
                                {c.name}
                                <div className="text-[10px] text-muted-foreground font-mono">{c.slug}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {s ? `${s.work_start_time} - ${s.work_end_time}` : <Badge variant="outline">Unconfigured</Badge>}
                            </TableCell>
                            <TableCell>{s?.late_threshold_minutes ?? '-'}</TableCell>
                            <TableCell>{s ? `${s.geofence_radius_m}m` : '-'}</TableCell>
                            <TableCell>{s?.annual_leave_quota ?? '-'}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setSelectedCompanyId(c.id);
                                setActiveTab('config');
                              }}>Manage</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="max-w-3xl">
            {renderForm()}
          </div>
        )}
      </div>
    </DashboardLayout>
  );

  function renderForm() {
    if (!form) return null;
    return (
      <div className="space-y-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-heading font-semibold">Company</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company name</Label>
              <Input value={form.company_name} onChange={(e) => update('company_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Business Email</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Office Address</Label>
              <Input value={form.address || ''} onChange={(e) => update('address', e.target.value)} />
            </div>
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
              <span className="text-xs font-mono text-primary font-bold">{form.face_recognition_sensitivity}%</span>
            </div>
            <Slider 
              value={[form.face_recognition_sensitivity]} 
              min={10} max={90} step={5}
              onValueChange={([v]) => update('face_recognition_sensitivity', v)}
            />
            <p className="text-[10px] text-muted-foreground">Higher sensitivity reduces false check-ins but might require better lighting.</p>
          </div>
        </Card>

        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save All Changes'}
        </Button>
      </div>
    );
  }
}

/** Company selector banner shown to Super Admins */
function SuperAdminCompanySelector({ companies, selectedCompanyId, onSelect }: {
  companies: CompanyOption[];
  selectedCompanyId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="p-4 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="h-4 w-4" />
          <span className="text-sm font-semibold">Super Admin Mode</span>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Label className="text-sm whitespace-nowrap">Configure company:</Label>
          <Select value={selectedCompanyId || undefined} onValueChange={onSelect}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    {c.name}
                    <span className="text-xs text-muted-foreground">({c.slug})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
