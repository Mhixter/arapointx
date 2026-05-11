import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, ArrowRight, Fingerprint, CreditCard, Building2, Users, Zap, Lock, ChevronDown } from "lucide-react";
import { useState } from "react";
import SeoSchema, { orgSchema, faqSchema, productSchema } from "@/components/SeoSchema";

const faqs = [
  { q: "What is identity verification in Nigeria?", a: "Identity verification in Nigeria is the process of confirming that a person is who they claim to be using government-issued records such as the National Identification Number (NIN) from NIMC or the Bank Verification Number (BVN) from the CBN. Arapoint connects directly to these registries to return real-time verification results." },
  { q: "How does NIN verification work on Arapoint?", a: "When you submit a NIN through Arapoint, the platform queries the National Identity Management Commission (NIMC) registry and returns the full name, date of birth, gender, and phone number linked to that NIN — typically in under 2 seconds." },
  { q: "How does BVN verification work on Arapoint?", a: "BVN verification queries the Central Bank of Nigeria (CBN) inter-bank verification system. You submit the 11-digit BVN and Arapoint returns the registered name, date of birth, and phone number." },
  { q: "Is Arapoint NDPA compliant?", a: "Yes. Arapoint is built in compliance with the Nigeria Data Protection Act 2023 (NDPA). All data is encrypted at rest with AES-256 and in transit with TLS 1.3. Access is logged and auditable." },
  { q: "Which businesses use identity verification?", a: "Fintechs and neobanks use identity verification for CBN KYC compliance. Lending platforms verify borrowers before disbursement. Recruiting agencies confirm candidate identities. HR teams automate pre-employment checks. Arapoint serves all of these use cases from one platform." },
  { q: "How long does identity verification take?", a: "NIN and BVN verification on Arapoint returns results in real time — typically under 2 seconds. No manual review is required for standard identity checks." },
  { q: "Does Arapoint have an identity verification API?", a: "Yes. Arapoint provides a REST API for identity verification. Developers can integrate NIN verification, BVN lookup, and employment screening into their applications using the Arapoint Developer API at developer.arapoint.com.ng." },
  { q: "What is the price for identity verification on Arapoint?", a: "NIN verification starts at ₦130 per query and BVN lookup starts at ₦80 per query. Bundle pricing with 15% discount is available for employment screening. Visit arapoint.com.ng/pricing for full details." },
];

