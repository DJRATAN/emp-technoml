import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import PendingApproval from "./pages/PendingApproval";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeAttendance from "./pages/employee/EmployeeAttendance";
import EmployeeTasks from "./pages/employee/EmployeeTasks";
import EmployeeLeave from "./pages/employee/EmployeeLeave";
import EmployeePerformance from "./pages/employee/EmployeePerformance";
import EmployeeProfile from "./pages/employee/EmployeeProfile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEmployees from "./pages/admin/AdminEmployees";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminLeave from "./pages/admin/AdminLeave";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function FullscreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children, role }: { children: React.ReactNode; role: 'admin' | 'employee' }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <FullscreenLoader />;
  if (!isAuthenticated || !user) return <Navigate to="/" replace />;
  if (user.role === 'employee' && user.status !== 'approved') return <Navigate to="/pending" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <FullscreenLoader />;

  const homeRedirect = isAuthenticated && user
    ? (user.role === 'employee' && user.status !== 'approved' ? '/pending' : `/${user.role}`)
    : null;

  return (
    <Routes>
      <Route path="/" element={homeRedirect ? <Navigate to={homeRedirect} replace /> : <LoginPage />} />
      <Route path="/pending" element={<PendingApproval />} />

      <Route path="/employee" element={<ProtectedRoute role="employee"><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/employee/attendance" element={<ProtectedRoute role="employee"><EmployeeAttendance /></ProtectedRoute>} />
      <Route path="/employee/tasks" element={<ProtectedRoute role="employee"><EmployeeTasks /></ProtectedRoute>} />
      <Route path="/employee/leave" element={<ProtectedRoute role="employee"><EmployeeLeave /></ProtectedRoute>} />
      <Route path="/employee/performance" element={<ProtectedRoute role="employee"><EmployeePerformance /></ProtectedRoute>} />
      <Route path="/employee/profile" element={<ProtectedRoute role="employee"><EmployeeProfile /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/employees" element={<ProtectedRoute role="admin"><AdminEmployees /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute role="admin"><AdminAttendance /></ProtectedRoute>} />
      <Route path="/admin/tasks" element={<ProtectedRoute role="admin"><AdminTasks /></ProtectedRoute>} />
      <Route path="/admin/leave" element={<ProtectedRoute role="admin"><AdminLeave /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute role="admin"><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />

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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
