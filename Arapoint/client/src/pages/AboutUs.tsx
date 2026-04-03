import { Shield, Users, Globe, Award, Target, Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const values = [
  {
    icon: Shield,
    title: "Trust & Integrity",
    desc: "We handle sensitive identity data with the highest standards of security and compliance, always putting our users first.",
  },
  {
    icon: Globe,
    title: "Accessibility",
    desc: "We believe every Nigerian business — from solo founders to large enterprises — deserves access to reliable verification infrastructure.",
  },
  {
    icon: Award,
    title: "Excellence",
    desc: "We are committed to delivering accurate results, low latency, and a developer experience that sets the bar in Nigeria.",
  },
  {
    icon: Heart,
    title: "People-First",
    desc: "Behind every verification is a real person. We build with empathy, ensuring our platform respects individual privacy and dignity.",
  },
  {
    icon: Target,
    title: "Innovation",
    desc: "We continuously push boundaries, integrating with government databases and modernising how identity is verified across the country.",
  },
  {
    icon: Users,
    title: "Community",
    desc: "We grow alongside the developers, businesses, and individuals who trust us — their feedback shapes our roadmap.",
  },
];

const team = [
  { name: "Arapoint Leadership", role: "Building the future of Nigerian identity infrastructure" },
];

export default function AboutUs() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-muted/30 border-b border-border/50 py-20 px-4">
        <div className="container max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            Our Story
          </div>
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight text-foreground">
            Powering Identity Verification Across Nigeria
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Arapoint was founded with a simple but powerful belief: that verifying identity in Nigeria should be fast, secure, and accessible to everyone. We bridge the gap between government databases and the businesses that need them.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-heading font-bold text-foreground">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                To provide Nigeria's most reliable, NDPA-compliant identity verification platform — enabling businesses to onboard customers with confidence, reduce fraud, and build trust at scale.
              </p>
              <p className="text-muted-foreground leading-relaxed text-base">
                From NIN and BVN verification to education result checks and CAC business validation, Arapoint is the all-in-one identity layer for modern Nigerian businesses.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                {[
                  { stat: "99.9%", label: "Uptime SLA" },
                  { stat: "&lt;2s", label: "Avg. Response Time" },
                  { stat: "NDPA", label: "Compliant" },
                  { stat: "24/7", label: "Support" },
                ].map(item => (
                  <div key={item.label} className="text-center p-4 rounded-xl bg-muted/50 border border-border/50">
                    <p className="text-2xl font-black text-primary" dangerouslySetInnerHTML={{ __html: item.stat }} />
                    <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 space-y-4">
              <h3 className="text-xl font-bold text-foreground">What We Verify</h3>
              <ul className="space-y-3">
                {[
                  "National Identification Numbers (NIN) via NIMC",
                  "Bank Verification Numbers (BVN)",
                  "CAC Business Registration & Status",
                  "WAEC, NECO, NABTEB & JAMB Results",
                  "Tax Identification Numbers (TIN)",
                  "International Passport & Drivers License",
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-muted/30 border-y border-border/50 py-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">What We Stand For</h2>
            <p className="text-muted-foreground">Our values guide every decision we make — from how we build our platform to how we treat our customers.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-background rounded-xl p-6 border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-heading font-bold">Ready to get started?</h2>
          <p className="text-muted-foreground">Join businesses across Nigeria using Arapoint to verify identities, reduce fraud, and build trust.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8">Create Free Account</Button>
            </Link>
            <a href="https://developer.arapoint.com.ng" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="h-12 px-8">View API Docs</Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
