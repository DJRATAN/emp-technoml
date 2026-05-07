import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

type AuditAction =
  | 'employee.approved'
  | 'employee.rejected'
  | 'employee.created'
  | 'employee.deleted'
  | 'employee.updated'
  | 'password.reset'
  | 'attendance.corrected'
  | 'attendance.modified'
  | 'leave.approved'
  | 'leave.rejected'
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'settings.updated'
  | 'broadcast.sent'
  | 'document.uploaded'
  | 'document.deleted'
  | 'feature.toggled';

type AuditEntityType =
  | 'employee'
  | 'attendance'
  | 'leave_request'
  | 'task'
  | 'settings'
  | 'broadcast'
  | 'document'
  | 'feature';

export function useAuditLog() {
  const { user } = useAuth();

  const log = useCallback(async (
    action: AuditAction,
    entityType: AuditEntityType,
    entityId?: string,
    details?: Record<string, any>
  ) => {
    if (!user?.companyId) return;
    
    try {
      await supabase.from('audit_logs' as any).insert({
        company_id: user.companyId,
        actor_id: user.id,
        actor_name: user.name || user.email || 'Unknown',
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || {},
      });
    } catch (e) {
      // Audit logging should never block the main flow
      console.error('Audit log failed:', e);
    }
  }, [user]);

  return { log };
}
