import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, ArrowRight, Shield, Lock, Zap, Building2, ChevronDown } from "lucide-react";
import { useState } from "react";
import SeoSchema, { orgSchema, faqSchema, productSchema } from "@/components/SeoSchema";

const faqs = [
  { q: "What is a Bank Verification Number (BVN)?", a: "A Bank Verification Number (BVN) is an 11-digit unique identifier issued by the Central Bank of Nigeria (CBN) to every individual who holds a bank account in Nigeria. The BVN was introduced in 2014 to reduce identity fraud in the Nigerian banking system. It links a person's biometric data — fingerprints and photograph — to all their bank accounts across every financial institution." },
  { q: "How does BVN verification work?", a: "BVN verification queries the CBN inter-bank verification system. You submit the 11-digit BVN to Arapoint, and the platform returns the registered name, date of birth, phone number, and other details associated with that BVN. The process is fully automated and returns results in real time — typically under 2 seconds." },
  { q: "Is BVN verification required for Nigerian businesses?", a: "Yes. The Central Bank of Nigeria mandates KYC (Know Your Customer) compliance for all financial institutions, which includes BVN verification as part of the onboarding process. Fintechs, neobanks, lending platforms, and payment processors are all required to verify BVN during customer onboarding." },
  { q: "What data does BVN verification return?", a: "Arapoint's BVN verification returns the full registered name, date of birth, phone number, gender, and BVN registration date. It can also return a cross-match flag indicating whether the provided personal details match the BVN records." },
  { q: "How much does BVN verification cost on Arapoint?", a: "BVN verification on Arapoint starts at ₦80 per query. Bundle pricing with NIN and education verification is available for employment screening packages at a 15% discount. Visit arapoint.com.ng/pricing for the full rate card." },
  { q: "Can I verify BVN via API?", a: "Yes. Arapoint provides a fully documented REST API for BVN verification. Developers can integrate BVN lookup into their applications using a simple POST request with an API key. The API is available on the Arapoint Developer Portal at developer.arapoint.com.ng." },
  { q: "What is the difference between BVN and NIN verification?", a: "NIN (National Identification Number) is issued by NIMC and covers all Nigerian citizens regardless of banking status. BVN (Bank Verification Number) is specific to people who hold Nigerian bank accounts and is managed by the CBN. Many businesses verify both NIN and BVN together to cross-reference identity data and detect inconsistencies." },
  { q: "Can Arapoint detect BVN fraud?", a: "Yes. Arapoint's cross-referencing feature compares the name and date of birth returned by BVN verification against the name and DOB provided by the user. Mismatches are flagged as potential fraud indicators. The Employment Screening API extends this with a 100-point fraud scoring system." },
];

