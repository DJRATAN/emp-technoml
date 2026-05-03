import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Users, MapPin, ShieldCheck, Calendar, BarChart3, MessageSquare,
  Clock, Target, Bell, Headphones, Star, CheckCircle2, ChevronDown,
  ChevronUp, ArrowRight, Menu, X, Zap, Globe, Smartphone, Lock,
  Award, TrendingUp, FileText, UserCheck, Send, Camera, ListTodo,
  CalendarDays
} from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.jpg";
import testimonial1 from "@/assets/testimonial-1.jpg";
import testimonial2 from "@/assets/testimonial-2.jpg";
import testimonial3 from "@/assets/testimonial-3.jpg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Navbar ─── */
function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = ["Features", "How It Works", "Pricing", "Testimonials", "FAQ"];
  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="TechnoML" className="h-8 w-8" />
          <span className="font-[Poppins] text-xl font-bold text-primary">TechnoML</span>
        </div>
        <div className="hidden gap-6 md:flex">
          {links.map((l) => (
            <a key={l} href={l === "Pricing" ? "/pricing" : `#${l.toLowerCase().replace(/ /g, "-")}`} className="text-sm font-medium text-muted-foreground transition hover:text-primary">{l}</a>
          ))}
        </div>
        <div className="hidden gap-3 md:flex">
          <Button variant="outline" onClick={() => navigate("/login")}>Log In</Button>
          <Button onClick={() => navigate("/login")}>Get Started Free</Button>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t border-border/60 bg-background p-4 md:hidden">
          {links.map((l) => (
            <a key={l} href={l === "Pricing" ? "/pricing" : `#${l.toLowerCase().replace(/ /g, "-")}`} className="text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>{l}</a>
          ))}
          <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>Log In</Button>
          <Button className="w-full" onClick={() => navigate("/login")}>Get Started Free</Button>
        </div>
      )}
    </nav>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/30 py-16 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2 lg:px-8">
        <div className="space-y-6">
          <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">🚀 #1 Employee Management Platform</Badge>
          <h1 className="font-[Poppins] text-4xl font-bold leading-tight text-foreground lg:text-5xl xl:text-6xl">
            Smart <span className="text-primary">Employee Management</span> Software
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Face-verified attendance, GPS geofencing, leave management, task tracking, real-time analytics — all in one powerful platform designed for modern teams.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate("/login")} className="gap-2">Start Free Trial <ArrowRight className="h-4 w-4" /></Button>
            <Button size="lg" variant="outline" onClick={() => { const el = document.getElementById("features"); el?.scrollIntoView({ behavior: "smooth" }); }}>Explore Features</Button>
          </div>
          {/* Role-based login */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-muted-foreground">Quick login:</span>
            <Button size="sm" variant="secondary" onClick={() => navigate("/login")} className="gap-1 text-xs">
              <UserCheck className="h-3 w-3" /> Admin Portal
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate("/login")} className="gap-1 text-xs">
              <Users className="h-3 w-3" /> Employee Portal
            </Button>
          </div>
          <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> No credit card</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> 14-day trial</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> Cancel anytime</span>
          </div>
        </div>
        <div className="relative">
          <img src={heroDashboard} alt="TechnoML dashboard preview" width={1280} height={800} className="rounded-2xl shadow-2xl ring-1 ring-border" />
        </div>
      </div>
    </section>
  );
}

