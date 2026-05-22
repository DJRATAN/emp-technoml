import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Sparkles, Send, Bot, TrendingUp, AlertTriangle, Lightbulb, Users, Compass } from 'lucide-react';
import { toast } from 'sonner';

interface SimulatedRisk {
  id: string;
  name: string;
  department: string;
  burnoutRisk: number; // 0-100
  flightRisk: number; // 0-100
  satisfaction: number; // 0-100
  recommendation: string;
}

const RISKS_SAMPLE: SimulatedRisk[] = [
  {
    id: '1',
    name: 'Sarah Connor',
    department: 'Engineering',
    burnoutRisk: 82,
    flightRisk: 65,
    satisfaction: 45,
    recommendation: 'Sarah has logged 15 hours of overtime this week. Suggest scheduling a 1-on-1 and offering a wellness day off.'
  },
  {
    id: '2',
    name: 'John Doe',
    department: 'Marketing',
    burnoutRisk: 40,
    flightRisk: 78,
    satisfaction: 52,
    recommendation: 'John is showing lower engagement rates on team milestones. Recommend assigning a new project lead role to boost career growth.'
  },
  {
    id: '3',
    name: 'Alex Mercer',
    department: 'Sales',
    burnoutRisk: 91,
    flightRisk: 88,
    satisfaction: 30,
    recommendation: 'Critical: High work stress detected from sentiment check-ins. Suggest immediate compensation adjustment review or role shift.'
  }
];

const PRESETS = [
  "Summarize overall company health and burnout risk",
  "Generate a retention strategy for Alex Mercer",
  "Predict attendance trends for the next quarter",
  "How can we boost satisfaction in the Engineering team?"
];

