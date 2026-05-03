import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { formatTime } from '@/lib/helpers';

// Fix default marker icon (Leaflet + bundlers)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LiveRow {
  id: string;
  user_id: string;
  check_in: string | null;
  check_out: string | null;
  latitude: number | null;
  longitude: number | null;
  location_verified: boolean;
  distance_m: number | null;
  status: string;
  full_name?: string;
  job_title?: string | null;
}

export default function AdminLiveMap() {
  const { user } = useAuth();
  const { settings } = useCompanySettings();
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const { data: att } = await supabase
      .from('attendance')
      .select('id,user_id,check_in,check_out,latitude,longitude,location_verified,distance_m,status')
      .eq('company_id', user.companyId)
      .eq('date', today);

    const ids = (att ?? []).map(a => a.user_id);
    let profileMap: Record<string, { full_name: string; job_title: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, job_title')
        .in('id', ids);
      profileMap = Object.fromEntries((profs ?? []).map(p => [p.id, { full_name: p.full_name, job_title: p.job_title }]));
    }
    setRows((att ?? []).map(a => ({
      ...a,
      latitude: a.latitude == null ? null : Number(a.latitude),
      longitude: a.longitude == null ? null : Number(a.longitude),
      distance_m: a.distance_m == null ? null : Number(a.distance_m),
      full_name: profileMap[a.user_id]?.full_name ?? 'Unknown',
      job_title: profileMap[a.user_id]?.job_title ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.companyId]);

  // Realtime updates for today's attendance
  useEffect(() => {
    if (!user?.companyId) return;
    const channel = supabase
      .channel('live-map-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `company_id=eq.${user.companyId}` }, () => load())
      .subscribe();
    const interval = setInterval(load, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.companyId]);

  const center = useMemo<[number, number]>(() => {
    if (settings) return [settings.office_latitude, settings.office_longitude];
    return [26.305, 77.616];
  }, [settings]);

  const pinned = rows.filter(r => r.latitude != null && r.longitude != null) as Array<LiveRow & { latitude: number; longitude: number }>;
  const checkedIn = rows.filter(r => r.check_in && !r.check_out).length;
  const checkedOut = rows.filter(r => r.check_out).length;
  const outsideFence = rows.filter(r => !r.location_verified).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold">Live Map</h1>
            <p className="text-sm text-muted-foreground">Real-time view of today's attendance check-ins.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Currently In</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{checkedIn}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Checked Out</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{checkedOut}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outside Geofence</CardTitle></CardHeader><CardContent className="text-3xl font-bold text-destructive">{outsideFence}</CardContent></Card>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[520px] w-full">
              <MapContainer center={center} zoom={15} scrollWheelZoom className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {settings && (
                  <Circle
                    center={[settings.office_latitude, settings.office_longitude]}
                    radius={settings.geofence_radius_m}
                    pathOptions={{ color: 'hsl(217 91% 60%)', fillOpacity: 0.08 }}
                  />
                )}
                {pinned.map((r) => (
                  <Marker key={r.id} position={[r.latitude, r.longitude]}>
                    <Popup>
                      <div className="space-y-1">
                        <div className="font-semibold">{r.full_name}</div>
                        {r.job_title && <div className="text-xs text-muted-foreground">{r.job_title}</div>}
                        <div className="text-xs">In: {formatTime(r.check_in)}{r.check_out ? ` · Out: ${formatTime(r.check_out)}` : ''}</div>
                        <div className="text-xs">
                          {r.location_verified
                            ? <Badge variant="secondary">Inside fence</Badge>
                            : <Badge variant="destructive">Outside ({r.distance_m ? Math.round(r.distance_m) : '?'}m)</Badge>}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
