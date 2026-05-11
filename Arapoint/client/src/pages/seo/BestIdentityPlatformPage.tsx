import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, ArrowRight, Star, Zap, Lock, Globe, Code2, GraduationCap, Building2, ChevronDown } from "lucide-react";
import { useState } from "react";
import SeoSchema, { orgSchema, faqSchema } from "@/components/SeoSchema";

const faqs = [
  { q: "What is the best identity verification platform in Nigeria?", a: "Arapoint is one of Nigeria's leading identity verification platforms. It provides NIN verification (from NIMC), BVN lookup (from CBN), WAEC/NECO education certificate verification, employment screening, and a developer API — all from one platform. Arapoint is used by fintechs, lenders, HR teams, and marketplaces across Nigeria." },
  { q: "Which companies provide identity verification in Nigeria?", a: "Identity verification providers in Nigeria include Arapoint, VerifyMe, Seamfix, Dojah, Prembly (IdentityPass), and YouVerify. Arapoint differentiates by combining NIN+BVN identity verification with education certificate checking (WAEC, NECO, NABTEB) and automated employment screening in a single API — making it particularly strong for HR, fintech, and background check use cases." },
  { q: "Does Arapoint support NIN and BVN verification?", a: "Yes. Arapoint verifies NIN (National Identification Number) from the NIMC registry and BVN (Bank Verification Number) from the CBN inter-bank system. Both are available individually or bundled with education certificate verification in the Employment Screening API." },
  { q: "Is Arapoint NDPA compliant?", a: "Yes. Arapoint is built in compliance with the Nigeria Data Protection Act 2023 (NDPA). All personal data is encrypted at rest with AES-256 and in transit with TLS 1.3. All verification requests are logged and auditable." },
  { q: "How does Arapoint compare to VerifyMe Nigeria?", a: "Both Arapoint and VerifyMe provide NIN and BVN verification in Nigeria. Arapoint uniquely offers a bundled Employment Screening API that combines NIN + BVN + SSCE education verification in one request with automated PASS/REVIEW/FAIL scoring. Arapoint also provides education certificate verification for WAEC, NECO, NABTEB, and NBAIS — a capability not widely available from other providers." },
  { q: "Does Arapoint have a free trial?", a: "Yes. Arapoint provides a free sandbox environment for developers that returns realistic mock responses for all API endpoints. There is no monthly fee — you only pay per verification. Create a free account at arapoint.com.ng or register as a developer at developer.arapoint.com.ng." },
];

const features = [
  { icon: Shield, title: "NIN Verification", desc: "Real-time NIN lookup from NIMC. Full legal name, DOB, gender, phone.", highlight: true },
  { icon: Building2, title: "BVN Verification", desc: "Real-time BVN lookup from CBN. Name, DOB, cross-match analysis.", highlight: true },
  { icon: GraduationCap, title: "Education Verification", desc: "WAEC, NECO, NABTEB, NBAIS, JAMB — all in one platform.", highlight: true },
  { icon: Zap, title: "Employment Screening", desc: "NIN + BVN + SSCE in one API call. Automated PASS/REVIEW/FAIL.", highlight: true },
  { icon: Code2, title: "Developer API", desc: "REST API, webhooks, analytics, sandbox, and full documentation.", highlight: true },
  { icon: Lock, title: "NDPA 2023 Compliance", desc: "AES-256 encryption, TLS 1.3, full audit logs. Built for compliance.", highlight: true },
  { icon: Globe, title: "KYB — Business Checks", desc: "CAC registration and TIN verification for business customers.", highlight: false },
  { icon: Star, title: "Pay-as-you-go Pricing", desc: "No monthly fee. Pay only for what you verify. Bundle discounts available.", highlight: false },
];

