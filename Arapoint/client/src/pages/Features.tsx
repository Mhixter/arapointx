import { Shield, GraduationCap, Building2, Zap, Lock, CheckCircle2, Code2, Fingerprint, Phone, CreditCard, Wifi, Tv, BookOpen, FileCheck, Users, BarChart3, ArrowRight, UserCheck, Layers } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const featureGroups = [
  {
    category: "Identity Verification",
    color: "blue",
    icon: Shield,
    tagline: "Verify who your users really are",
    features: [
      {
        icon: Fingerprint,
        title: "NIN Verification",
        desc: "Instantly validate National Identification Numbers directly from official government identity registries. Retrieve full name, date of birth, gender, and phone number in under 2 seconds.",
        badge: "Instant",
      },
      {
        icon: CreditCard,
        title: "BVN Lookup",
        desc: "Verify Bank Verification Numbers issued by the CBN. Confirm identity data and cross-match against customer-provided information.",
        badge: "Instant",
      },
      {
        icon: Phone,
        title: "NIN-to-Phone Lookup",
        desc: "Retrieve the phone number linked to a NIN, or find a NIN from a registered phone number. Useful for onboarding and fraud prevention.",
        badge: "Instant",
      },
      {
        icon: FileCheck,
        title: "Drivers License & Passport",
        desc: "Verify Nigerian drivers license and international passport details against government-issued records.",
        badge: "Coming soon",
      },
    ],
  },
  {
    category: "Education Verification",
    color: "green",
    icon: GraduationCap,
    tagline: "Confirm academic credentials from source",
    features: [
      {
        icon: BookOpen,
        title: "WAEC Result Check",
        desc: "Verify West African Examinations Council (WAEC) results for school candidates and GCE holders. Get subject grades directly from WAEC.",
        badge: "Verified source",
      },
      {
        icon: BookOpen,
        title: "NECO Verification",
        desc: "Validate National Examinations Council (NECO) results for school candidates and GCE. Supports all exam years.",
        badge: "Verified source",
      },
      {
        icon: BookOpen,
        title: "JAMB Status",
        desc: "Confirm JAMB UTME scores, admission status, and registration details. Essential for tertiary institution admissions.",
        badge: "Verified source",
      },
      {
        icon: BookOpen,
        title: "NABTEB & NBAIS",
        desc: "Verify NABTEB technical and vocational results, plus NBAIS Arabic and Islamic studies certificates.",
        badge: "Verified source",
      },
    ],
  },
  {
    category: "Business Validation",
    color: "purple",
    icon: Building2,
    tagline: "Due diligence for corporate transactions",
    features: [
      {
        icon: Building2,
        title: "CAC Registration Check",
        desc: "Confirm company registration status, RC number, business type, and registration date from the Corporate Affairs Commission.",
        badge: "Instant",
      },
      {
        icon: FileCheck,
        title: "TIN Verification",
        desc: "Validate Tax Identification Numbers issued by FIRS. Confirm business compliance before entering contracts.",
        badge: "Coming soon",
      },
    ],
  },
  {
    category: "Employment Verification",
    color: "teal",
    icon: UserCheck,
    tagline: "Confirm employee eligibility in one layered API call",
    features: [
      {
        icon: Layers,
        title: "Standard Employment Check",
        desc: "Bundles NIN + BVN + any one of WAEC / NECO / NABTEB / NBAIS into a single API call. Confirms identity and minimum academic qualification in one request.",
        badge: "Common level",
      },
      {
        icon: UserCheck,
        title: "Higher-Level Employment Check",
        desc: "Extends the standard check with NYSC verification — NIN + BVN + WAEC / NECO / NABTEB / NBAIS + NYSC. Required for graduate-level and regulated roles.",
        badge: "Graduate level",
      },
      {
        icon: FileCheck,
        title: "Batch Screening API",
        desc: "Screen multiple candidates simultaneously using a single API request. Ideal for bulk recruitment, agency hiring, and high-volume onboarding.",
        badge: "API",
      },
      {
        icon: Shield,
        title: "NYSC Verification",
        desc: "Independently verify NYSC discharge or exemption certificates. Confirm completion of the National Youth Service Corps programme directly from source.",
        badge: "Coming soon",
      },
    ],
  },
  {
    category: "VTU & Utility Services",
    color: "orange",
    icon: Zap,
    tagline: "Digital services for individuals and businesses",
    features: [
      {
        icon: Phone,
        title: "Airtime & Data Top-Up",
        desc: "Purchase airtime and data bundles for all Nigerian networks (MTN, Airtel, Glo, 9mobile) instantly at competitive rates.",
        badge: "Instant",
      },
      {
        icon: Zap,
        title: "Electricity Bills",
        desc: "Pay prepaid and postpaid electricity bills across all DISCOs including EKEDC, IKEDC, AEDC, and more.",
        badge: "Instant",
      },
      {
        icon: Tv,
        title: "Cable TV Subscriptions",
        desc: "Renew DStv, GOtv, and Startimes subscriptions directly from your Arapoint wallet.",
        badge: "Instant",
      },
      {
        icon: BookOpen,
        title: "Exam Result Pins",
        desc: "Purchase WAEC, NECO, and JAMB result checker scratch card PINs in bulk or single units.",
        badge: "Instant",
      },
    ],
  },
  {
    category: "Developer & API",
    color: "indigo",
    icon: Code2,
    tagline: "Integrate verification into any product",
    features: [
      {
        icon: Code2,
        title: "RESTful API",
        desc: "Clean, well-documented JSON API. Integrate NIN, BVN, CAC, and education verification into your app in minutes.",
        badge: "developer.arapoint.com.ng",
      },
      {
        icon: Wifi,
        title: "Webhooks",
        desc: "Receive real-time notifications for async verifications (education results). No polling required.",
        badge: "Included",
      },
      {
        icon: BarChart3,
        title: "API Logs & Analytics",
        desc: "Monitor every API call with full logs, status codes, timestamps, and cost breakdowns from your developer dashboard.",
        badge: "Included",
      },
      {
        icon: Lock,
        title: "Sandbox Environment",
        desc: "Test all API endpoints for free in a sandbox environment with realistic mock responses before going live.",
        badge: "Free",
      },
    ],
  },
  {
    category: "Security & Compliance",
    color: "red",
    icon: Lock,
    tagline: "Enterprise-grade protection built in",
    features: [
      {
        icon: Shield,
        title: "NDPA 2023 Compliant",
        desc: "Our platform is built in compliance with the Nigeria Data Protection Act 2023. Every data flow is logged and auditable.",
        badge: "Certified",
      },
      {
        icon: Lock,
        title: "AES-256 Encryption",
        desc: "All data at rest is encrypted with AES-256. Data in transit is protected with TLS 1.3.",
        badge: "Always on",
      },
      {
        icon: Users,
        title: "Role-Based Access",
        desc: "Fine-grained access control for teams. Assign roles to staff without sharing sensitive credentials.",
        badge: "Enterprise",
      },
      {
        icon: BarChart3,
        title: "Fraud Detection",
        desc: "Advanced risk scoring and AML checks. Flag suspicious verification patterns before they become a problem.",
        badge: "Enterprise",
      },
    ],
  },
];

