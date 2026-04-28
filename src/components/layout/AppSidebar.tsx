import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Clock, CheckSquare, CalendarDays, TrendingUp,
  User, Users, FileBarChart, Settings, LogOut, Building2, Globe, Target
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';

const employeeMenu = [
  { title: 'Dashboard', url: '/employee', icon: LayoutDashboard },
  { title: 'Attendance', url: '/employee/attendance', icon: Clock },
  { title: 'Tasks', url: '/employee/tasks', icon: CheckSquare },
  { title: 'My Targets', url: '/employee/targets', icon: Target },
  { title: 'Leave', url: '/employee/leave', icon: CalendarDays },
  { title: 'Performance', url: '/employee/performance', icon: TrendingUp },
  { title: 'Profile', url: '/employee/profile', icon: User },
];

const adminMenu = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Employees', url: '/admin/employees', icon: Users },
  { title: 'Attendance', url: '/admin/attendance', icon: Clock },
  { title: 'Tasks', url: '/admin/tasks', icon: CheckSquare },
  { title: 'Targets', url: '/admin/targets', icon: Target },
  { title: 'Leave Requests', url: '/admin/leave', icon: CalendarDays },
  { title: 'Reports', url: '/admin/reports', icon: FileBarChart },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

const superAdminMenu = [
  { title: 'Companies', url: '/super-admin', icon: Globe },
  { title: 'My Company', url: '/admin', icon: Building2 },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();
  const menu = user?.role === 'super_admin' ? superAdminMenu
    : user?.role === 'admin' ? adminMenu : employeeMenu;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {!collapsed && <span className="font-heading font-semibold text-primary">TechnoML</span>}
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
      <SidebarFooter className="p-3">
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            {user.company && <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wide">{user.company.slug}</p>}
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && 'Logout'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
