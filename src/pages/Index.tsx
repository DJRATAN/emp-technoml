import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Users, 
  MapPin, 
  Lock, 
  Building2, 
  ArrowRight,
  CheckCircle2,
  Zap,
  LayoutDashboard
} from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white fill-current" />
            </div>
            <span className="text-xl font-heading font-bold tracking-tight">TechnoML</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button onClick={() => navigate('/login')} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <Badge variant="outline" className="py-1 px-4 border-primary/20 bg-primary/5 text-primary animate-in fade-in slide-in-from-bottom-2 duration-700">
              New: Advanced Multi-Tenant RBAC Security
            </Badge>
            <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Next-Gen <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Workforce</span> Management
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              The ultimate platform for enterprise attendance, leave tracking, and secure multi-tenant governance. Built for precision, scaled for growth.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Button size="lg" className="h-14 px-8 text-lg font-semibold" onClick={() => navigate('/login')}>
                Build Your Company <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold border-white/10 hover:bg-white/5" onClick={() => navigate('/login')}>
                Live Demo
              </Button>
            </div>
          </div>

          <div className="mt-16 relative rounded-2xl border border-white/10 bg-slate-900/50 p-2 shadow-2xl animate-in zoom-in-95 duration-1000 delay-500">
            <div className="rounded-xl overflow-hidden aspect-video border border-white/5">
              <img 
                src="/technoml_hero_banner.png" 
                alt="TechnoML Dashboard" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-heading font-bold">Engineered for Enterprise Control</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Everything you need to manage a global workforce with absolute security and transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={Building2}
              title="Multi-Tenancy"
              description="Scale effortlessly with independent workspaces for every company under one unified platform."
            />
            <FeatureCard 
              icon={ShieldCheck}
              title="4-Tier RBAC"
              description="Granular control from Super-Admin oversight down to specific employee permissions."
            />
            <FeatureCard 
              icon={MapPin}
              title="Smart Attendance"
              description="High-precision geofencing and real-time tracking for reliable workforce verification."
            />
            <FeatureCard 
              icon={Lock}
              title="Admin Console"
              description="Instant password resets, role management, and audit logs at your fingertips."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/5 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <Stat value="99.9%" label="Uptime Guarantee" />
          <Stat value="15k+" label="Daily Records" />
          <Stat value="500+" label="Companies Onboarded" />
          <Stat value="24/7" label="Security Monitoring" />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading font-bold">TechnoML</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 TechnoML Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <Card className="p-6 bg-slate-900/50 border-white/5 hover:border-primary/50 transition-all duration-300 group">
      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-heading font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </Card>
  );
}

function Stat({ value, label }: { value: string, label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-3xl font-heading font-bold text-white">{value}</p>
      <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}

function Badge({ children, className, variant }: { children: React.ReactNode, className?: string, variant?: string }) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
}
