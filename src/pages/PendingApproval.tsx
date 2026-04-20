import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const status = user?.status;

  const messages = {
    pending: { title: 'Awaiting Admin Approval', body: 'Your account has been created and is pending review by an administrator. You will be able to access the portal once approved.' },
    rejected: { title: 'Account Rejected', body: 'Your account request has been rejected. Please contact your administrator for more information.' },
    suspended: { title: 'Account Suspended', body: 'Your account is currently suspended. Please contact your administrator.' },
  } as const;

  const m = messages[status as keyof typeof messages] ?? messages.pending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full p-8 rounded-2xl shadow-elegant text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
          {status === 'pending' ? <Clock className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}
        </div>
        <h1 className="font-heading text-2xl font-bold mb-2">{m.title}</h1>
        <p className="text-muted-foreground mb-6">{m.body}</p>
        <div className="rounded-xl bg-muted/50 p-4 text-left text-sm mb-6">
          <p><span className="text-muted-foreground">Name:</span> {user?.name}</p>
          <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
          <p><span className="text-muted-foreground">Department:</span> {user?.department}</p>
        </div>
        <Button variant="outline" className="w-full" onClick={async () => { await logout(); navigate('/'); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </Card>
    </div>
  );
}
