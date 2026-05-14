import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, UserRole } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PendingApproval from "./pages/PendingApproval";
import OnboardingPage from "./pages/OnboardingPage";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeAttendance from "./pages/employee/EmployeeAttendance";
import EmployeeTasks from "./pages/employee/EmployeeTasks";
import EmployeeLeave from "./pages/employee/EmployeeLeave";
import EmployeePerformance from "./pages/employee/EmployeePerformance";
import EmployeeProfile from "./pages/employee/EmployeeProfile";
import EmployeeTargets from "./pages/employee/EmployeeTargets";
import EmployeeKudos from "./pages/employee/EmployeeKudos";
import EmployeeChat from "./pages/employee/EmployeeChat";
import EmployeeInbox from "./pages/employee/EmployeeInbox";
import EmployeeHelpdesk from "./pages/employee/EmployeeHelpdesk";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTargets from "./pages/admin/AdminTargets";
import AdminHelpdesk from "./pages/admin/AdminHelpdesk";
import AdminCommunication from "./pages/admin/AdminCommunication";
import AdminWellbeing from "./pages/admin/AdminWellbeing";
import AdminPayroll from "./pages/admin/AdminPayroll";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminPermissions from "./pages/admin/AdminPermissions";
import AdminCorrections from "./pages/admin/AdminCorrections";
import { PolicyUpdateGuard } from "./components/PolicyUpdateGuard";
import AdminFeatures from "./pages/admin/AdminFeatures";
import AdminApprovalChain from "./pages/admin/AdminApprovalChain";
import AdminEmployees from "./pages/admin/AdminEmployees";
import AdminEmployeeDetail from "./pages/admin/AdminEmployeeDetail";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminLiveMap from "./pages/admin/AdminLiveMap";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminLeave from "./pages/admin/AdminLeave";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import SuperAdminCompanies from "./pages/super-admin/SuperAdminCompanies";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";

function NavigationDebugger() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const lastPath = useRef(location.pathname);

  useEffect(() => {
    console.log(`[Navigation] Path changed: ${lastPath.current} -> ${location.pathname}`);
    
    // If we hit /design-guide (likely from external tool), redirect to our actual dashboard
    if (location.pathname.includes('design-guide')) {
      console.warn('[Navigation] Intercepted rogue design-guide redirect. Returning to dashboard...');
      
      const home = !isAuthenticated || !user ? '/' 
        : user.role === 'super_admin' ? '/super-admin' 
        : (user.role === 'admin' || user.isOwner) ? '/admin' : '/employee';
        
      navigate(home, { replace: true });
    }
    
    lastPath.current = location.pathname;
  }, [location, navigate, user, isAuthenticated]);

  return null;
}

const queryClient = new QueryClient();

function FullscreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

// Initialize theme class on first paint
function useThemeBootstrap() {
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  }, []);
}

function ProtectedRoute({ children, allow }: { children: React.ReactNode; allow: UserRole[] }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <FullscreenLoader />;
  if (!isAuthenticated || !user) return <Navigate to="/" replace />;
  if (user.status !== 'approved' && user.role !== 'super_admin') return <Navigate to="/pending" replace />;
  // Company owners get admin-level access
  const hasAccess = allow.includes(user.role) || (user.isOwner && allow.includes('admin'));
  if (!hasAccess) {
    const home = user.role === 'super_admin' ? '/super-admin' : (user.role === 'admin' || user.isOwner) ? '/admin' : `/${user.role}`;
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  useThemeBootstrap();
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <FullscreenLoader />;

  const homeRedirect = isAuthenticated && user
    ? (user.role === 'super_admin' ? '/super-admin'
        : user.role === 'employee' && user.status !== 'approved' && !user.isOwner ? '/pending'
        : (user.role === 'admin' || user.isOwner) ? '/admin' : `/${user.role}`)
    : null;

  return (
    <Routes>
      <Route path="/" element={homeRedirect ? <Navigate to={homeRedirect} replace /> : <LandingPage />} />
      <Route path="/login" element={homeRedirect ? <Navigate to={homeRedirect} replace /> : <LoginPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/pending" element={<PendingApproval />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      <Route path="/super-admin" element={<ProtectedRoute allow={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/super-admin/companies" element={<ProtectedRoute allow={['super_admin']}><SuperAdminCompanies /></ProtectedRoute>} />

      <Route path="/employee" element={<ProtectedRoute allow={['employee']}><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/employee/attendance" element={<ProtectedRoute allow={['employee']}><EmployeeAttendance /></ProtectedRoute>} />
      <Route path="/employee/tasks" element={<ProtectedRoute allow={['employee']}><EmployeeTasks /></ProtectedRoute>} />
      <Route path="/employee/leave" element={<ProtectedRoute allow={['employee']}><EmployeeLeave /></ProtectedRoute>} />
      <Route path="/employee/performance" element={<ProtectedRoute allow={['employee']}><EmployeePerformance /></ProtectedRoute>} />
      <Route path="/employee/profile" element={<ProtectedRoute allow={['employee']}><EmployeeProfile /></ProtectedRoute>} />
      <Route path="/employee/targets" element={<ProtectedRoute allow={['employee']}><EmployeeTargets /></ProtectedRoute>} />
      <Route path="/employee/kudos" element={<ProtectedRoute allow={['employee']}><EmployeeKudos /></ProtectedRoute>} />
      <Route path="/employee/chat" element={<ProtectedRoute allow={['employee']}><EmployeeChat /></ProtectedRoute>} />
      <Route path="/employee/inbox" element={<ProtectedRoute allow={['employee']}><EmployeeInbox /></ProtectedRoute>} />
      <Route path="/employee/helpdesk" element={<ProtectedRoute allow={['employee']}><EmployeeHelpdesk /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/targets" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminTargets /></ProtectedRoute>} />
      <Route path="/admin/employees" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminEmployees /></ProtectedRoute>} />
      <Route path="/admin/employees/:id" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminEmployeeDetail /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminAttendance /></ProtectedRoute>} />
      <Route path="/admin/live-map" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminLiveMap /></ProtectedRoute>} />
      <Route path="/admin/tasks" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminTasks /></ProtectedRoute>} />
      <Route path="/admin/leave" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminLeave /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/helpdesk" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminHelpdesk /></ProtectedRoute>} />
      <Route path="/admin/communication" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminCommunication /></ProtectedRoute>} />
      <Route path="/admin/wellbeing" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminWellbeing /></ProtectedRoute>} />
      <Route path="/admin/payroll" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminPayroll /></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminAuditLog /></ProtectedRoute>} />
      <Route path="/admin/permissions" element={<ProtectedRoute allow={['admin']}><AdminPermissions /></ProtectedRoute>} />
      <Route path="/admin/corrections" element={<ProtectedRoute allow={['admin']}><AdminCorrections /></ProtectedRoute>} />
      <Route path="/admin/features" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminFeatures /></ProtectedRoute>} />
      <Route path="/admin/approval-chain" element={<ProtectedRoute allow={['admin', 'super_admin']}><AdminApprovalChain /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NavigationDebugger />
          <AppRoutes />
          <PolicyUpdateGuard />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