const colorMap: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-600 border-blue-200",
  green: "bg-green-500/10 text-green-600 border-green-200",
  purple: "bg-purple-500/10 text-purple-600 border-purple-200",
  orange: "bg-orange-500/10 text-orange-600 border-orange-200",
  indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  red: "bg-red-500/10 text-red-600 border-red-200",
  teal: "bg-teal-500/10 text-teal-600 border-teal-200",
};

const iconColorMap: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-600",
  green: "bg-green-500/10 text-green-600",
  purple: "bg-purple-500/10 text-purple-600",
  orange: "bg-orange-500/10 text-orange-600",
  indigo: "bg-indigo-500/10 text-indigo-600",
  red: "bg-red-500/10 text-red-600",
  teal: "bg-teal-500/10 text-teal-600",
};

export default function Features() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-muted/30 border-b border-border/50 py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            Platform Features
          </div>
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight text-foreground">
            Everything you need to verify,<br className="hidden sm:block" /> validate, and serve Nigeria
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Arapoint combines identity verification, education checks, business validation, and digital services into one unified platform — with a developer API that makes integration simple.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-sm text-muted-foreground">
            {["Registry Connected", "Government-Approved Sources", "NDPA 2023 Compliant", "99.9% Uptime SLA"].map(item => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature groups */}
      <div className="py-20 space-y-24">
        {featureGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <section key={group.category} className="px-4">
              <div className="container max-w-6xl mx-auto">
                {/* Section header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColorMap[group.color]}`}>
                    <GroupIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading font-bold text-foreground">{group.category}</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">{group.tagline}</p>
                  </div>
                </div>

                {/* Feature cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {group.features.map(({ icon: FeatIcon, title, desc, badge }) => (
                    <div key={title} className="bg-background border border-border/50 rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all flex flex-col gap-4">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconColorMap[group.color]}`}>
                        <FeatIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                      </div>
                      <span className={`self-start text-xs font-medium px-2.5 py-1 rounded-full border ${colorMap[group.color]}`}>
                        {badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* CTA */}
      <section className="bg-muted/30 border-t border-border/50 py-20 px-4">
        <div className="container max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-heading font-bold">Ready to use these features?</h2>
          <p className="text-muted-foreground">Create a free account and start verifying in minutes — no commitments, no monthly fees.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="h-12 px-8">View Pricing</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
