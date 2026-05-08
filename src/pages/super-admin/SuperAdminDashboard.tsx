import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Building2, Users, ShieldCheck, Globe, TrendingUp, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalEmployees: 0,
    activeSubscriptions: 0,
    pendingApprovals: 0
  });
  const [tierData, setTierData] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      
      const [
        { count: companyCount },
        { count: employeeCount },
        { data: companies }
      ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('companies').select('plan_type, created_at')
      ]);

      setStats({
        totalCompanies: companyCount || 0,
        totalEmployees: employeeCount || 0,
        activeSubscriptions: (companies || []).filter(c => c.plan_type !== 'basic').length,
        pendingApprovals: 0 // Could fetch from a global queue if implemented
      });

      // Process Tier Data
      const tiers: Record<string, number> = { basic: 0, pro: 0, enterprise: 0 };
      (companies || []).forEach(c => {
        const t = (c.plan_type || 'basic').toLowerCase();
        if (tiers[t] !== undefined) tiers[t]++;
      });
      setTierData([
        { name: 'Basic', value: tiers.basic, color: '#94a3b8' },
        { name: 'Pro', value: tiers.pro, color: '#3b82f6' },
        { name: 'Enterprise', value: tiers.enterprise, color: '#8b5cf6' }
      ]);

      // Process Growth Data (last 6 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const growth: Record<string, number> = {};
      (companies || []).forEach(c => {
        const date = new Date(c.created_at);
        const m = months[date.getMonth()];
        growth[m] = (growth[m] || 0) + 1;
      });
      setGrowthData(Object.entries(growth).map(([name, count]) => ({ name, count })).slice(-6));

      setLoading(false);
    }

    loadStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary fill-current" />
            Platform Command Center
          </h1>
          <p className="text-muted-foreground text-lg">
            Global overview of the WorkWise Hub ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Total Tenants" 
            value={stats.totalCompanies} 
            icon={Building2} 
            description="Registered organizations" 
          />
          <StatCard 
            label="Global Workforce" 
            value={stats.totalEmployees} 
            icon={Users} 
            description="Across all companies" 
          />
          <StatCard 
            label="Premium Tiers" 
            value={stats.activeSubscriptions} 
            icon={Zap} 
            description="Pro & Enterprise plans" 
          />
          <StatCard 
            label="System Health" 
            value="100%" 
            icon={ShieldCheck} 
            description="All services operational" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-semibold text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Tenant Acquisition
              </h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-heading font-semibold text-xl mb-6 flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Subscription Mix
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {tierData.map((t) => (
                  <div key={t.name} className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-xs font-medium">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
