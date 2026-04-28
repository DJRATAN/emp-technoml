import { Bell, CalendarCheck, CalendarX, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useUserNotifications, UserNotification } from '@/hooks/useUserNotifications';

const iconFor = (type: string) => {
  if (type === 'leave_approved') return CalendarCheck;
  if (type === 'leave_rejected') return CalendarX;
  if (type === 'target_assigned') return Target;
  return Bell;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationsBell() {
  const { items, unread, markRead, markAllRead } = useUserNotifications();
  const navigate = useNavigate();

  function open(n: UserNotification) {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h4 className="font-heading font-semibold">Notifications</h4>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{unread}</Badge>
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">All caught up 🎉</p>
          ) : (
            items.map((n) => {
              const Icon = iconFor(n.type);
              return (
                <button
                  key={n.id}
                  onClick={() => open(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-accent border-b last:border-0 flex items-start gap-3 ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
