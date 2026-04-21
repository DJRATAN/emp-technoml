import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Moon, Sun, UserCheck, CalendarDays, AlertTriangle, User as UserIcon, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAdminNotifications, NotificationItem } from '@/hooks/useAdminNotifications';
import { useTheme } from '@/hooks/useTheme';

const iconFor = (kind: NotificationItem['kind']) => {
  if (kind === 'pending_employee') return UserCheck;
  if (kind === 'pending_leave') return CalendarDays;
  return AlertTriangle;
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const initial = user?.name?.charAt(0)?.toUpperCase() ?? '?';
  const { items, count } = useAdminNotifications();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const showNotifications = user?.role === 'admin' || user?.role === 'super_admin';

  const profilePath =
    user?.role === 'employee' ? '/employee/profile'
    : user?.role === 'admin' ? '/admin/settings'
    : '/super-admin';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 sticky top-0 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground capitalize truncate">
                {user?.role?.replace('_', ' ')} Portal
                {user?.company && (<span className="ml-2 text-foreground font-medium">· {user.company.name}</span>)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {showNotifications && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                      <Bell className="h-4 w-4" />
                      {count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-0">
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                      <h4 className="font-heading font-semibold">Notifications</h4>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">All caught up 🎉</p>
                      ) : (
                        items.map((n) => {
                          const Icon = iconFor(n.kind);
                          return (
                            <button key={n.id} onClick={() => navigate(n.href)}
                              className="w-full text-left px-4 py-3 hover:bg-accent border-b last:border-0 flex items-start gap-3">
                              <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{n.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 w-8 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-primary/50" aria-label="Account menu">
                    <span className="text-xs font-medium text-primary-foreground">{initial}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-medium truncate">{user?.name}</div>
                    <div className="text-xs text-muted-foreground truncate font-normal">{user?.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(profilePath)}>
                    {user?.role === 'admin' ? <Settings className="h-4 w-4 mr-2" /> : <UserIcon className="h-4 w-4 mr-2" />}
                    {user?.role === 'admin' ? 'Settings' : 'Profile'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
