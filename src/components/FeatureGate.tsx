import React from 'react';
import { useCompanyFeatures, CompanyFeatures } from '@/hooks/useCompanyFeatures';
import { Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface FeatureGateProps {
  feature: keyof Omit<CompanyFeatures, 'company_id'>;
  children: React.ReactNode;
  fallback?: 'none' | 'locked' | 'message';
  message?: string;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback = 'none',
  message = "This feature is not enabled for your company. Please contact your administrator or upgrade your plan."
}: FeatureGateProps) {
  const { user } = useAuth();
  const { features, loading } = useCompanyFeatures();

  // Super admins bypass all gates
  if (user?.role === 'super_admin') return <>{children}</>;

  if (loading) return null;

  const isEnabled = features ? !!features[feature] : false;

  if (isEnabled) {
    return <>{children}</>;
  }

  if (fallback === 'none') return null;

  if (fallback === 'locked') {
    return (
      <div className="relative group">
        <div className="opacity-50 pointer-events-none filter blur-[1px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px] rounded-lg">
          <div className="bg-card border shadow-xl p-4 rounded-xl flex flex-col items-center gap-3 max-w-[250px] text-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-heading font-semibold text-sm">Feature Locked</h4>
              <p className="text-xs text-muted-foreground mt-1">{message}</p>
            </div>
            <Button size="sm" variant="outline" className="w-full text-xs">Upgrade Plan</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive">
      <Lock className="h-4 w-4" />
      <AlertTitle>Access Restricted</AlertTitle>
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  );
}
