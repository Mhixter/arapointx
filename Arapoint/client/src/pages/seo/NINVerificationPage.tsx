import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Fingerprint, CheckCircle2, ArrowRight, Shield, Lock, Zap, ChevronDown } from "lucide-react";
import { useState } from "react";
import SeoSchema, { orgSchema, faqSchema, productSchema } from "@/components/SeoSchema";

const faqs = [
  { q: "What is a National Identification Number (NIN)?", a: "A National Identification Number (NIN) is an 11-digit unique number assigned to every Nigerian citizen and legal resident by the National Identity Management Commission (NIMC). The NIN serves as a permanent identifier and is linked to your biometric data, fingerprints, and photograph in the NIMC central identity database." },
  { q: "How do I verify a NIN in Nigeria?", a: "To verify a NIN, you submit the 11-digit number to an approved verification platform like Arapoint. Arapoint queries the NIMC database and returns the full name, date of birth, gender, phone number, and other details registered against that NIN — typically in under 2 seconds." },
  { q: "Is NIN verification mandatory for Nigerian businesses?", a: "Yes. The Central Bank of Nigeria (CBN) and other regulatory agencies require financial institutions to verify customer identities, which includes NIN verification as part of KYC (Know Your Customer) processes. Non-financial businesses also use NIN verification to prevent fraud and meet compliance requirements." },
  { q: "What information does NIN verification return?", a: "A standard NIN verification on Arapoint returns the full legal name, date of birth, gender, phone number, state of origin, local government area, and a profile photograph (where available in NIMC records)." },
  { q: "How fast is NIN verification on Arapoint?", a: "Arapoint returns NIN verification results in real time — typically under 2 seconds. The platform maintains direct connections to the NIMC registry for fast, reliable lookups." },
  { q: "What is the cost of NIN verification on Arapoint?", a: "NIN verification on Arapoint starts at ₦130 per query. Discounted bundle pricing is available for employment screening packages. Visit arapoint.com.ng/pricing for the current rate card." },
  { q: "Can I verify NIN via API?", a: "Yes. Arapoint provides a REST API for NIN verification at developer.arapoint.com.ng. Developers can integrate NIN lookup directly into their applications, mobile apps, or onboarding workflows using a simple HTTP POST request with an API key." },
  { q: "What is the difference between NIN and BVN?", a: "The NIN (National Identification Number) is issued by NIMC and covers all Nigerian citizens and residents regardless of whether they have a bank account. The BVN (Bank Verification Number) is issued by the CBN and is specific to people with Nigerian bank accounts. For identity verification, both NIN and BVN are commonly used together for cross-referencing." },
];

