import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { supabase } from '@/integrations/supabase/client';
import { Cake, Calendar, Gift, Sparkles, MessageCircle, Heart, Search } from 'lucide-react';
import { toast } from 'sonner';

interface BirthdayEmployee {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  date_of_birth: string;
  month: number; // 0-11
  day: number;
  daysUntil: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BirthdaysPage() {
  const { user } = useAuth();
  const { features } = useCompanyFeatures();
  const [employees, setEmployees] = useState<BirthdayEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth());
  const [wished, setWished] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadBirthdays() {
      if (!user?.companyId) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, date_of_birth')
        .eq('company_id', user.companyId)
        .not('date_of_birth', 'is', null);

      if (error) {
        toast.error('Failed to load birthdays: ' + error.message);
        setLoading(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const parsed: BirthdayEmployee[] = (data ?? []).map((p: any) => {
        const dob = new Date(p.date_of_birth);
        const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        
        if (next < today) {
          next.setFullYear(today.getFullYear() + 1);
        }
        
        const diffTime = next.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          date_of_birth: p.date_of_birth,
          month: dob.getMonth(),
          day: dob.getDate(),
          daysUntil: daysUntil === 365 || daysUntil === 366 ? 0 : daysUntil
        };
      });

      // Sort by days until birthday
      parsed.sort((a, b) => a.daysUntil - b.daysUntil);
      setEmployees(parsed);
      setLoading(false);
    }
    
    loadBirthdays();
  }, [user?.companyId]);

  const handleCelebrate = (empId: string, name: string) => {
    setWished(prev => ({ ...prev, [empId]: true }));
    toast.success(`Sent virtual birthday wishes to ${name}! 🎈🧁✨`);
  };

  if (!features?.birthdays_enabled) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-semibold">Birthdays & Events</h1>
        </div>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="py-10 text-center text-muted-foreground">
            This module is disabled for your organization.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const filtered = employees.filter(e => {
    const matchesSearch = e.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesMonth = selectedMonth === 'all' || e.month === selectedMonth;
    return matchesSearch && matchesMonth;
  });

  const upcomingToday = employees.filter(e => e.daysUntil === 0);
  const upcomingSoon = employees.filter(e => e.daysUntil > 0 && e.daysUntil <= 14);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 p-8 border border-primary/10">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl" />
          <div className="absolute left-1/3 bottom-0 translate-y-12 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-600 border border-pink-500/20 text-xs font-semibold">
                <Sparkles className="h-3 w-3" /> Team Milestones
              </div>
              <h1 className="text-3xl font-heading font-bold tracking-tight">Birthdays & Events</h1>
              <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
                Stay connected with your coworkers and celebrate their special days together.
              </p>
            </div>
            
            <Gift className="h-16 w-16 text-pink-500 animate-bounce hidden md:block" />
          </div>
        </div>

        {/* Today's Celebrations */}
        {upcomingToday.length > 0 && (
          <Card className="border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-purple-500/5 shadow-md overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 text-pink-500 opacity-20"><Cake className="h-24 w-24" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-heading text-pink-600 flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-500 animate-pulse" />
                Happening Today! 🎉
              </CardTitle>
              <CardDescription>Don't forget to wish your colleagues a fantastic day!</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {upcomingToday.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-pink-100 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-pink-500/30">
                        <AvatarFallback className="bg-pink-100 text-pink-700 font-bold">{e.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-sm">{e.full_name}</h4>
                        <p className="text-xs text-pink-600 font-medium">Happy Birthday!</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={wished[e.id] ? "outline" : "default"}
                      className={wished[e.id] ? "" : "bg-pink-500 hover:bg-pink-600 text-white"}
                      onClick={() => handleCelebrate(e.id, e.full_name)}
                    >
                      {wished[e.id] ? <Heart className="h-4 w-4 fill-pink-500 text-pink-500" /> : <Gift className="h-4 w-4 mr-1" />}
                      {wished[e.id] ? 'Wished' : 'Celebrate'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee birthdays..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={selectedMonth === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedMonth('all')}
              className="rounded-full text-xs"
            >
              All Year
            </Button>
            {MONTH_NAMES.map((m, idx) => (
              <Button
                key={m}
                size="sm"
                variant={selectedMonth === idx ? 'default' : 'outline'}
                onClick={() => setSelectedMonth(idx)}
                className="rounded-full text-xs whitespace-nowrap"
              >
                {m.slice(0, 3)}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid and listings */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main List */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedMonth === 'all' ? 'All Team Birthdays' : `${MONTH_NAMES[selectedMonth as number]} Birthdays`}
                </CardTitle>
                <CardDescription>Filtered list of employee birthdays</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="py-12 text-center text-muted-foreground">Loading birthdays...</div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No birthdays found matching filters.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filtered.map(e => (
                      <div key={e.id} className="flex items-center gap-3 p-3.5 rounded-xl border bg-card/50 hover:border-pink-500/20 hover:bg-pink-500/5 transition-all group">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{e.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate group-hover:text-pink-600 transition-colors">{e.full_name}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-pink-500" />
                            {MONTH_NAMES[e.month]} {e.day}
                          </p>
                        </div>
                        <div className="text-right">
                          {e.daysUntil === 0 ? (
                            <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-bold">Today</span>
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono">in {e.daysUntil}d</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Panel: Next 14 Days */}
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-500" />
                  Upcoming Soon
                </CardTitle>
                <CardDescription>Birthdays within next 14 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-center text-muted-foreground">Loading...</div>
                ) : upcomingSoon.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No birthdays in the next 14 days.</p>
                ) : (
                  upcomingSoon.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-dashed hover:border-purple-300 transition-all">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-purple-100 text-purple-700 text-xs font-bold">{e.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-semibold">{e.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{MONTH_NAMES[e.month]} {e.day}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-purple-600 font-mono">in {e.daysUntil} days</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
