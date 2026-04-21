import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
  iconClassName?: string;
}

export function StatCard({ title, label, value, subtitle, description, icon: Icon, trend, className, iconClassName }: StatCardProps) {
  const heading = title ?? label ?? '';
  const sub = subtitle ?? description;
  return (
    <Card className={cn("p-5 hover:shadow-md transition-shadow", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{heading}</p>
          <p className="text-2xl font-heading font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          {trend && (
            <p className={cn("text-xs font-medium", trend.positive ? "text-success" : "text-destructive")}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10", iconClassName)}>
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  );
}