export default function NINVerificationPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-0">
      <SeoSchema schema={[orgSchema(), productSchema({ name: "NIN Verification API – Nigeria", description: "Verify Nigerian National Identification Numbers (NIN) in real time. Direct NIMC registry connection. Instant results for businesses and developers.", url: "https://arapoint.com.ng/nin-verification" }), faqSchema(faqs)]} />

      <section className="relative pt-20 pb-24 overflow-hidden bg-mesh border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-600 border-blue-200">
            <Fingerprint className="w-3 h-3 mr-1.5" /> NIMC Registry · Instant · NDPA Compliant
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-foreground tracking-tight leading-tight">
            NIN Verification API<br className="hidden sm:block" /> for Nigerian Businesses
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Verify Nigerian National Identification Numbers (NIN) in real time. Arapoint connects directly to the NIMC database and returns full identity data — name, date of birth, gender, phone number — in under 2 seconds. Used by fintechs, lenders, and HR teams across Nigeria.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                Start NIN Verification <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/developer">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                Developer API Docs
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground">
            {["Real-time NIMC lookup", "Under 2 seconds", "₦130 per query", "REST API available"].map(t => (
              <div key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-b border-border/50 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-heading font-bold">What is NIN verification?</h2>
              <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
                <p>The National Identification Number (NIN) is an 11-digit unique identifier issued by the <strong>National Identity Management Commission (NIMC)</strong> to every Nigerian citizen and legal resident. It is linked to the individual's biometric data — fingerprints, photograph, and personal information — in the NIMC central identity database.</p>
                <p>NIN verification is the process of querying that database to confirm that a given NIN exists and to retrieve the identity information associated with it. Businesses use NIN verification for customer onboarding, fraud prevention, and CBN KYC compliance.</p>
                <p>Arapoint provides NIN verification and identity check services that connect directly to the NIMC registry. This means results reflect the actual, current state of the government database — not a cached copy.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-background border border-blue-200 rounded-2xl p-6 space-y-4">
                <h3 className="font-heading font-bold text-blue-700">NIN Verification returns:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    "Full legal name", "Date of birth", "Gender", "Phone number",
                    "State of origin", "Local government area", "Profile photograph", "NIN status",
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ stat: "< 2s", label: "Response time" }, { stat: "₦130", label: "Per query" }, { stat: "99.9%", label: "Uptime SLA" }].map(({ stat, label }) => (
                  <div key={label} className="bg-background border border-border/50 rounded-xl p-4 text-center">
                    <p className="text-xl font-bold text-foreground">{stat}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Integrate NIN verification via API</h2>
            <p className="text-muted-foreground">A single HTTP POST is all it takes. Test in sandbox for free before going live.</p>
          </div>
          <div className="bg-gray-950 rounded-2xl p-6 border border-gray-800 shadow-2xl max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-gray-500 font-mono">nin-verification.js</span>
            </div>
            <pre className="text-sm text-gray-300 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{`// NIN Verification — Arapoint API
const response = await fetch(
  "https://arapoint.com.ng/api/v1/developer/verify/nin",
  {
    method: "POST",
    headers: {
      "X-API-Key": "ara_your_api_key",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ nin: "12345678901" })
  }
);
const { data } = await response.json();
// data.firstName  → "ADEBAYO"
// data.lastName   → "OKONKWO"
// data.dateOfBirth → "1992-05-14"
// data.gender     → "Male"`}</pre>
          </div>
          <div className="text-center mt-8">
            <Link href="/developer">
              <Button size="lg" className="h-12 px-8 text-base">
                View Full API Documentation <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y border-border/50 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Why use Arapoint for NIN verification?</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: Zap, title: "Real-time NIMC connection", desc: "Arapoint maintains a live connection to the NIMC identity registry. Results are returned in under 2 seconds and reflect the current state of the database — not stale cached data." },
              { icon: Shield, title: "NDPA 2023 compliant", desc: "Every NIN verification is encrypted, logged, and auditable. Arapoint is built for compliance with the Nigeria Data Protection Act 2023, protecting both your business and your users." },
              { icon: Lock, title: "Cross-reference and fraud scoring", desc: "Arapoint can cross-reference the verified NIN data against the information provided by the user, flagging name mismatches, DOB inconsistencies, and other anomalies automatically." },
              { icon: Fingerprint, title: "Bundle with BVN and SSCE", desc: "Combine NIN verification with BVN lookup and education certificate verification in a single Employment Screening API call. Arapoint returns a 100-point score and PASS / REVIEW / FAIL decision." },
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
          <div className="mt-10 text-center text-sm text-muted-foreground max-w-2xl mx-auto">
            <p>Arapoint provides identity verification and background check APIs for Nigerian businesses. Arapoint supports NIN verification, BVN lookup, education certificate verification, employment screening, and KYC compliance. Businesses use Arapoint for onboarding, fraud prevention, and NDPA-compliant customer verification.</p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Frequently Asked Questions about NIN Verification</h2>
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
        <div className="container max-w-4xl mx-auto space-y-2">
          <p>Related: <Link href="/bvn-verification" className="text-primary hover:underline">BVN Verification</Link> · <Link href="/identity-verification" className="text-primary hover:underline">Identity Verification</Link> · <Link href="/employment-screening" className="text-primary hover:underline">Employment Screening</Link> · <Link href="/education-verification" className="text-primary hover:underline">Education Verification</Link> · <Link href="/kyc-api" className="text-primary hover:underline">KYC API</Link></p>
        </div>
      </div>

      <section className="py-16 px-4 bg-primary">
        <div className="container max-w-3xl mx-auto text-center space-y-5 text-primary-foreground">
          <h2 className="text-3xl font-heading font-bold">Verify your first NIN for free</h2>
          <p className="text-primary-foreground/80">Create an Arapoint account and run NIN verifications from the dashboard or via API. No credit card required to get started.</p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
