import { cn } from '@/lib/utils';

type Status =
  | 'present' | 'late' | 'absent'
  | 'pending' | 'approved' | 'rejected'
  | 'in-progress' | 'in_progress' | 'completed'
  | 'active' | 'inactive' | 'suspended';

const statusStyles: Record<string, string> = {
  present: 'bg-success/10 text-success border-success/20',
  late: 'bg-warning/10 text-warning border-warning/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  'in-progress': 'bg-primary/10 text-primary border-primary/20',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-success/10 text-success border-success/20',
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  suspended: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<string, string> = {
  present: '✅ Present',
  late: '⏳ Late',
  absent: '❌ Absent',
  pending: '⏳ Pending',
  approved: '✅ Approved',
  rejected: '❌ Rejected',
  'in-progress': '🔄 In Progress',
  in_progress: '🔄 In Progress',
  completed: '✅ Completed',
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

export function StatusBadge({ status, className }: { status: Status | string; className?: string }) {
  const key = String(status).toLowerCase().replace(/\s+/g, '_');
  const style = statusStyles[key] ?? 'bg-muted text-muted-foreground border-border';
  const label = statusLabels[key] ?? String(status);
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', style, className)}>
      {label}
    </span>
  );
}