export default function IdentityVerificationPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-0">
      <SeoSchema schema={[orgSchema(), productSchema({ name: "Identity Verification API – Nigeria", description: "Real-time NIN and BVN identity verification API for Nigerian businesses. NDPA compliant, instant results.", url: "https://arapoint.com.ng/identity-verification" }), faqSchema(faqs)]} />

      <section className="relative pt-20 pb-24 overflow-hidden bg-mesh border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-600 border-blue-200">
            <Shield className="w-3 h-3 mr-1.5" /> NDPA Compliant · Registry Connected · Instant Results
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-foreground tracking-tight leading-tight">
            Identity Verification API<br className="hidden sm:block" /> in Nigeria
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Arapoint provides real-time identity verification for Nigerian businesses. Verify customers using NIN (National Identification Number) and BVN (Bank Verification Number) directly from government registries. Trusted by fintechs, lenders, and HR teams across Nigeria.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                Start Verifying Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/developer">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                Explore the API
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground">
            {["NIN Verification", "BVN Lookup", "Fraud Scoring", "NDPA 2023 Compliant"].map(t => (
              <div key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-10 font-medium uppercase tracking-wider">What is identity verification?</p>
          <div className="prose prose-neutral dark:prose-invert max-w-3xl mx-auto text-muted-foreground text-base leading-relaxed space-y-4">
            <p>Identity verification is the process of confirming that a person is who they claim to be. In Nigeria, this is done by cross-referencing information provided by the user against authoritative government databases — primarily the <strong>National Identity Management Commission (NIMC)</strong> for NIN records and the <strong>Central Bank of Nigeria (CBN)</strong> inter-bank system for BVN records.</p>
            <p>For Nigerian businesses, identity verification is not optional — it is a regulatory requirement. The CBN mandates KYC (Know Your Customer) checks for all financial institutions. Fintechs, lending platforms, insurance companies, and marketplaces all rely on automated identity verification to onboard customers quickly and remain compliant.</p>
            <p><strong>Arapoint</strong> provides identity verification and background check services for Nigerian businesses. The platform connects directly to government registries and returns structured, real-time results through a REST API. Arapoint provides identity verification and education verification APIs for Nigerian businesses. Businesses use Arapoint for KYC, background checks, BVN verification, employment screening, and customer onboarding.</p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Verify NIN and BVN in seconds</h2>
            <p className="text-muted-foreground">Direct registry connections return verified results in real time — no manual review, no delays.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-background border border-blue-200 rounded-2xl p-8 space-y-5">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold mb-2">NIN Verification</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Validate any Nigerian National Identification Number (NIN) directly from the NIMC database. The NIN is an 11-digit unique identifier assigned to every Nigerian citizen and legal resident. Arapoint returns the full name, date of birth, gender, state of origin, and phone number linked to the NIN — in under 2 seconds.</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Full legal name from NIMC records", "Date of birth and gender", "Phone number linked to NIN", "State of origin and LGA", "Profile photo (where available)", "Results in under 2 seconds"].map(i => (
                  <li key={i} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />{i}</li>
                ))}
              </ul>
              <Link href="/nin-verification">
                <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
                  Learn About NIN Verification <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="bg-background border border-green-200 rounded-2xl p-8 space-y-5">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold mb-2">BVN Verification</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Verify any Bank Verification Number (BVN) issued by the Central Bank of Nigeria. The BVN is an 11-digit number that links a person's biometric data to their bank accounts across all Nigerian financial institutions. Arapoint returns the registered name, date of birth, phone number, and linked bank details.</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Full registered name from CBN", "Date of birth and phone number", "BVN registration date", "Cross-match against user-provided data", "Fraud flag detection", "Instant response"].map(i => (
                  <li key={i} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />{i}</li>
                ))}
              </ul>
              <Link href="/bvn-verification">
                <Button variant="outline" className="w-full border-green-200 text-green-600 hover:bg-green-50">
                  Learn About BVN Verification <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y border-border/50 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Who uses identity verification?</h2>
            <p className="text-muted-foreground">Arapoint serves businesses across every sector that requires identity checks in Nigeria.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Building2, title: "Fintechs & Neobanks", desc: "Meet CBN KYC requirements. Verify customer identities during onboarding and flag inconsistencies before account opening. NDPA-compliant by default.", color: "blue" },
              { icon: CreditCard, title: "Lending & Loan Apps", desc: "Screen borrowers before disbursement. Reduce default risk with identity and credential cross-checking. Confirm NIN-BVN name match before approving loans.", color: "green" },
              { icon: Users, title: "Recruiting & HR", desc: "Validate candidate identities at scale. Confirm NIN and BVN data against provided information. Integrate with SSCE verification for complete pre-employment screening.", color: "purple" },
              { icon: Zap, title: "Marketplaces & Gig Platforms", desc: "KYC verification for sellers, drivers, and freelancers. Confirm identity before permitting transactions on your platform. Reduce fraud and chargebacks.", color: "orange" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-background border border-border/50 rounded-xl p-6 space-y-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-${color}-500/10`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <h3 className="font-heading font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">How identity verification works on Arapoint</h2>
            <p className="text-muted-foreground">Three steps from sign-up to verified result.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Create your account", desc: "Sign up at arapoint.com.ng or register on the developer portal at developer.arapoint.com.ng. No setup fee, no monthly commitment." },
              { step: "2", title: "Submit NIN or BVN", desc: "Enter the identity number through the dashboard or API. For API integrations, include your API key in the request header and post the NIN or BVN as JSON." },
              { step: "3", title: "Get verified results", desc: "Arapoint queries the government registry and returns a structured JSON response with the verified identity data — typically in under 2 seconds." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">{step}</div>
                <h3 className="text-lg font-heading font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y border-border/50 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Why choose Arapoint for identity verification?</h2>
          </div>
          <div className="space-y-4">
            {[
              { icon: Shield, title: "Direct registry connections", desc: "Arapoint queries NIN from NIMC and BVN from the CBN inter-bank system — not from third-party data lakes. Results reflect the current state of government records." },
              { icon: Lock, title: "NDPA 2023 compliant by default", desc: "Every verification is logged, encrypted, and auditable. Arapoint is built for compliance with the Nigeria Data Protection Act 2023, so you inherit that compliance from day one." },
              { icon: Zap, title: "Real-time results under 2 seconds", desc: "Standard NIN and BVN lookups return results in under 2 seconds. There is no batch processing or overnight queuing for identity checks." },
              { icon: Building2, title: "Combined verification in one API call", desc: "The Employment Screening API bundles NIN + BVN + education certificate verification into a single request, with automated PASS / REVIEW / FAIL scoring." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-background border border-border/50 rounded-xl p-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Common questions about identity verification in Nigeria and the Arapoint platform.</p>
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

      <section className="py-20 px-4 bg-primary">
        <div className="container max-w-3xl mx-auto text-center space-y-6 text-primary-foreground">
          <h2 className="text-3xl font-heading font-bold">Start verifying Nigerian identities today</h2>
          <p className="text-primary-foreground/80 text-lg">Join businesses across Nigeria using Arapoint for real-time NIN verification, BVN lookup, and KYC compliance. No setup fee, no monthly commitment.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
                Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
