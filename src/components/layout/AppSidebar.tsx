import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, Clock, CheckSquare, CalendarDays, TrendingUp,
  User, Users, FileBarChart, Settings, Building2, Globe, Target, MapPin,
  Award, MessageSquare, LifeBuoy, ToggleLeft, GitBranch, Megaphone, Mail, HeartPulse, DollarSign, Shield
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';

export function AppSidebar() {
  const { user } = useAuth();
  const { features } = useCompanyFeatures();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const employeeMenu = [
    { title: 'Dashboard', url: '/employee', icon: LayoutDashboard, show: true },
    { title: 'Attendance', url: '/employee/attendance', icon: Clock, show: true },
    { title: 'Tasks', url: '/employee/tasks', icon: CheckSquare, show: true },
    { title: 'My Targets', url: '/employee/targets', icon: Target, show: true },
    { title: 'Leave', url: '/employee/leave', icon: CalendarDays, show: true },
    { title: 'Performance', url: '/employee/performance', icon: TrendingUp, show: true },
    { title: 'Kudos', url: '/employee/kudos', icon: Award, show: features?.kudos_enabled !== false },
    { title: 'Chat', url: '/employee/chat', icon: MessageSquare, show: features?.chat_enabled !== false },
    { title: 'Office Updates', url: '/employee/inbox', icon: Mail, show: true },
    { title: 'Helpdesk', url: '/employee/helpdesk', icon: LifeBuoy, show: features?.helpdesk_enabled !== false },
    { title: 'Profile', url: '/employee/profile', icon: User, show: true },
  ].filter(i => i.show);

  const adminMenu = [
    { title: 'Dashboard', url: '/admin', icon: LayoutDashboard, show: true },
    { title: 'Employees', url: '/admin/employees', icon: Users, show: true },
    { title: 'Attendance', url: '/admin/attendance', icon: Clock, show: true },
    { title: 'Live Map', url: '/admin/live-map', icon: MapPin, show: true },
    { title: 'Tasks', url: '/admin/tasks', icon: CheckSquare, show: true },
    { title: 'Targets', url: '/admin/targets', icon: Target, show: true },
    { title: 'Leave Requests', url: '/admin/leave', icon: CalendarDays, show: true },
    { title: 'Helpdesk', url: '/admin/helpdesk', icon: LifeBuoy, show: features?.helpdesk_enabled !== false },
    { title: 'Communication', url: '/admin/communication', icon: Megaphone, show: true },
    { title: 'Wellbeing', url: '/admin/wellbeing', icon: HeartPulse, show: true },
    { title: 'Payroll', url: '/admin/payroll', icon: DollarSign, show: true },
    { title: 'Audit Trail', url: '/admin/audit', icon: Shield, show: true },
    { title: 'Permissions', url: '/admin/permissions', icon: Shield, show: true },
    { title: 'Corrections', url: '/admin/corrections', icon: Clock, show: true },
    { title: 'Approval Chain', url: '/admin/approval-chain', icon: GitBranch, show: true },
    { title: 'Reports', url: '/admin/reports', icon: FileBarChart, show: true },
    { title: 'Features', url: '/admin/features', icon: ToggleLeft, show: true },
    { title: 'Settings', url: '/admin/settings', icon: Settings, show: true },
  ].filter(i => i.show);

  const superAdminMenu = [
    { title: 'Companies', url: '/super-admin', icon: Globe },
    { title: 'My Company', url: '/admin', icon: Building2 },
  ];

  const menu = user?.role === 'super_admin' ? superAdminMenu
    : user?.role === 'admin' ? adminMenu : employeeMenu;


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
    </Sidebar>
  );
}
