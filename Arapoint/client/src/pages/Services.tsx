import { Shield, GraduationCap, Building2, Zap, Code2, Phone, Tv, BookOpen, ArrowRight, CheckCircle2, ChevronRight, UserCheck } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const services = [
  {
    id: "identity",
    icon: Shield,
    color: "blue",
    title: "Identity Verification",
    subtitle: "Verify who your users really are — in seconds",
    description:
      "Arapoint connects directly to government-authorised identity databases to provide real-time, authoritative verification results. Whether you're onboarding customers, screening employees, or preventing fraud, our identity services give you the confidence you need.",
    useCases: [
      "KYC/AML compliance for fintechs and financial institutions",
      "Employee background screening for HR teams",
      "Customer onboarding verification for e-commerce platforms",
      "Fraud prevention for lending and insurance products",
    ],
    services: [
      { name: "NIN Verification", desc: "Full name, DOB, gender & phone via official registry" },
      { name: "BVN Lookup", desc: "Identity data from the national banking network" },
      { name: "NIN-to-Phone", desc: "Link phone numbers to NIN records" },
    ],
    cta: { label: "Start Verifying", href: "/auth/signup" },
  },
  {
    id: "education",
    icon: GraduationCap,
    color: "green",
    title: "Education Verification",
    subtitle: "Confirm academic credentials from the source",
    description:
      "Verify examination results directly from WAEC, NECO, NABTEB, NBAIS, and JAMB. Our education verification service eliminates result forgery by checking credentials at the source — not from uploaded documents.",
    useCases: [
      "University admissions portals verifying O-Level results",
      "Employers confirming academic qualifications of job applicants",
      "Government agencies screening candidates for public service",
      "Professional bodies validating educational prerequisites",
    ],
    services: [
      { name: "WAEC Result Check", desc: "O-Level results for school & GCE candidates" },
      { name: "NECO Verification", desc: "NECO school candidate & GCE results" },
      { name: "JAMB Status", desc: "UTME scores, admission status" },
      { name: "NABTEB / NBAIS", desc: "Technical & Islamic studies certificates" },
    ],
    cta: { label: "Verify Credentials", href: "/auth/signup" },
  },
  {
    id: "business",
    icon: Building2,
    color: "purple",
    title: "Business Validation",
    subtitle: "Due diligence before you sign or transact",
    description:
      "Before entering partnerships, contracts, or transactions, confirm the legitimacy of any Nigerian business. Our CAC and TIN verification services retrieve real-time data from government registries.",
    useCases: [
      "Vendor due diligence for procurement teams",
      "Partner vetting for business development",
      "Regulatory compliance checks for regulated industries",
      "Anti-money laundering (AML) business screening",
    ],
    services: [
      { name: "CAC Verification", desc: "Registration status, RC number, company type" },
      { name: "TIN Verification", desc: "FIRS Tax ID validation" },
    ],
    cta: { label: "Validate a Business", href: "/auth/signup" },
  },
  {
    id: "employment",
    icon: UserCheck,
    color: "teal",
    title: "Employment Verification",
    subtitle: "Confirm employee eligibility in one API call",
    description:
      "Arapoint's Employment Check bundles identity, education, and NYSC verification into a single layered API call — so you can confirm a candidate's full eligibility without managing multiple integrations. Choose the level that fits your hiring standard.",
    useCases: [
      "Pre-employment screening for corporates and SMEs",
      "Compliance checks for regulated sectors (banking, healthcare, education)",
      "Background verification for contract and freelance staff",
      "Government and public sector recruitment screening",
    ],
    services: [
      {
        name: "Standard Employment Check",
        desc: "NIN + BVN + WAEC / NECO / NABTEB / NBAIS — identity and academic eligibility",
      },
      {
        name: "Higher-Level Employment Check",
        desc: "NIN + BVN + WAEC / NECO / NABTEB / NBAIS + NYSC — full eligibility including national service",
      },
      {
        name: "Batch API Screening",
        desc: "Submit multiple candidates in one API request — ideal for bulk recruitment drives",
      },
    ],
    cta: { label: "Start Screening Employees", href: "/auth/signup" },
  },
  {
    id: "vtu",
    icon: Zap,
    color: "orange",
    title: "VTU & Utility Services",
    subtitle: "Digital services at your fingertips",
    description:
      "Beyond verification, Arapoint offers a full suite of Virtual Top-Up and utility payment services. Individuals and businesses can purchase airtime, data, electricity, cable TV subscriptions, and exam scratch cards — all from one platform.",
    useCases: [
      "Bulk airtime and data purchases for businesses",
      "Automated electricity top-up for residential and commercial properties",
      "School portals issuing exam result checker pins to students",
      "Corporate utilities management through the API",
    ],
    services: [
      { name: "Airtime Top-Up", desc: "MTN, Airtel, Glo, 9mobile" },
      { name: "Data Bundles", desc: "All networks, all sizes" },
      { name: "Electricity Bills", desc: "All DISCOs — prepaid & postpaid" },
      { name: "Cable TV", desc: "DStv, GOtv, Startimes" },
      { name: "Exam Pins", desc: "WAEC, NECO, JAMB scratch cards" },
    ],
    cta: { label: "Access VTU Services", href: "/auth/signup" },
  },
  {
    id: "api",
    icon: Code2,
    color: "indigo",
    title: "Developer API",
    subtitle: "Embed Nigeria's verification layer into your product",
    description:
      "Our RESTful API gives developers direct access to all Arapoint services. Whether you're building a fintech app, an HR platform, or a university admission portal — integrate in minutes with clean documentation, SDKs, and a free sandbox.",
    useCases: [
      "Fintech apps running automated KYC at onboarding",
      "HR platforms verifying credentials during recruitment",
      "Admission portals confirming O-Level results for applicants",
      "Lending apps verifying BVN and NIN before disbursement",
    ],
    services: [
      { name: "Identity API", desc: "NIN, BVN, CAC endpoints" },
      { name: "Education API", desc: "WAEC, NECO, JAMB endpoints" },
      { name: "Webhook Events", desc: "Real-time async notifications" },
      { name: "Sandbox Access", desc: "Full test environment" },
    ],
    cta: { label: "Visit Developer Portal", href: "https://developer.arapoint.com.ng", external: true },
  },
];