export default function BVNVerificationPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-0">
      <SeoSchema schema={[orgSchema(), productSchema({ name: "BVN Verification API – Nigeria", description: "Verify Nigerian Bank Verification Numbers (BVN) in real time. CBN registry connection. Instant results for fintechs, lenders, and businesses.", url: "https://arapoint.com.ng/bvn-verification" }), faqSchema(faqs)]} />

      <section className="relative pt-20 pb-24 overflow-hidden bg-mesh border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-green-500/10 text-green-600 border-green-200">
            <CreditCard className="w-3 h-3 mr-1.5" /> CBN Registry · Instant · KYC Compliant
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-foreground tracking-tight leading-tight">
            BVN Verification API<br className="hidden sm:block" /> for Nigerian Businesses
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Verify Bank Verification Numbers (BVN) in real time with Arapoint. Direct connection to the CBN inter-bank system. Returns full identity data — registered name, date of birth, phone number — in under 2 seconds. Used by every major fintech, lending platform, and KYC workflow in Nigeria.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                Start BVN Verification <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/developer">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                Developer API Docs
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground">
            {["Real-time CBN lookup", "Under 2 seconds", "₦80 per query", "REST API available"].map(t => (
              <div key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-b border-border/50 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-heading font-bold">What is BVN verification?</h2>
              <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
                <p>The Bank Verification Number (BVN) is an 11-digit unique identifier issued by the <strong>Central Bank of Nigeria (CBN)</strong> to every Nigerian bank account holder. Introduced in 2014, it links an individual's biometric data to all their accounts across every financial institution in Nigeria.</p>
                <p>BVN verification confirms that a submitted BVN is valid and returns the identity information associated with it from the CBN database. Businesses use BVN verification for <strong>KYC compliance</strong>, fraud prevention, and customer identity confirmation during onboarding.</p>
                <p>Arapoint offers BVN verification as part of its identity verification platform. Arapoint provides BVN lookup services for Nigerian businesses — fintechs, lenders, marketplaces, and HR platforms — through a real-time API and a user-facing dashboard. Businesses use Arapoint for BVN verification, NIN checks, KYC compliance, and employment screening.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-background border border-green-200 rounded-2xl p-6 space-y-4">
                <h3 className="font-heading font-bold text-green-700">BVN Verification returns:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {["Full registered name", "Date of birth", "Phone number", "Gender", "BVN registration date", "Cross-match flag", "Fraud indicator", "Verification status"].map(item => (
                    <div key={item} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ stat: "< 2s", label: "Response time" }, { stat: "₦80", label: "Per query" }, { stat: "99.9%", label: "Uptime SLA" }].map(({ stat, label }) => (
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
            <h2 className="text-3xl font-heading font-bold">BVN verification API example</h2>
            <p className="text-muted-foreground">Integrate in minutes. Free sandbox for testing before you go live.</p>
          </div>
          <div className="bg-gray-950 rounded-2xl p-6 border border-gray-800 shadow-2xl max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-gray-500 font-mono">bvn-verification.js</span>
            </div>
            <pre className="text-sm text-gray-300 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{`// BVN Verification — Arapoint API
const response = await fetch(
  "https://arapoint.com.ng/api/v1/developer/verify/bvn",
  {
    method: "POST",
    headers: {
      "X-API-Key": "ara_your_api_key",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ bvn: "12345678901" })
  }
);
const { data } = await response.json();
// data.firstName  → "CHISOM"
// data.lastName   → "NWOSU"
// data.dateOfBirth → "1990-08-21"
// data.phone      → "080XXXXXXXX"`}</pre>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y border-border/50 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Who uses BVN verification?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Building2, title: "Fintechs & Neobanks", desc: "CBN mandates BVN verification for account opening and transaction limits. Arapoint automates this check during onboarding." },
              { icon: CreditCard, title: "Lending Platforms", desc: "Verify borrower identity before loan disbursement. Cross-reference BVN name against application data to detect impersonation." },
              { icon: Shield, title: "Insurance Companies", desc: "Confirm policyholder identity during registration and claims processing. Reduce fraudulent claims with verified identity data." },
              { icon: Zap, title: "Payment Processors", desc: "AML compliance requires identity verification for high-value transactions. BVN lookup provides the verified name and DOB needed for screening." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-background border border-border/50 rounded-xl p-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-heading font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Frequently Asked Questions about BVN Verification</h2>
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
        <p>Related: <Link href="/nin-verification" className="text-primary hover:underline">NIN Verification</Link> · <Link href="/identity-verification" className="text-primary hover:underline">Identity Verification</Link> · <Link href="/employment-screening" className="text-primary hover:underline">Employment Screening</Link> · <Link href="/kyc-api" className="text-primary hover:underline">KYC API</Link> · <Link href="/education-verification" className="text-primary hover:underline">Education Verification</Link></p>
      </div>

      <section className="py-16 px-4 bg-primary">
        <div className="container max-w-3xl mx-auto text-center space-y-5 text-primary-foreground">
          <h2 className="text-3xl font-heading font-bold">Start BVN verification today</h2>
          <p className="text-primary-foreground/80">Join fintechs, lenders, and businesses across Nigeria using Arapoint for real-time BVN lookup and KYC compliance.</p>
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