/* ─── Stats Bar ─── */
function StatsBar() {
  const stats = [
    { label: "Companies", value: "500+", icon: Globe },
    { label: "Active Users", value: "50,000+", icon: Users },
    { label: "Uptime", value: "99.9%", icon: Zap },
    { label: "Countries", value: "30+", icon: MapPin },
  ];
  return (
    <section className="border-y border-border/60 bg-card py-10">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 lg:grid-cols-4 lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 text-center">
            <s.icon className="mb-1 h-6 w-6 text-primary" />
            <span className="font-[Poppins] text-2xl font-bold text-foreground">{s.value}</span>
            <span className="text-sm text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Feature Preview Modals ─── */
const FEATURE_PREVIEWS: Record<string, { title: string; bullets: string[] }> = {
  "Face Attendance": {
    title: "Face Attendance Preview",
    bullets: [
      "📸 Take a selfie to clock in — anti-spoofing liveness detection ensures it's really you",
      "📍 GPS coordinates captured alongside selfie for dual verification",
      "✅ Instant verification badge shows check-in status on your dashboard",
      "📊 Admin sees a real-time attendance log with selfie thumbnails and location",
    ],
  },
  "Task & Targets": {
    title: "Task & Target Tracking Preview",
    bullets: [
      "📋 Admin assigns tasks with priority (low/medium/high/urgent) and due dates",
      "🎯 Monthly targets with bank/category breakdown and progress tracking",
      "📈 Employees update progress count; admins see completion percentage",
      "📑 CSV bulk upload for importing hundreds of tasks/targets at once",
    ],
  },
  "Leave Management": {
    title: "Leave Management Preview",
    bullets: [
      "📝 Employees submit leave requests with type, dates, and reason",
      "🔗 Multi-level approval chain: Team Lead → Dept Head → HR",
      "📅 Calendar view shows team availability and leave overlaps",
      "⏱️ SLA tracking ensures approvals happen within configured hours",
    ],
  },
};

/* ─── Features ─── */
const FEATURES = [
  { icon: UserCheck, title: "Face Attendance", desc: "Selfie-based check-in with anti-spoofing liveness detection for fraud-proof attendance.", hasPreview: true },
  { icon: MapPin, title: "GPS Geofencing", desc: "Restrict attendance marking to office radius. Real-time live map of employee locations.", hasPreview: false },
  { icon: Calendar, title: "Leave Management", desc: "Apply, approve, and track leaves with configurable multi-level approval chains and SLA.", hasPreview: true },
  { icon: Target, title: "Task & Targets", desc: "Assign monthly targets, track progress with pending/completed status and CSV bulk upload.", hasPreview: true },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Company-wide reports, attendance trends, performance metrics, and predictive insights.", hasPreview: false },
  { icon: MessageSquare, title: "Team Chat", desc: "Real-time tenant-scoped messaging with channels, file attachments, and notifications.", hasPreview: false },
  { icon: Star, title: "Kudos & Recognition", desc: "Peer recognition wall with badges — Star, Helpful, MVP — to boost team morale.", hasPreview: false },
  { icon: Headphones, title: "Helpdesk & Ticketing", desc: "Full internal ticketing with categories, priorities, SLA tracking, and attachments.", hasPreview: false },
  { icon: Bell, title: "Notifications", desc: "In-app bell and email notifications for leave approvals, target assignments, and more.", hasPreview: false },
  { icon: ShieldCheck, title: "Multi-Tenant Security", desc: "Company-level data isolation with RLS, feature flags, and role-based access control.", hasPreview: false },
  { icon: Clock, title: "Shift & Overtime", desc: "Auto shift scheduling, overtime calculation, and configurable work hour policies.", hasPreview: false },
  { icon: FileText, title: "Payroll & Payslips", desc: "Auto-generate payslips from salary fields, attendance, and deductions each month.", hasPreview: false },
];

function FeaturesSection() {
  const [previewOpen, setPreviewOpen] = useState<string | null>(null);
  const preview = previewOpen ? FEATURE_PREVIEWS[previewOpen] : null;

  return (
    <section id="features" className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-3">Features</Badge>
          <h2 className="font-[Poppins] text-3xl font-bold text-foreground lg:text-4xl">Everything You Need to Manage Your Workforce</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">From biometric attendance to payroll, TechnoML covers every aspect of employee management in one unified platform.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className={`group border border-border/60 transition hover:border-primary/40 hover:shadow-lg ${f.hasPreview ? "cursor-pointer" : ""}`}
              onClick={() => f.hasPreview && setPreviewOpen(f.title)}
            >
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-[Poppins] text-base font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                {f.hasPreview && (
                  <span className="mt-1 text-xs font-medium text-primary">Click to preview →</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Feature preview modal */}
      <Dialog open={!!previewOpen} onOpenChange={() => setPreviewOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-[Poppins]">{preview?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {preview?.bullets.map((b, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">{b}</p>
            ))}
          </div>
          <Button className="w-full" onClick={() => { setPreviewOpen(null); const el = document.getElementById("pricing"); el?.scrollIntoView({ behavior: "smooth" }); }}>
            Get Started
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  const steps = [
    { num: "01", title: "Register Your Company", desc: "Sign up and get your dedicated workspace in seconds. No complex setup required." },
    { num: "02", title: "Add Your Employees", desc: "Invite team members via email. They set up profiles and upload selfies for face attendance." },
    { num: "03", title: "Configure Policies", desc: "Set geofence radius, leave quotas, approval chains, work hours, and feature flags." },
    { num: "04", title: "Go Live & Manage", desc: "Employees check in, apply for leave, track tasks — admins monitor everything in real-time." },
  ];
  return (
    <section id="how-it-works" className="bg-accent/20 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-3">How It Works</Badge>
          <h2 className="font-[Poppins] text-3xl font-bold text-foreground lg:text-4xl">Get Started in 4 Simple Steps</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.num} className="relative rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
              <span className="mb-3 inline-block font-[Poppins] text-3xl font-bold text-primary/20">{s.num}</span>
              <h3 className="mb-2 font-[Poppins] text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Role Comparison ─── */
function RoleComparison() {
  const rows = [
    { feature: "Attendance", employee: "Mark via Face + GPS", admin: "Monitor all logs & locations" },
    { feature: "Tasks & Targets", employee: "Update progress", admin: "Assign & track progress" },
    { feature: "Leave", employee: "Apply for leave", admin: "Set policy & approve" },
    { feature: "Reports", employee: "View personal history", admin: "Company-wide analytics" },
    { feature: "Settings", employee: "Edit personal profile", admin: "Configure geofences & policies" },
    { feature: "Helpdesk", employee: "Create tickets", admin: "Resolve & assign tickets" },
    { feature: "Chat & Kudos", employee: "Send messages & kudos", admin: "Manage channels" },
  ];
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 lg:px-8">
        <div className="mb-10 text-center">
          <Badge variant="secondary" className="mb-3">Roles</Badge>
          <h2 className="font-[Poppins] text-3xl font-bold text-foreground lg:text-4xl">Built for Everyone</h2>
          <p className="mt-2 text-muted-foreground">Clear separation of duties between employees and admins.</p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="px-5 py-3 text-left font-semibold text-foreground">Feature</th>
                <th className="px-5 py-3 text-left font-semibold text-primary">Employee</th>
                <th className="px-5 py-3 text-left font-semibold text-primary">Admin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.feature} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                  <td className="px-5 py-3 font-medium text-foreground">{r.feature}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.employee}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.admin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing (summary) ─── */
function PricingSection() {
  const navigate = useNavigate();
  const plans = [
    {
      name: "Starter", price: "Free", period: "", desc: "For small teams getting started",
      features: ["Up to 10 employees", "Face attendance", "Basic leave management", "GPS geofencing", "Email support"],
      cta: "Start Free", popular: false,
    },
    {
      name: "Professional", price: "$4", period: "/user/mo", desc: "For growing businesses",
      features: ["Unlimited employees", "Everything in Starter", "Task & target tracking", "Team chat & kudos", "Multi-level approvals", "Helpdesk ticketing", "CSV bulk upload", "Priority support"],
      cta: "Start Trial", popular: true,
    },
    {
      name: "Enterprise", price: "Custom", period: "", desc: "For large organizations",
      features: ["Everything in Professional", "Custom branding & logo", "SSO / SAML integration", "Dedicated account manager", "API access", "On-premise option", "SLA guarantee", "Custom integrations"],
      cta: "Contact Sales", popular: false,
    },
  ];
  return (
    <section id="pricing" className="bg-accent/20 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-3">Pricing</Badge>
          <h2 className="font-[Poppins] text-3xl font-bold text-foreground lg:text-4xl">Simple, Transparent Pricing</h2>
          <p className="mt-2 text-muted-foreground">No hidden fees. Scale as your team grows.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.name} className={`relative flex flex-col overflow-hidden border transition hover:shadow-xl ${p.popular ? "border-primary ring-2 ring-primary/20" : "border-border/60"}`}>
              {p.popular && <div className="bg-primary px-4 py-1 text-center text-xs font-semibold text-primary-foreground">Most Popular</div>}
              <CardContent className="flex flex-1 flex-col p-6">
                <h3 className="font-[Poppins] text-lg font-semibold text-foreground">{p.name}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mb-6">
                  <span className="font-[Poppins] text-4xl font-bold text-foreground">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.period}</span>
                </div>
                <ul className="mb-8 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={p.popular ? "default" : "outline"} onClick={() => navigate("/pricing")}>{p.cta}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function TestimonialsSection() {
  const items = [
    { img: testimonial1, name: "Sarah Chen", role: "HR Director, TechVista", text: "TechnoML transformed our attendance process. Face verification eliminated buddy punching completely. The geofencing gives us peace of mind for remote offices." },
    { img: testimonial2, name: "James Miller", role: "CEO, GrowthLabs", text: "We went from spreadsheets to a fully automated system in one day. The multi-level approval chains and real-time analytics saved us hours every week." },
    { img: testimonial3, name: "Priya Patel", role: "Operations Lead, ScaleUp", text: "The helpdesk and team chat features keep everything in one place. Our employees love the kudos wall — it boosted team morale significantly." },
  ];
  return (
    <section id="testimonials" className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-3">Testimonials</Badge>
          <h2 className="font-[Poppins] text-3xl font-bold text-foreground lg:text-4xl">Trusted by Teams Worldwide</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {items.map((t) => (
            <Card key={t.name} className="border border-border/60 shadow-sm">
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex gap-1 text-yellow-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.img} alt={t.name} width={40} height={40} loading="lazy" className="h-10 w-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const faqs = [
    { q: "How does face-verified attendance work?", a: "Employees take a selfie during check-in. Our system uses liveness detection to prevent spoofing and matches the selfie against their profile photo to verify identity." },
    { q: "Can I customize geofence for multiple offices?", a: "Yes. Admins can configure office coordinates and geofence radius from the settings panel. Employees can only mark attendance within the defined radius." },
    { q: "Is my company data secure?", a: "Absolutely. Each company has full tenant isolation with row-level security. All data is encrypted in transit and at rest. We follow SOC-2 security practices." },
    { q: "Can I import employee data in bulk?", a: "Yes. The CSV bulk upload feature lets you import employee targets, assignments, and more with preview and validation before saving." },
    { q: "Do you support multi-level leave approvals?", a: "Yes. You can configure approval chains with up to N steps — for example, Team Lead → Department Head → HR — all customizable per company." },
    { q: "What integrations do you support?", a: "We support SSO/SAML, calendar sync, payroll export, and API access. Enterprise plans include custom integration support." },
  ];
  return (
    <section id="faq" className="bg-accent/20 py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <div className="mb-10 text-center">
          <Badge variant="secondary" className="mb-3">FAQ</Badge>
          <h2 className="font-[Poppins] text-3xl font-bold text-foreground lg:text-4xl">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card">
              <button className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                {f.q}
                {openIdx === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {openIdx === i && <div className="border-t border-border/40 px-5 py-4 text-sm leading-relaxed text-muted-foreground">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTASection() {
  const navigate = useNavigate();
  return (
    <section className="bg-primary py-16 text-primary-foreground lg:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
        <h2 className="font-[Poppins] text-3xl font-bold lg:text-4xl">Ready to Transform Your Workforce Management?</h2>
        <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80">Join 500+ companies already using TechnoML to streamline attendance, leave, tasks, and team collaboration.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button size="lg" variant="secondary" onClick={() => navigate("/login")} className="gap-2">Get Started Free <ArrowRight className="h-4 w-4" /></Button>
          <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/pricing")}>View Pricing</Button>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer with email signup ─── */
function Footer() {
  const [footerEmail, setFooterEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleFooterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!footerEmail.trim()) return;
    setSending(true);
    // Generate a slug from domain
    const domain = footerEmail.split("@")[1]?.split(".")[0] || "company";
    const slug = `${domain}-${Date.now().toString(36)}`;
    const { error } = await supabase.from("companies").insert({ name: domain.charAt(0).toUpperCase() + domain.slice(1), slug, status: "active" });
    setSending(false);
    if (error) {
      toast.error("Could not create workspace. Please try again.");
    } else {
      toast.success("Workspace created! Check your email for next steps.", { description: `Slug: ${slug}` });
      setFooterEmail("");
    }
  };

  const cols = [
    { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog", "API Docs"] },
    { title: "Company", links: ["About Us", "Careers", "Blog", "Press", "Partners"] },
    { title: "Support", links: ["Help Center", "Contact", "Status", "Security", "Privacy Policy"] },
  ];
  return (
    <footer className="border-t border-border/60 bg-card py-12">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-4 lg:px-8">
        <div>
          <span className="font-[Poppins] text-xl font-bold text-primary">TechnoML</span>
          <p className="mt-2 text-sm text-muted-foreground">Smart employee management for modern businesses.</p>
          {/* Email signup */}
          <form onSubmit={handleFooterSignup} className="mt-4 flex gap-2">
            <Input
              type="email"
              placeholder="your@company.com"
              value={footerEmail}
              onChange={(e) => setFooterEmail(e.target.value)}
              className="h-9 text-xs"
            />
            <Button type="submit" size="sm" disabled={sending} className="shrink-0 gap-1">
              <Send className="h-3 w-3" /> {sending ? "…" : "Go"}
            </Button>
          </form>
          <p className="mt-1 text-xs text-muted-foreground">Create a free workspace instantly</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 text-sm font-semibold text-foreground">{c.title}</h4>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l}><a href={l === "Pricing" ? "/pricing" : "#"} className="text-sm text-muted-foreground transition hover:text-primary">{l}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-border/40 px-4 pt-6 text-center text-xs text-muted-foreground lg:px-8">
        © {new Date().getFullYear()} TechnoML. All rights reserved.
      </div>
    </footer>
  );
}

/* ─── Company Selector ─── */
function CompanySelector() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from("companies").select("id, name, slug").ilike("name", `%${val}%`).limit(5);
    setResults(data || []);
    setSearching(false);
  };

  return (
    <section className="bg-background py-12 lg:py-16">
      <div className="mx-auto max-w-md px-4 text-center">
        <Badge variant="secondary" className="mb-3">Get Started</Badge>
        <h2 className="mb-2 font-[Poppins] text-2xl font-bold text-foreground">Find Your Company</h2>
        <p className="mb-6 text-sm text-muted-foreground">Search for your organization to continue to login</p>
        <Input
          placeholder="Type your company name…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="mb-3"
        />
        {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((c) => (
              <Button key={c.id} variant="outline" className="w-full justify-start gap-2" onClick={() => navigate(`/login?company=${c.slug}`)}>
                <Users className="h-4 w-4 text-primary" /> {c.name}
              </Button>
            ))}
          </div>
        )}
        {query.length >= 2 && results.length === 0 && !searching && (
          <p className="text-xs text-muted-foreground">No companies found. <button className="text-primary underline" onClick={() => navigate("/login")}>Create a new one</button></p>
        )}
      </div>
    </section>
  );
}

/* ─── Main Page ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <HowItWorks />
      <CompanySelector />
      <RoleComparison />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
