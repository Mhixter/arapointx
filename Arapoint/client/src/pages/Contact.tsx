import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, MessageSquare, Code2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";

const contactChannels = [
  {
    icon: Mail,
    title: "General Enquiries",
    detail: "support@arapoint.com.ng",
    note: "We respond within 24 hours",
    href: "mailto:support@arapoint.com.ng",
    color: "blue",
  },
  {
    icon: Code2,
    title: "Developer Support",
    detail: "dev@arapoint.com.ng",
    note: "API & integration help",
    href: "mailto:dev@arapoint.com.ng",
    color: "indigo",
  },
  {
    icon: Users,
    title: "Sales & Partnerships",
    detail: "sales@arapoint.com.ng",
    note: "Volume pricing & enterprise",
    href: "mailto:sales@arapoint.com.ng",
    color: "green",
  },
  {
    icon: MessageSquare,
    title: "Legal & Privacy",
    detail: "legal@arapoint.com.ng",
    note: "Legal & compliance matters",
    href: "mailto:legal@arapoint.com.ng",
    color: "purple",
  },
];

const colorMap: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-600",
  indigo: "bg-indigo-500/10 text-indigo-600",
  green: "bg-green-500/10 text-green-600",
  purple: "bg-purple-500/10 text-purple-600",
};

const subjects = [
  "General enquiry",
  "API & developer support",
  "Billing & payments",
  "Sales & volume pricing",
  "Partnership enquiry",
  "Report an issue",
  "Legal & compliance",
  "Other",
];

export default function Contact() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
    toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-muted/30 border-b border-border/50 py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            Contact Us
          </div>
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight text-foreground">
            We're here to help
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Whether you have a question about our services, need help with an integration, or want to discuss enterprise pricing — our team is ready.
          </p>
        </div>
      </section>

      {/* Contact channels */}
      <section className="py-16 px-4 border-b border-border/50">
        <div className="container max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {contactChannels.map(channel => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.title}
                  href={channel.href}
                  className="bg-background border border-border/50 rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 ${colorMap[channel.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-foreground text-sm mb-1">{channel.title}</p>
                  <p className="text-sm text-primary group-hover:underline break-all">{channel.detail}</p>
                  <p className="text-xs text-muted-foreground mt-1">{channel.note}</p>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main content: Form + info */}
      <section className="py-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-14">
            {/* Contact form */}
            <div className="lg:col-span-3">
              <div className="space-y-2 mb-8">
                <h2 className="text-2xl font-heading font-bold text-foreground">Send us a message</h2>
                <p className="text-muted-foreground text-sm">Fill in the form below and we'll respond within one business day.</p>
              </div>

              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center space-y-3">
                  <div className="flex justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Message received!</h3>
                  <p className="text-sm text-muted-foreground">
                    Thank you for reaching out. We'll review your message and get back to you at <strong>{form.email}</strong> within 24 hours.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", company: "", subject: "", message: "" }); }}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Full name <span className="text-red-500">*</span></label>
                      <Input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Email address <span className="text-red-500">*</span></label>
                      <Input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Company / Organisation</label>
                    <Input
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      placeholder="Acme Nigeria Ltd (optional)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Subject</label>
                    <select
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground"
                    >
                      <option value="">Select a subject...</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Message <span className="text-red-500">*</span></label>
                    <Textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Tell us how we can help..."
                      rows={5}
                      required
                      className="resize-none"
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
                    {submitting ? "Sending..." : <><Send className="w-4 h-4" /> Send Message</>}
                  </Button>
                </form>
              )}
            </div>

            {/* Info sidebar */}
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-heading font-bold text-foreground">Office information</h2>
                <p className="text-muted-foreground text-sm">Our team is based in Lagos and available during business hours.</p>
              </div>

              <div className="space-y-5">
                {[
                  {
                    icon: MapPin,
                    label: "Address",
                    value: settings.siteAddress || "Lagos, Nigeria",
                  },
                  {
                    icon: Phone,
                    label: "Phone",
                    value: settings.sitePhone || "+234 800 123 4567",
                    href: `tel:${settings.sitePhone}`,
                  },
                  {
                    icon: Mail,
                    label: "Email",
                    value: settings.siteEmail || "support@arapoint.com.ng",
                    href: `mailto:${settings.siteEmail}`,
                  },
                  {
                    icon: Clock,
                    label: "Business Hours",
                    value: "Monday – Friday, 8:00 AM – 6:00 PM WAT",
                  },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{item.label}</p>
                        {item.href ? (
                          <a href={item.href} className="text-sm text-primary hover:underline mt-0.5 block">{item.value}</a>
                        ) : (
                          <p className="text-sm text-foreground mt-0.5">{item.value}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick links */}
              <div className="bg-muted/30 border border-border/50 rounded-xl p-5 space-y-3">
                <p className="text-sm font-semibold text-foreground">Quick resources</p>
                <ul className="space-y-2">
                  {[
                    { label: "API Documentation", href: "https://developer.arapoint.com.ng/docs", external: true },
                    { label: "Developer Portal", href: "https://developer.arapoint.com.ng", external: true },
                    { label: "Pricing", href: "/pricing" },
                    { label: "Privacy Policy", href: "/privacy" },
                    { label: "Terms of Service", href: "/terms" },
                  ].map(link => (
                    <li key={link.label}>
                      {link.external ? (
                        <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          {link.label} ↗
                        </a>
                      ) : (
                        <a href={link.href} className="text-sm text-primary hover:underline">
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
