import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Plus, Trash2, Globe, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WhitelistIP {
  id: string;
  ip: string;
  label: string;
  created_at: string;
}

interface AccessLog {
  id: string;
  ip: string;
  user: string;
  location: string;
  timestamp: string;
  status: 'allowed' | 'blocked';
}

const DEFAULT_LOGS: AccessLog[] = [
  { id: '1', ip: '192.168.1.1', user: 'Admin User', location: 'HQ Office', timestamp: '2 mins ago', status: 'allowed' },
  { id: '2', ip: '103.54.22.81', user: 'Sarah Connor', location: 'London Remote', timestamp: '1 hour ago', status: 'allowed' },
  { id: '3', ip: '45.112.5.30', user: 'John Doe', location: 'Unknown IP (VPN)', timestamp: '3 hours ago', status: 'blocked' },
  { id: '4', ip: '192.168.1.55', user: 'Alex Mercer', location: 'HQ Office', timestamp: '5 hours ago', status: 'allowed' }
];

export default function AdminIPWhitelist() {
  const { user } = useAuth();
  const { features } = useCompanyFeatures();
  const [ips, setIps] = useState<WhitelistIP[]>([]);
  const [newIp, setNewIp] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [enforced, setEnforced] = useState(false);
  const [logs, setLogs] = useState<AccessLog[]>(DEFAULT_LOGS);

  // Load from localStorage for local persistence
  useEffect(() => {
    if (!user?.companyId) return;
    
    const savedIps = localStorage.getItem(`ww_ip_whitelist_${user.companyId}`);
    if (savedIps) {
      setIps(JSON.parse(savedIps));
    } else {
      const defaultIps: WhitelistIP[] = [
        { id: '1', ip: '192.168.1.1', label: 'Office Main Gateway', created_at: new Date().toISOString() },
        { id: '2', ip: '103.54.22.81', label: 'Sarah Primary Remote', created_at: new Date().toISOString() }
      ];
      setIps(defaultIps);
      localStorage.setItem(`ww_ip_whitelist_${user.companyId}`, JSON.stringify(defaultIps));
    }

    const savedEnforced = localStorage.getItem(`ww_ip_enforce_${user.companyId}`);
    if (savedEnforced) {
      setEnforced(JSON.parse(savedEnforced));
    }
  }, [user?.companyId]);

  const handleAddIP = () => {
    if (!newIp.trim() || !newLabel.trim() || !user?.companyId) {
      toast.error('Please enter both an IP Address and a Label');
      return;
    }
    
    // IP format verification
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/\d{1,2})?$/;
    if (!ipRegex.test(newIp.trim())) {
      toast.error('Invalid IPv4 or CIDR format');
      return;
    }

    const newItem: WhitelistIP = {
      id: Date.now().toString(),
      ip: newIp.trim(),
      label: newLabel.trim(),
      created_at: new Date().toISOString()
    };

    const updated = [...ips, newItem];
    setIps(updated);
    localStorage.setItem(`ww_ip_whitelist_${user.companyId}`, JSON.stringify(updated));
    
    setNewIp('');
    setNewLabel('');
    toast.success('IP Address whitelisted successfully');
  };

  const handleRemoveIP = (id: string) => {
    if (!user?.companyId) return;
    const updated = ips.filter(item => item.id !== id);
    setIps(updated);
    localStorage.setItem(`ww_ip_whitelist_${user.companyId}`, JSON.stringify(updated));
    toast.success('IP Address removed from whitelist');
  };

  const handleToggleEnforce = (val: boolean) => {
    if (!user?.companyId) return;
    setEnforced(val);
    localStorage.setItem(`ww_ip_enforce_${user.companyId}`, JSON.stringify(val));
    toast.success(val ? 'IP Whitelist restrictions enforced strictly!' : 'IP Whitelist restrictions paused.');
    
    // Add a log entry dynamically
    const newLog: AccessLog = {
      id: Date.now().toString(),
      ip: user?.email || '127.0.0.1',
      user: user?.name || 'System Admin',
      location: 'Web Console',
      timestamp: 'Just now',
      status: 'allowed'
    };
    setLogs(prev => [newLog, ...prev]);
  };

  if (!features?.ip_whitelist_enabled) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-semibold">IP Whitelisting</h1>
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 p-8 border border-primary/10">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-sky-400/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/20 text-xs font-semibold">
                <Globe className="h-3.5 w-3.5" /> Network Access Security
              </div>
              <h1 className="text-3xl font-heading font-bold tracking-tight">IP Whitelisting</h1>
              <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
                Restrict attendance logs and account access to trusted networks (e.g. corporate VPNs or specific office locations).
              </p>
            </div>
            
            <Shield className="h-16 w-16 text-sky-500 hidden md:block" />
          </div>
        </div>

        {/* Configurations */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Settings and Add Rule */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-sky-500/20 shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Strict Enforcements</CardTitle>
                <CardDescription>Configure strict network checking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="enforce-whitelist" className="font-semibold text-sm cursor-pointer">Enforce Whitelist</Label>
                    <p className="text-[10px] text-muted-foreground">Block check-ins outside rules</p>
                  </div>
                  <Switch
                    id="enforce-whitelist"
                    checked={enforced}
                    onCheckedChange={handleToggleEnforce}
                  />
                </div>

                <div className="p-3.5 bg-sky-500/5 rounded-xl border border-sky-500/10 flex gap-2 text-xs leading-relaxed text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                  <span>
                    When enabled, employees will be blocked from checking in if their network IP is not listed on the right.
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Allowed IP</CardTitle>
                <CardDescription>Whitelist a new network rule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">IP Address / CIDR</label>
                  <input
                    type="text"
                    value={newIp}
                    onChange={e => setNewIp(e.target.value)}
                    placeholder="e.g. 192.168.1.1 or 10.0.0.0/24"
                    className="w-full h-10 px-3 rounded-xl border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">Identifier Label</label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="e.g. Headquarters Office Gateway"
                    className="w-full h-10 px-3 rounded-xl border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <Button onClick={handleAddIP} className="w-full bg-sky-600 hover:bg-sky-700 text-white">
                  <Plus className="h-4 w-4 mr-1.5" /> Whitelist IP
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Table / Whitelisted IPs */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Whitelisted Gateway Routes ({ips.length})</CardTitle>
                <CardDescription>Currently authorized IP networks</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {ips.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No IP whitelist definitions found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-muted/40 text-muted-foreground tracking-wider border-y">
                        <tr>
                          <th className="px-6 py-3.5">IP Address</th>
                          <th className="px-6 py-3.5">Label</th>
                          <th className="px-6 py-3.5">Created</th>
                          <th className="px-6 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ips.map(ip => (
                          <tr key={ip.id} className="hover:bg-muted/10">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{ip.ip}</td>
                            <td className="px-6 py-4 font-medium">{ip.label}</td>
                            <td className="px-6 py-4 text-xs text-muted-foreground">{new Date(ip.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleRemoveIP(ip.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-5 w-5 text-sky-500" />
                  Recent Connectivity Logs
                </CardTitle>
                <CardDescription>Telemetry monitoring access attempts</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/40 text-muted-foreground tracking-wider border-y">
                      <tr>
                        <th className="px-6 py-3">IP Address</th>
                        <th className="px-6 py-3">Employee</th>
                        <th className="px-6 py-3">Location</th>
                        <th className="px-6 py-3">Time</th>
                        <th className="px-6 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {logs.map(log => (
                        <tr key={log.id} className="hover:bg-muted/10">
                          <td className="px-6 py-3 font-mono font-medium">{log.ip}</td>
                          <td className="px-6 py-3 font-semibold">{log.user}</td>
                          <td className="px-6 py-3 text-muted-foreground">{log.location}</td>
                          <td className="px-6 py-3 text-muted-foreground">{log.timestamp}</td>
                          <td className="px-6 py-3 text-right">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                              log.status === 'allowed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                            }`}>
                              {log.status === 'allowed' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
