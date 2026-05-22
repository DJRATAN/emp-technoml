import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Loader2, Search, Download, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type EmployeePayroll = {
  id: string;
  name: string;
  department: string | null;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  overtimeHours: number;
  avgHoursPerDay: number;
  lateDeduction: number;
  overtimeBonus: number;
  netAdjustment: number;
};

export default function AdminPayroll() {
  const { user } = useAuth();
  const { settings } = useCompanySettings();
  const { features } = useCompanyFeatures();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Configurable rates
  const LATE_DEDUCTION_PER_DAY = 200; // INR
  const OVERTIME_RATE_PER_HOUR = 150; // INR
  const STANDARD_HOURS = 8;

  const loadPayroll = useCallback(async () => {
    if (!user?.companyId) return;
    setLoading(true);

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0]; // last day of month

    // Count working days in this month (excluding weekends)
    let workingDays = 0;
    const checkDate = new Date(year, monthNum - 1, 1);
    while (checkDate.getMonth() === monthNum - 1) {
      const day = checkDate.getDay();
      if (day !== 0 && day !== 6) workingDays++;
      checkDate.setDate(checkDate.getDate() + 1);
    }

    const [empRes, attRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, department')
        .eq('company_id', user.companyId).eq('is_active', true).order('full_name'),
      supabase.from('attendance').select('user_id, date, check_in, check_out, status')
        .eq('company_id', user.companyId)
        .gte('date', startDate)
        .lte('date', endDate),
    ]);

    const emps = (empRes.data as any) ?? [];
    const attendance = (attRes.data as any) ?? [];

    const payrollData: EmployeePayroll[] = emps.map((emp: any) => {
      const empAtt = attendance.filter((a: any) => a.user_id === emp.id);
      
      const presentDays = empAtt.length;
      const lateDays = empAtt.filter((a: any) => a.status === 'late').length;
      const absentDays = Math.max(0, workingDays - presentDays);

      // Calculate hours worked
      let totalHours = 0;
      let overtimeHours = 0;
      
      empAtt.forEach((a: any) => {
        if (a.check_in && a.check_out) {
          const hours = (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / (1000 * 60 * 60);
          totalHours += hours;
          if (hours > STANDARD_HOURS) {
            overtimeHours += hours - STANDARD_HOURS;
          }
        }
      });

      const avgHoursPerDay = presentDays > 0 ? totalHours / presentDays : 0;
      const lateDeduction = lateDays * LATE_DEDUCTION_PER_DAY;
      const overtimeBonus = Math.round(overtimeHours * OVERTIME_RATE_PER_HOUR);
      const netAdjustment = overtimeBonus - lateDeduction;

      return {
        id: emp.id,
        name: emp.full_name,
        department: emp.department,
        totalDays: workingDays,
        presentDays,
        lateDays,
        absentDays,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
        lateDeduction,
        overtimeBonus,
        netAdjustment,
      };
    });

    setEmployees(payrollData);
    setLoading(false);
  }, [user?.companyId, month]);

  useEffect(() => { loadPayroll(); }, [loadPayroll]);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    lateDeductions: employees.reduce((s, e) => s + e.lateDeduction, 0),
    overtimeBonuses: employees.reduce((s, e) => s + e.overtimeBonus, 0),
    netAdjustment: employees.reduce((s, e) => s + e.netAdjustment, 0),
    totalLate: employees.reduce((s, e) => s + e.lateDays, 0),
    totalAbsent: employees.reduce((s, e) => s + e.absentDays, 0),
  };

  function exportCSV() {
    const headers = ['Name', 'Department', 'Working Days', 'Present', 'Late', 'Absent', 'Avg Hrs/Day', 'OT Hours', 'Late Deduction (₹)', 'OT Bonus (₹)', 'Net Adjustment (₹)'];
    const rows = employees.map(e => [
      e.name, e.department || '-', e.totalDays, e.presentDays, e.lateDays, e.absentDays,
      e.avgHoursPerDay, e.overtimeHours, e.lateDeduction, e.overtimeBonus, e.netAdjustment
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payroll-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Payroll exported');
  }

  if (!features?.payroll_export_enabled) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold">Payroll Export</h1>
        </div>
        <Card className="border-destructive/20 bg-destructive/5 p-6 text-center text-muted-foreground">
          This module is disabled for your organization.
        </Card>
      </DashboardLayout>
    );
  }

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-emerald-500" />
              Payroll Preview
            </h1>
            <p className="text-muted-foreground">Automated salary adjustments based on attendance data.</p>
          </div>
          <div className="flex items-center gap-3">
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-44" />
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 bg-gradient-to-br from-card to-destructive/5 border-destructive/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-xl"><TrendingDown className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Late Deductions</p>
                <p className="text-xl font-bold">₹{totals.lateDeductions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{totals.totalLate} late arrivals</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-card to-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total OT Bonuses</p>
                <p className="text-xl font-bold">₹{totals.overtimeBonuses.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">for overtime shifts</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-card to-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Payroll Impact</p>
                <p className={`text-xl font-bold ${totals.netAdjustment >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {totals.netAdjustment >= 0 ? '+' : ''}₹{totals.netAdjustment.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{totals.totalAbsent} absences tracked</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Employee Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">Employee Salary Preview</h3>
            <div className="relative w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="pl-9" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-3 pr-4">Employee</th>
                  <th className="py-3 pr-3 text-center">Present</th>
                  <th className="py-3 pr-3 text-center">Late</th>
                  <th className="py-3 pr-3 text-center">Absent</th>
                  <th className="py-3 pr-3 text-center">Avg Hrs</th>
                  <th className="py-3 pr-3 text-center">OT Hrs</th>
                  <th className="py-3 pr-3 text-right">Late Cut</th>
                  <th className="py-3 pr-3 text-right">OT Bonus</th>
                  <th className="py-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {emp.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.department || 'Employee'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <Badge variant="secondary" className="bg-success/10 text-success">{emp.presentDays}/{emp.totalDays}</Badge>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      {emp.lateDays > 0 ? (
                        <Badge variant="secondary" className="bg-warning/10 text-warning">{emp.lateDays}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-center">
                      {emp.absentDays > 0 ? (
                        <Badge variant="secondary" className="bg-destructive/10 text-destructive">{emp.absentDays}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-center font-mono text-xs">{emp.avgHoursPerDay}h</td>
                    <td className="py-3 pr-3 text-center font-mono text-xs">{emp.overtimeHours}h</td>
                    <td className="py-3 pr-3 text-right font-mono text-xs text-destructive">
                      {emp.lateDeduction > 0 ? `-₹${emp.lateDeduction}` : '—'}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-xs text-emerald-600">
                      {emp.overtimeBonus > 0 ? `+₹${emp.overtimeBonus}` : '—'}
                    </td>
                    <td className={`py-3 text-right font-mono text-sm font-bold ${emp.netAdjustment >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {emp.netAdjustment >= 0 ? '+' : ''}₹{emp.netAdjustment}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No employees found.</p>
          )}

          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Late deduction: ₹{LATE_DEDUCTION_PER_DAY}/day · Overtime bonus: ₹{OVERTIME_RATE_PER_HOUR}/hr · Standard shift: {STANDARD_HOURS} hours</span>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