const colorIconMap: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-600",
  green: "bg-green-500/10 text-green-600",
  purple: "bg-purple-500/10 text-purple-600",
  orange: "bg-orange-500/10 text-orange-600",
  indigo: "bg-indigo-500/10 text-indigo-600",
  teal: "bg-teal-500/10 text-teal-600",
};

const colorBorderMap: Record<string, string> = {
  blue: "border-blue-200 bg-blue-50/50",
  green: "border-green-200 bg-green-50/50",
  purple: "border-purple-200 bg-purple-50/50",
  orange: "border-orange-200 bg-orange-50/50",
  indigo: "border-indigo-200 bg-indigo-50/50",
  teal: "border-teal-200 bg-teal-50/50",
};

export default function Services() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-muted/30 border-b border-border/50 py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            Our Services
          </div>
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight text-foreground">
            One platform, all the services<br className="hidden sm:block" /> Nigerian businesses need
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            From identity verification to utility payments and developer APIs — Arapoint is the complete infrastructure layer for modern Nigerian businesses.
          </p>
          {/* Quick nav */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {services.map(s => (
              <a key={s.id} href={`#${s.id}`}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-background">
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Service sections */}
      <div className="divide-y divide-border/40">
        {services.map((service, idx) => {
          const Icon = service.icon;
          const isEven = idx % 2 === 0;
          return (
            <section key={service.id} id={service.id} className={`py-20 px-4 scroll-mt-20 ${isEven ? "bg-background" : "bg-muted/20"}`}>
              <div className="container max-w-6xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-14 items-start">
                  {/* Left: description */}
                  <div className={`space-y-6 ${!isEven ? "lg:order-2" : ""}`}>
                    <div className={`inline-flex h-12 w-12 rounded-xl items-center justify-center ${colorIconMap[service.color]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-heading font-bold text-foreground">{service.title}</h2>
                      <p className="text-primary font-medium mt-1 text-sm">{service.subtitle}</p>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground">Common use cases</p>
                      <ul className="space-y-2">
                        {service.useCases.map(uc => (
                          <li key={uc} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            {uc}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {service.cta.external ? (
                      <a href={service.cta.href} target="_blank" rel="noopener noreferrer">
                        <Button className="gap-2 mt-2">
                          {service.cta.label} <ArrowRight className="w-4 h-4" />
                        </Button>
                      </a>
                    ) : (
                      <Link href={service.cta.href}>
                        <Button className="gap-2 mt-2">
                          {service.cta.label} <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Right: service list */}
                  <div className={`space-y-3 ${!isEven ? "lg:order-1" : ""}`}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Available services</p>
                    {service.services.map(svc => (
                      <div key={svc.name} className={`rounded-xl border p-4 flex items-center gap-3 ${colorBorderMap[service.color]}`}>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${colorIconMap[service.color].split(" ")[1]}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                          <p className="text-xs text-muted-foreground">{svc.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-heading font-bold">Start using Arapoint today</h2>
          <p className="text-primary-foreground/80 leading-relaxed">No subscription fees. Pay only for what you use. Sign up in seconds.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="h-12 px-8">Create Free Account</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="h-12 px-8 border-white/30 text-white hover:bg-white/10">
                See Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
