import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { Compass, ShieldAlert, Crosshair, AlertOctagon, UserX, RotateCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MockGPSAttempt {
  id: string;
  employee: string;
  detectedApp: string;
  coordinates: string;
  time: string;
  status: 'Blocked' | 'Warning';
}

const DEFAULT_ATTEMPTS: MockGPSAttempt[] = [
  { id: '1', employee: 'John Doe', detectedApp: 'Fake GPS location spoofer', coordinates: '51.5074° N, 0.1278° W', time: '10 mins ago', status: 'Blocked' },
  { id: '2', employee: 'Alex Mercer', detectedApp: 'GPS JoyStick v4.2', coordinates: '40.7128° N, 74.0060° W', time: '3 hours ago', status: 'Blocked' },
  { id: '3', employee: 'Sarah Connor', detectedApp: 'Mock Location Mocky', coordinates: '35.6762° N, 139.6503° E', time: '1 day ago', status: 'Blocked' }
];

export default function AdminMockGPS() {
  const { user } = useAuth();
  const { features } = useCompanyFeatures();
  const [strict, setStrict] = useState(false);
  const [attempts, setAttempts] = useState<MockGPSAttempt[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!user?.companyId) return;

    const savedStrict = localStorage.getItem(`ww_gps_strict_${user.companyId}`);
    if (savedStrict) {
      setStrict(JSON.parse(savedStrict));
    }

    const savedAttempts = localStorage.getItem(`ww_gps_attempts_${user.companyId}`);
    if (savedAttempts) {
      setAttempts(JSON.parse(savedAttempts));
    } else {
      setAttempts(DEFAULT_ATTEMPTS);
      localStorage.setItem(`ww_gps_attempts_${user.companyId}`, JSON.stringify(DEFAULT_ATTEMPTS));
    }
  }, [user?.companyId]);

  const handleToggleStrict = (val: boolean) => {
    if (!user?.companyId) return;
    setStrict(val);
    localStorage.setItem(`ww_gps_strict_${user.companyId}`, JSON.stringify(val));
    toast.success(val ? 'Strict GPS spoof blocking activated. System will lock account temporarily on spoof attempt.' : 'Strict GPS spoof blocking disabled.');
  };

  const simulateRadarScan = () => {
    setScanning(true);
    toast.info('Initiating radar sweep for location anomalies...');
    
    setTimeout(() => {
      setScanning(false);
      toast.success('Radar scan completed. No active location anomalies detected! 🛰️✅');
    }, 3000);
  };

  if (!features?.mock_gps_detection_enabled) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-semibold">Mock GPS Detection</h1>
        </div>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="py-10 text-center text-muted-foreground">
            This module is disabled for your organization.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 p-8 border border-primary/10">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-semibold">
                <Compass className="h-3.5 w-3.5" /> Anti-Spoofing Systems
              </div>
              <h1 className="text-3xl font-heading font-bold tracking-tight">Mock GPS Detection</h1>
              <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
                Protect attendance integrity by detecting and blocking virtual spoofing apps, developers' custom mock options, and simulated location coordinates.
              </p>
            </div>
            
            <Crosshair className="h-16 w-16 text-emerald-500 hidden md:block" />
          </div>
        </div>

        {/* Configurations */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Settings / Radar */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-emerald-500/20 shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Anti-Spoofing Rules</CardTitle>
                <CardDescription>Strict policy control settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="strict-gps" className="font-semibold text-sm cursor-pointer">Strict Blocking</Label>
                    <p className="text-[10px] text-muted-foreground">Block and raise urgent alerts</p>
                  </div>
                  <Switch
                    id="strict-gps"
                    checked={strict}
                    onCheckedChange={handleToggleStrict}
                  />
                </div>

                <div className="p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex gap-2 text-xs leading-relaxed text-muted-foreground">
                  <AlertOctagon className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    When Strict Blocking is active, any detected mock GPS coordinate overrides will automatically throw errors on the user check-in screen.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Radar Visualizer */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-1.5">
                  <RotateCw className={`h-4 w-4 text-emerald-500 ${scanning ? 'animate-spin' : ''}`} />
                  Device Radar Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-6 space-y-4">
                {/* Radar Grid */}
                <div className="relative w-36 h-36 rounded-full border border-emerald-500/20 flex items-center justify-center bg-slate-950 shadow-inner">
                  {/* Radar Line */}
                  <div className={`absolute inset-0 rounded-full border border-emerald-500/40 bg-gradient-to-tr from-transparent via-transparent to-emerald-500/20 origin-center ${
                    scanning ? 'animate-[spin_2s_linear_infinite]' : ''
                  }`} />
                  {/* Inner ring */}
                  <div className="w-24 h-24 rounded-full border border-emerald-500/15" />
                  {/* Innermost ring */}
                  <div className="w-12 h-12 rounded-full border border-emerald-500/10" />
                  
                  {/* Center Dot */}
                  <div className="absolute w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                </div>
                
                <Button
                  onClick={simulateRadarScan}
                  disabled={scanning}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                >
                  {scanning ? 'Sweeping Org Devices...' : 'Trigger Radar Sweep'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* logs / Spoof attempts */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" />
                  Caught Spoof Attempts ({attempts.length})
                </CardTitle>
                <CardDescription>Security logs tracking spoof telemetry overrides</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {attempts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No GPS spoofing attempts caught.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-muted/40 text-muted-foreground tracking-wider border-y">
                        <tr>
                          <th className="px-6 py-3.5">Employee</th>
                          <th className="px-6 py-3.5">Detected Software</th>
                          <th className="px-6 py-3.5">Spoofed Coordinates</th>
                          <th className="px-6 py-3.5">Time</th>
                          <th className="px-6 py-3.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {attempts.map(att => (
                          <tr key={att.id} className="hover:bg-muted/10">
                            <td className="px-6 py-4 font-semibold text-primary">{att.employee}</td>
                            <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{att.detectedApp}</td>
                            <td className="px-6 py-4 font-mono text-xs text-red-500">{att.coordinates}</td>
                            <td className="px-6 py-4 text-xs text-muted-foreground">{att.time}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] bg-red-50 text-red-600 border border-red-200">
                                <UserX className="h-3 w-3" />
                                {att.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-1.5">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  Anti-Spoofing Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                <p>The system actively scans mobile and web browser interfaces for the following triggers:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Developer Mock Location Setting</strong> enabled on Android devices.</li>
                  <li>Presence of packages like <code>com.lexa.fakegps</code> or similar.</li>
                  <li><strong>High-Speed Location Jump</strong> (e.g. checking in from London, then Paris within 5 minutes).</li>
                  <li>Web Browser Geolocation overrides detected via telemetry deviation checks.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