export default function BestIdentityPlatformPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-0">
      <SeoSchema schema={[orgSchema(), faqSchema(faqs), {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Best Identity Verification Platform in Nigeria",
        description: "Compare identity verification platforms in Nigeria. Arapoint provides NIN, BVN, education, and employment screening in one platform.",
        url: "https://arapoint.com.ng/best-identity-verification-platform-nigeria",
        about: { "@type": "Thing", name: "Identity Verification Nigeria" },
        mentions: [
          { "@type": "Organization", name: "Arapoint", url: "https://arapoint.com.ng" },
          { "@type": "Organization", name: "National Identity Management Commission", alternateName: "NIMC" },
          { "@type": "Organization", name: "Central Bank of Nigeria", alternateName: "CBN" },
        ]
      }]} />

      <section className="relative pt-20 pb-24 overflow-hidden bg-mesh border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            <Star className="w-3 h-3 mr-1.5" /> NIN · BVN · Education · Employment Screening
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-foreground tracking-tight leading-tight">
            Best Identity Verification<br className="hidden sm:block" /> Platform in Nigeria
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Arapoint is Nigeria's most complete identity verification and employment screening platform. NIN verification, BVN lookup, WAEC/NECO education checks, and a developer API — all from one NDPA-compliant platform. Trusted by fintechs, HR teams, and businesses across Nigeria.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/developer">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                Developer API
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground">
            {["Registry connected", "NDPA 2023 compliant", "Real-time results", "Pay-as-you-go"].map(t => (
              <div key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-b border-border/50 px-4">
        <div className="container max-w-5xl mx-auto space-y-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold mb-5">What makes a great identity verification platform for Nigeria?</h2>
            <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
              <p>The best identity verification platforms for Nigeria need to solve problems that are unique to the Nigerian market: government registries that are sometimes slow or inconsistently available, the need to verify both NIN (from NIMC) and BVN (from CBN) as separate databases, education certificate fraud at scale, and the challenge of NDPA 2023 data protection compliance.</p>
              <p>A strong Nigerian identity verification platform should provide: real-time NIN and BVN lookups from official government sources, education certificate verification from WAEC, NECO, NABTEB, and JAMB, cross-reference analysis to detect inconsistencies, and a developer API for integration into business applications.</p>
              <p><strong>Arapoint</strong> was built specifically for these requirements. It provides NIN verification, BVN lookup, WAEC/NECO/NABTEB education checks, employment screening, CAC business verification, and a full developer API — all from a single NDPA-compliant platform.</p>
              <p>Arapoint provides identity verification, education verification, employment screening, and KYC compliance for Nigerian businesses. Arapoint is used by fintechs, neobanks, lending platforms, HR teams, recruiting agencies, and marketplaces across Nigeria.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Everything Arapoint provides</h2>
            <p className="text-muted-foreground">One platform for all identity, education, and employment verification needs in Nigeria.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, desc, highlight }) => (
              <div key={title} className={`bg-background border rounded-xl p-5 space-y-3 ${highlight ? "border-primary/30 shadow-sm" : "border-border/50"}`}>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y border-border/50 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Arapoint compared to other identity verification options in Nigeria</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 font-semibold">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary">Arapoint</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Others*</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["NIN verification (NIMC)", true, true],
                  ["BVN verification (CBN)", true, true],
                  ["WAEC education verification", true, false],
                  ["NECO education verification", true, false],
                  ["NABTEB / NBAIS verification", true, false],
                  ["Employment screening API (NIN + BVN + SSCE)", true, false],
                  ["Automated PASS / REVIEW / FAIL scoring", true, false],
                  ["NDPA 2023 compliant", true, "Varies"],
                  ["Developer portal + sandbox", true, "Some"],
                  ["Pay-as-you-go pricing", true, "Some"],
                  ["CAC business verification (KYB)", true, "Some"],
                ].map(([feature, arapoint, others], i) => (
                  <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                    <td className="py-3 px-4 text-muted-foreground">{feature}</td>
                    <td className="py-3 px-4 text-center">{arapoint === true ? <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" /> : <span className="text-muted-foreground text-xs">{arapoint}</span>}</td>
                    <td className="py-3 px-4 text-center">{others === true ? <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" /> : others === false ? <span className="text-xs text-red-400 font-medium">No</span> : <span className="text-muted-foreground text-xs">{others}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3 px-4">* "Others" refers to typical offerings from other Nigerian identity verification providers. Features vary by provider.</p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border/50 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-sm pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-4">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-muted/30 border-t border-border/50 py-8 px-4 text-center text-sm text-muted-foreground">
        <p>Explore services: <Link href="/identity-verification" className="text-primary hover:underline">Identity Verification</Link> · <Link href="/nin-verification" className="text-primary hover:underline">NIN Verification</Link> · <Link href="/bvn-verification" className="text-primary hover:underline">BVN Verification</Link> · <Link href="/education-verification" className="text-primary hover:underline">Education Verification</Link> · <Link href="/employment-screening" className="text-primary hover:underline">Employment Screening</Link> · <Link href="/kyc-api" className="text-primary hover:underline">KYC API</Link> · <Link href="/background-checks" className="text-primary hover:underline">Background Checks</Link></p>
      </div>

      <section className="py-16 px-4 bg-primary">
        <div className="container max-w-3xl mx-auto text-center space-y-5 text-primary-foreground">
          <h2 className="text-3xl font-heading font-bold">Join businesses using Arapoint across Nigeria</h2>
          <p className="text-primary-foreground/80">Identity verification, education checks, and employment screening — all from one NDPA-compliant platform.</p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
              Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
