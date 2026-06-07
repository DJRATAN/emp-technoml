import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, Clock, CheckSquare, CalendarDays, TrendingUp,
  User, Users, FileBarChart, Settings, Building2, Globe, Target, MapPin,
  Award, MessageSquare, LifeBuoy, ToggleLeft, GitBranch, Megaphone, Mail, HeartPulse, DollarSign, Shield, IdCard,
  ArrowLeftRight
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';

export function AppSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { features, loading } = useCompanyFeatures();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  
  const plan = user?.company?.planType || 'basic';
  const isPro = plan === 'pro' || plan === 'enterprise';
  const isEnterprise = plan === 'enterprise';

  const [viewMode, setViewMode] = useState<'admin' | 'employee'>(() => {
    if (user?.role === 'employee') return 'employee';
    return (localStorage.getItem('sidebar_view_mode') as any) || 'admin';
  });

  useEffect(() => {
    if (user?.role === 'employee') {
      setViewMode('employee');
    }
  }, [user?.role]);

  // Strict visibility helper for database-only flags
  const isEnabled = (key: keyof typeof features) => {
    if (loading) return false;
    return !!features?.[key];
  };

  const employeeMenu = [
    { title: 'Dashboard', url: '/employee', icon: LayoutDashboard, show: true },
    { title: 'Attendance', url: '/employee/attendance', icon: Clock, show: true },
    { title: 'Tasks', url: '/employee/tasks', icon: CheckSquare, show: isEnabled('tasks_enabled') },
    { title: 'My Targets', url: '/employee/targets', icon: Target, show: true },
    { title: 'Leave', url: '/employee/leave', icon: CalendarDays, show: true },
    { title: 'Performance', url: '/employee/performance', icon: TrendingUp, show: true },
    { title: 'Kudos', url: '/employee/kudos', icon: Award, show: isEnabled('kudos_enabled') },
    { title: 'Chat', url: '/employee/chat', icon: MessageSquare, show: isEnabled('chat_enabled') },
    { title: 'Birthdays', url: '/employee/birthdays', icon: CalendarDays, show: isEnabled('birthdays_enabled') },
    { title: 'Office Updates', url: '/employee/inbox', icon: Mail, show: true },
    { title: 'Helpdesk', url: '/employee/helpdesk', icon: LifeBuoy, show: isEnabled('helpdesk_enabled') },
    { title: 'Profile', url: '/employee/profile', icon: User, show: true },
  ].filter(i => i.show);

  const adminMenu = [
    { title: 'Dashboard', url: '/admin', icon: LayoutDashboard, show: true },
    { title: 'Employees', url: '/admin/employees', icon: Users, show: true },
    { title: 'Settings', url: '/admin/settings', icon: Settings, show: true },
    { title: 'Attendance', url: '/admin/attendance', icon: Clock, show: true },
    { title: 'Live Map', url: '/admin/live-map', icon: MapPin, show: true },
    { title: 'Tasks', url: '/admin/tasks', icon: CheckSquare, show: isEnabled('tasks_enabled') },
    { title: 'Targets', url: '/admin/targets', icon: Target, show: true },
    { title: 'Leave Requests', url: '/admin/leave', icon: CalendarDays, show: true },
    { title: 'Helpdesk', url: '/admin/helpdesk', icon: LifeBuoy, show: isEnabled('helpdesk_enabled') },
    { title: 'Chat', url: '/admin/chat', icon: MessageSquare, show: isEnabled('chat_enabled') },
    { title: 'Kudos', url: '/admin/kudos', icon: Award, show: isEnabled('kudos_enabled') },
    { title: 'Birthdays', url: '/admin/birthdays', icon: CalendarDays, show: isEnabled('birthdays_enabled') },
    { title: 'Communication', url: '/admin/communication', icon: Megaphone, show: true },
    { title: 'Wellbeing', url: '/admin/wellbeing', icon: HeartPulse, show: isEnabled('wellbeing_enabled') },
    { title: 'Payroll', url: '/admin/payroll', icon: DollarSign, show: isEnabled('payroll_export_enabled') },
    { title: 'AI Analytics', url: '/admin/ai-analytics', icon: TrendingUp, show: isEnabled('ai_analytics_enabled') },
    { title: 'IP Whitelisting', url: '/admin/ip-whitelist', icon: Globe, show: isEnabled('ip_whitelist_enabled') },
    { title: 'Mock GPS', url: '/admin/mock-gps', icon: MapPin, show: isEnabled('mock_gps_detection_enabled') },
    { title: 'Audit Trail', url: '/admin/audit', icon: Shield, show: true },
    { title: 'Permissions', url: '/admin/permissions', icon: Shield, show: true },
    { title: 'Corrections', url: '/admin/corrections', icon: Clock, show: true },
    { title: 'Approval Chain', url: '/admin/approval-chain', icon: GitBranch, show: isEnabled('multi_level_approvals_enabled') },
    { title: 'Reports', url: '/admin/reports', icon: FileBarChart, show: true },
    { title: 'Features', url: '/admin/features', icon: ToggleLeft, show: true },
  ].filter(i => i.show);

  const superAdminMenu = [
    { title: 'Dashboard', url: '/super-admin', icon: LayoutDashboard },
    { title: 'Companies', url: '/super-admin/companies', icon: Globe },
    { title: 'Settings', url: '/admin/settings', icon: Settings },
    { title: 'My Company', url: '/admin', icon: Building2 },
  ];

  const menu = user?.role === 'super_admin' 
    ? superAdminMenu
    : (user?.role === 'admin' || user?.isOwner) 
      ? (viewMode === 'admin' ? adminMenu : employeeMenu) 
      : employeeMenu;


  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="gap-2 px-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
              {user?.company?.logoUrl ? (
                <img src={supabase.storage.from('company-assets').getPublicUrl(user.company.logoUrl).data.publicUrl} alt="Logo" className="object-contain h-full w-full" />
              ) : (
                <img src="/logo.png" alt="WorkWise" className="h-6 w-6" />
              )}
            </div>
            {!collapsed && (
              <span className="font-heading font-bold text-primary truncate">
                {user?.company?.name ?? 'WorkWise Hub'}
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {/* View Switcher for Admins/Owners */}
            {(user?.role === 'admin' || user?.isOwner) && !collapsed && (
              <div className="px-3 py-2 mb-2 border-b">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-between hover:bg-primary/5 border-primary/20 text-xs font-semibold"
                  onClick={() => {
                    const nextMode = viewMode === 'admin' ? 'employee' : 'admin';
                    setViewMode(nextMode);
                    localStorage.setItem('sidebar_view_mode', nextMode);
                    navigate(nextMode === 'admin' ? '/admin' : '/employee');
                  }}
                >
                  <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    Mode: <span className="text-primary font-bold">{viewMode === 'admin' ? 'Admin Portal' : 'Employee Portal'}</span>
                  </span>
                  <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
                </Button>
              </div>
            )}
            
            {/* Collapsed simple icon toggle */}
            {(user?.role === 'admin' || user?.isOwner) && collapsed && (
              <div className="flex justify-center py-2 mb-2 border-b">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-primary hover:bg-primary/10"
                  title={viewMode === 'admin' ? 'Switch to Employee Portal' : 'Switch to Admin Portal'}
                  onClick={() => {
                    const nextMode = viewMode === 'admin' ? 'employee' : 'admin';
                    setViewMode(nextMode);
                    localStorage.setItem('sidebar_view_mode', nextMode);
                    navigate(nextMode === 'admin' ? '/admin' : '/employee');
                  }}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <SidebarMenu>
              {menu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin' || item.url === '/employee' || item.url === '/super-admin'}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4 bg-sidebar-accent/20">
        {!collapsed ? (
          <div className="flex flex-col gap-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            {user?.employeeId && (
              <p className="text-[10px] font-mono text-primary flex items-center gap-1">
                <IdCard className="h-3 w-3" /> {user.employeeId}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
