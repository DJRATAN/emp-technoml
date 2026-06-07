import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "For small teams getting started",
    features: [
      "Up to 10 employees",
      "Face attendance + GPS geofencing",
      "Basic leave management",
      "Attendance corrections",
      "Helpdesk ticketing",
      "Email support",
    ],
    cta: "Start Free",
    popular: false,
    action: "signup" as const,
  },
  {
    name: "Professional",
    price: "₹99",
    period: "/user/mo",
    desc: "For growing Indian businesses",
    features: [
      "Unlimited employees",
      "Everything in Starter",
      "EPF, ESI & Professional Tax payroll compliance",
      "GST-compliant tax invoices",
      "Tasks & targets with approval chains",
      "Payroll & downloadable payslips",
      "Admin broadcasts & read receipts",
      "Team chat & kudos recognition wall",
      "Employee wellbeing & burnout tracking",
      "Audit trail & admin permission matrix",
      "Attendance correction reviews",
      "Live GPS map of employees",
      "Reports & analytics dashboard",
      "Priority support",
    ],
    cta: "Start Trial",
    popular: true,
    action: "trial" as const,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For large organizations",
    features: [
      "Everything in Professional",
      "Custom branding & logo upload",
      "SSO / SAML integration",
      "Dedicated account manager",
      "API access & webhooks",
      "On-premise deployment option",
      "SLA guarantee",
      "Predictive attrition analytics",
      "Advanced anti-fraud (IP whitelist)",
      "Custom Indian compliance support (Gratuity, LWF)",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    popular: false,
    action: "contact" as const,
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [contactPlan, setContactPlan] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", employees: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handlePlanClick = (plan: typeof PLANS[0]) => {
    if (plan.action === "contact") {
      setContactPlan(plan.name);
    } else {
      navigate("/login");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Please fill in name and email");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Thank you! Our team will reach out within 24 hours.");
      setContactPlan(null);
      setForm({ name: "", email: "", company: "", employees: "", message: "" });
    }, 1000);
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Top nav */}
      <nav className="w-full sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[90%] xl:max-w-[1600px] items-center justify-between px-4 py-3 lg:px-8">
          <Link to="/" className="font-[Poppins] text-xl font-bold text-primary">TechnoML</Link>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/login")}>Log In</Button>
            <Button onClick={() => navigate("/login")}>Get Started</Button>
          </div>
        </div>
      </nav>

      <section className="w-full py-16 lg:py-24">
        <div className="mx-auto max-w-[90%] xl:max-w-[1600px] px-4 lg:px-8">
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </div>
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-3">Pricing</Badge>
            <h1 className="font-[Poppins] text-3xl font-bold text-foreground lg:text-5xl">Choose the Right Plan for Your Team</h1>
            <p className="mt-3 text-muted-foreground">No hidden fees. Scale as your team grows. Cancel anytime.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {PLANS.map((p) => (
              <Card
                key={p.name}
                className={`relative flex flex-col overflow-hidden border transition hover:shadow-xl ${p.popular ? "border-primary ring-2 ring-primary/20" : "border-border/60"}`}
              >
                {p.popular && (
                  <div className="bg-primary px-4 py-1 text-center text-xs font-semibold text-primary-foreground">Most Popular</div>
                )}
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
                  <Button
                    className="w-full"
                    variant={p.popular ? "default" : "outline"}
                    onClick={() => handlePlanClick(p)}
                  >
                    {p.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Lead form dialog */}
      <Dialog open={!!contactPlan} onOpenChange={() => setContactPlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[Poppins]">Get in Touch — {contactPlan} Plan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div>
              <Label>Work Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />
            </div>
            <div>
              <Label>Company Name</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Inc." />
            </div>
            <div>
              <Label>Team Size</Label>
              <Input value={form.employees} onChange={(e) => setForm({ ...form, employees: e.target.value })} placeholder="e.g. 50-100" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your needs…" rows={3} />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              <Send className="h-4 w-4" /> {submitting ? "Sending…" : "Send Request"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