export default function AdminAIAnalytics() {
  const { user } = useAuth();
  const { features } = useCompanyFeatures();
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string>('Welcome to WorkWise AI Studio. Ask me anything about your team\'s metrics, burnout risks, or optimization advice.');
  const [typing, setTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'risks'>('overview');

  const handleAskAI = (question: string) => {
    if (!question.trim()) return;
    setTyping(true);
    setResponse('');
    
    // Simulated AI response generation based on standard queries
    setTimeout(() => {
      let ans = '';
      const q = question.toLowerCase();
      if (q.includes('burnout') || q.includes('health')) {
        ans = "### Company Burnout & Health Summary\n" +
              "Based on attendance regularity, tasks completion time, and leave trends:\n\n" +
              "1. **Overall Risk Index**: Moderate (54/100)\n" +
              "2. **Critical Areas**: **Sales** and **Engineering** departments show increased overtime logs (+18% above standard hours).\n" +
              "3. **Actions Required**: Introduce strict overtime warning alerts in Settings, and encourage the use of casual leave allowances.";
      } else if (q.includes('alex') || q.includes('mercer')) {
        ans = "### Targeted Retention Plan: Alex Mercer (Sales)\n" +
              "**Risk Profile**: Extremely High (Burnout: 91%, Flight Risk: 88%)\n\n" +
              "**Immediate Recommendations**:\n" +
              "- **Compensatory Rest**: Alex hasn't taken a day off in 42 workdays. Prompt them to utilize 2 days of casual leave.\n" +
              "- **Compensation Sync**: A review of recent commissions shows a discrepancy compared to target milestones. Sync with Payroll.\n" +
              "- **Action**: Set up a 1-to-1 sync immediately to address work-life balance.";
      } else if (q.includes('attendance') || q.includes('predict')) {
        ans = "### Attendance Predictions (Next Quarter)\n" +
              "- **Projected Attendance Rate**: 94.2% (Historical baseline: 92.5%)\n" +
              "- **Seasonal Factors**: Leave requests are expected to peak in December (Winter holiday season). Suggest setting leave approval limits.\n" +
              "- **SLA Warning**: Expect average ticket response time in helpdesk to slip due to reduced personnel during the upcoming holiday period.";
      } else if (q.includes('satisfaction') || q.includes('engineering')) {
        ans = "### Engineering Satisfaction Booster\n" +
              "Eng metrics show that while output remains high, team sentiment is dipping due to lack of peer validation:\n\n" +
              "1. **Activate Kudos Wall**: Encourage engineering managers to send at least 2 Kudos weekly to highlight silent contributors.\n" +
              "2. **Hackathons**: Dedicate 10% of engineering time to self-directed innovation projects.\n" +
              "3. **Equipment Upgrade**: Re-check hardware tickets in the Helpdesk and resolve outstanding upgrades.";
      } else {
        ans = `### WorkWise Insights Engine\n\nI analyzed your query: "${question}" and crossed it with your tenant databases.\n\nCurrently, the organization is running optimally with **${features?.tasks_enabled ? 'Tasks Management active' : 'Tasks Management inactive'}** and **${features?.kudos_enabled ? 'Kudos Recognition active' : 'Kudos Recognition inactive'}**. Sentiment maps suggest stable performance, but check-ins should be maintained on a weekly cadence to ensure flight risk projections do not increase.`;
      }

      // Simulate typing effect
      let currentLength = 0;
      const interval = setInterval(() => {
        setResponse(ans.slice(0, currentLength));
        currentLength += 5;
        if (currentLength >= ans.length + 5) {
          clearInterval(interval);
          setTyping(false);
        }
      }, 15);
    }, 1000);
  };

  if (!features?.ai_analytics_enabled) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-semibold">AI Analytics</h1>
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
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-8 border border-white/10 shadow-2xl">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-violet-600/30 rounded-full blur-3xl" />
          <div className="absolute left-1/3 bottom-0 translate-y-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30 text-xs font-semibold">
                <Brain className="h-3.5 w-3.5 text-violet-400" /> Advanced AI Analytics
              </div>
              <h1 className="text-3xl font-heading font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-200 via-indigo-200 to-blue-100">
                Predictive Org Insights
              </h1>
              <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
                Utilize intelligent machine learning models to monitor employee burnout, predict flight risk, and receive customized retention suggestions.
              </p>
            </div>
            <Bot className="h-20 w-20 text-violet-400 animate-pulse hidden md:block" />
          </div>
        </div>

        {/* View Selection */}
        <div className="flex gap-2 border-b pb-1">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('overview')}
            className="rounded-t-lg rounded-b-none border-b-2 border-transparent h-10 px-4"
          >
            AI Insight Studio
          </Button>
          <Button
            variant={activeTab === 'risks' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('risks')}
            className="rounded-t-lg rounded-b-none border-b-2 border-transparent h-10 px-4"
          >
            Flight & Burnout Risks
          </Button>
        </div>

        {/* Studio View */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Terminal Panel */}
            <Card className="lg:col-span-2 flex flex-col min-h-[500px] border-violet-500/20 shadow-md">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-5 w-5 text-violet-500" />
                  WorkWise Copilot
                </CardTitle>
                <CardDescription>Ask questions, analyze trends, or request retention drafts.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4 space-y-4 justify-between bg-slate-900/5 dark:bg-slate-950/20">
                {/* Chat window */}
                <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-sm leading-relaxed whitespace-pre-wrap border border-slate-800 shadow-inner max-h-[350px]">
                  {typing ? (
                    <div className="flex items-center gap-2 text-violet-400 animate-pulse">
                      <Sparkles className="h-4 w-4 animate-spin" />
                      Analyzing telemetry data...
                    </div>
                  ) : (
                    response
                  )}
                </div>

                {/* Suggestions */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Try asking:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map(p => (
                      <button
                        key={p}
                        onClick={() => { setPrompt(p); handleAskAI(p); }}
                        className="text-xs px-3 py-1.5 rounded-xl border bg-card text-left hover:bg-violet-500/5 hover:border-violet-500/30 transition-all truncate max-w-full"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Bar */}
                <div className="flex gap-2 pt-2 border-t">
                  <input
                    type="text"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Ask WorkWise AI..."
                    onKeyDown={e => e.key === 'Enter' && handleAskAI(prompt)}
                    className="flex-1 h-10 px-4 rounded-xl border bg-card text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                  />
                  <Button
                    onClick={() => handleAskAI(prompt)}
                    disabled={typing || !prompt.trim()}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Metrics */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Predictive Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Overall Retention Likelihood</span>
                      <span className="text-emerald-500">89%</span>
                    </div>
                    <Progress value={89} className="h-2 bg-slate-100 [&>div]:bg-emerald-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Burnout Risk Index</span>
                      <span className="text-amber-500">42%</span>
                    </div>
                    <Progress value={42} className="h-2 bg-slate-100 [&>div]:bg-amber-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Leave SLA Forecast</span>
                      <span className="text-blue-500">96.8%</span>
                    </div>
                    <Progress value={96.8} className="h-2 bg-slate-100 [&>div]:bg-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border-violet-500/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-violet-700 dark:text-violet-400">
                    <Brain className="h-5 w-5" />
                    AI Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="leading-relaxed text-muted-foreground">
                    Telemetry flags a high probability of flight risk in your Sales department due to consecutive travel/live-map updates on weekends.
                  </p>
                  <div className="p-3 bg-card border rounded-xl text-xs font-semibold border-violet-100 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>Recommend enabling the IP Whitelisting module to prevent check-ins during unapproved hours.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Risks View */}
        {activeTab === 'risks' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Critical Risk Radar</CardTitle>
              <CardDescription>Real-time analysis of employees showing high stress indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {RISKS_SAMPLE.map(r => (
                  <div key={r.id} className="p-5 rounded-2xl border bg-card/50 hover:bg-card hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 min-w-0 md:max-w-xs">
                      <div>
                        <h4 className="font-bold text-base">{r.name}</h4>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground uppercase">{r.department}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        {r.recommendation}
                      </p>
                    </div>

                    <div className="flex gap-4 md:gap-8 flex-wrap items-center">
                      <div className="w-24">
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                          <span>Burnout</span>
                          <span className={r.burnoutRisk > 80 ? 'text-destructive' : 'text-amber-500'}>{r.burnoutRisk}%</span>
                        </div>
                        <Progress value={r.burnoutRisk} className={`h-1.5 bg-slate-100 ${r.burnoutRisk > 80 ? '[&>div]:bg-destructive' : '[&>div]:bg-amber-500'}`} />
                      </div>

                      <div className="w-24">
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                          <span>Flight Risk</span>
                          <span className={r.flightRisk > 80 ? 'text-destructive' : 'text-amber-500'}>{r.flightRisk}%</span>
                        </div>
                        <Progress value={r.flightRisk} className={`h-1.5 bg-slate-100 ${r.flightRisk > 80 ? '[&>div]:bg-destructive' : '[&>div]:bg-amber-500'}`} />
                      </div>

                      <div className="w-24">
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                          <span>Satisfaction</span>
                          <span className="text-primary">{r.satisfaction}%</span>
                        </div>
                        <Progress value={r.satisfaction} className="h-1.5 bg-slate-100" />
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-violet-500/30 hover:bg-violet-500/5 text-violet-600 font-semibold"
                        onClick={() => {
                          setActiveTab('overview');
                          setPrompt(`Generate a retention strategy for ${r.name}`);
                          handleAskAI(`Generate a retention strategy for ${r.name}`);
                        }}
                      >
                        Action Plan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
