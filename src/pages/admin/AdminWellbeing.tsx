import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { HeartPulse, AlertTriangle, Clock, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

type BurnoutRisk = {
  employeeId: string;
  name: string;
  department: string | null;
  riskLevel: 'high' | 'medium' | 'low';
  reasons: string[];
  recentHours: number;
  latestMood: number | null;
};

export default function AdminWellbeing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [averageMood, setAverageMood] = useState<number | null>(null);
  const [moodDistribution, setMoodDistribution] = useState<{ score: number; count: number }[]>([]);
  const [risks, setRisks] = useState<BurnoutRisk[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!user?.companyId) return;

      const todayStr = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      // 1. Fetch Moods for today
      const { data: moods } = await supabase
        .from('employee_moods' as any)
        .select('*, profiles:user_id(full_name, department)')
        .eq('company_id', user.companyId)
        .eq('date', todayStr);

      // 2. Fetch Attendance for last 7 days
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*, profiles:user_id(full_name, department)')
        .eq('company_id', user.companyId)
        .gte('date', sevenDaysAgoStr);

      const mData = (moods as any) ?? [];
      const aData = (attendance as any) ?? [];

      // Calculate Company Average Mood
      if (mData.length > 0) {
        const sum = mData.reduce((acc: number, m: any) => acc + m.score, 0);
        setAverageMood(sum / mData.length);
        
        // Distribution
        const dist = [1, 2, 3, 4, 5].map(score => ({
          score,
          count: mData.filter((m: any) => m.score === score).length
        }));
        setMoodDistribution(dist);
      } else {
        setAverageMood(null);
        setMoodDistribution([1, 2, 3, 4, 5].map(score => ({ score, count: 0 })));
      }

      // Calculate Burnout Risk
      // Group attendance by user
      const userStats = new Map<string, { name: string, dept: string | null, totalHours: number, shifts: number }>();
      
      aData.forEach((att: any) => {
        if (!att.check_in || !att.check_out) return;
        const inTime = new Date(att.check_in).getTime();
        const outTime = new Date(att.check_out).getTime();
        const hours = (outTime - inTime) / (1000 * 60 * 60);

        if (!userStats.has(att.user_id)) {
          userStats.set(att.user_id, {
            name: att.profiles?.full_name || 'Unknown',
            dept: att.profiles?.department,
            totalHours: 0,
            shifts: 0
          });
        }
        const stats = userStats.get(att.user_id)!;
        stats.totalHours += hours;
        stats.shifts += 1;
      });

      const riskList: BurnoutRisk[] = [];

      userStats.forEach((stats, userId) => {
        const avgHours = stats.shifts > 0 ? stats.totalHours / stats.shifts : 0;
        const todayMood = mData.find((m: any) => m.user_id === userId)?.score || null;
        
        const reasons: string[] = [];
        let riskScore = 0;

        if (avgHours > 9.5) {
          reasons.push(`Averaging ${avgHours.toFixed(1)} hrs/shift (Over 9.5)`);
          riskScore += 2;
        } else if (avgHours > 8.5) {
          reasons.push(`Averaging ${avgHours.toFixed(1)} hrs/shift`);
          riskScore += 1;
        }

        if (todayMood !== null && todayMood <= 2) {
          reasons.push(`Reported low mood today (${todayMood}/5)`);
          riskScore += 2;
        }

        if (riskScore > 0) {
          riskList.push({
            employeeId: userId,
            name: stats.name,
            department: stats.dept,
            riskLevel: riskScore >= 3 ? 'high' : riskScore === 2 ? 'medium' : 'low',
            reasons,
            recentHours: avgHours,
            latestMood: todayMood
          });
        }
      });

      // Sort by risk descending
      riskList.sort((a, b) => {
        const riskVal = { high: 3, medium: 2, low: 1 };
        return riskVal[b.riskLevel] - riskVal[a.riskLevel];
      });

      setRisks(riskList);
      setLoading(false);
    }

    loadData();
  }, [user]);

  const getEmojiForScore = (score: number) => {
    if (score >= 4.5) return '🤩';
    if (score >= 3.5) return '🙂';
    if (score >= 2.5) return '😐';
    if (score >= 1.5) return '😟';
    return '😫';
  };

  const getRiskColor = (level: string) => {
    if (level === 'high') return 'bg-destructive/10 text-destructive border-destructive/20';
    if (level === 'medium') return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-rose-500" />
            Wellbeing & Burnout Dashboard
          </h1>
          <p className="text-muted-foreground">AI-driven insights into your team's mental health and workload.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Company Vibe Card */}
          <Card className="p-6 col-span-1 md:col-span-2 flex flex-col justify-center bg-gradient-to-br from-card to-primary/5 border-primary/10">
            <h3 className="font-heading font-semibold text-muted-foreground mb-6">Today's Company Vibe</h3>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="text-center">
                <div className="text-6xl mb-2">
                  {averageMood ? getEmojiForScore(averageMood) : '😴'}
                </div>
                <div className="text-3xl font-bold">
                  {averageMood ? averageMood.toFixed(1) : '-'} <span className="text-lg text-muted-foreground font-normal">/ 5.0</span>
                </div>
                <p className="text-sm font-medium mt-1">Average Mood Score</p>
              </div>

              <div className="flex-1 w-full space-y-3">
                {moodDistribution.slice().reverse().map((dist) => {
                  const max = Math.max(...moodDistribution.map(d => d.count), 1);
                  const percentage = (dist.count / max) * 100;
                  return (
                    <div key={dist.score} className="flex items-center gap-3">
                      <span className="text-lg w-6">{getEmojiForScore(dist.score)}</span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${dist.score >= 4 ? 'bg-success' : dist.score === 3 ? 'bg-primary/50' : 'bg-destructive'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{dist.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-heading font-semibold text-muted-foreground mb-4">Burnout Radar</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-destructive/10 rounded-lg text-destructive"><AlertTriangle className="h-4 w-4" /></div>
                    <span className="font-medium text-sm">High Risk</span>
                  </div>
                  <span className="font-bold text-lg">{risks.filter(r => r.riskLevel === 'high').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-warning/10 rounded-lg text-warning"><TrendingDown className="h-4 w-4" /></div>
                    <span className="font-medium text-sm">Medium Risk</span>
                  </div>
                  <span className="font-bold text-lg">{risks.filter(r => r.riskLevel === 'medium').length}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Risk is calculated based on trailing 7-day average shift lengths ({'>'}9.5 hrs) and self-reported daily moods.
              </p>
            </div>
          </Card>
        </div>

        {/* Burnout Risk List */}
        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-6 flex items-center gap-2">
            Action Required: At-Risk Employees
            <Badge variant="secondary" className="ml-2">{risks.length}</Badge>
          </h3>

          {risks.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
                <HeartPulse className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">Your team is doing great!</h3>
              <p className="text-muted-foreground mt-1">No employees are currently flagged for burnout risk.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {risks.map((risk) => (
                <div key={risk.employeeId} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow">
                  <Avatar className="h-12 w-12 border">
                    <AvatarFallback className="bg-primary/5 text-primary font-bold">
                      {risk.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold truncate">{risk.name}</h4>
                      <Badge variant="outline" className={`uppercase text-[10px] ${getRiskColor(risk.riskLevel)}`}>
                        {risk.riskLevel} Risk
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{risk.department || 'Employee'}</p>
                  </div>

                  <div className="flex-1 bg-muted/30 p-3 rounded-lg border border-border/50 w-full sm:w-auto">
                    <ul className="space-y-1">
                      {risk.reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                          <span className="text-foreground/80">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Latest Mood</p>
                    <div className="text-2xl">
                      {risk.latestMood ? getEmojiForScore(risk.latestMood) : '❔'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
