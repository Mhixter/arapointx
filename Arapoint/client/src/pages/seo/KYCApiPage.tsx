import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, ArrowRight, Code2, Lock, Building2, Zap, Globe, ChevronDown } from "lucide-react";
import { useState } from "react";
import SeoSchema, { orgSchema, faqSchema, productSchema } from "@/components/SeoSchema";

const faqs = [
  { q: "What is KYC?", a: "KYC (Know Your Customer) is the process of verifying the identity of customers before or during the start of a business relationship. In Nigeria, KYC is mandated by the Central Bank of Nigeria (CBN) for financial institutions and is increasingly adopted by non-financial businesses to prevent fraud and money laundering." },
  { q: "What does the Arapoint KYC API include?", a: "The Arapoint KYC API provides NIN verification, BVN lookup, and cross-reference analysis through a single REST API. It verifies identity against government registries (NIMC for NIN, CBN for BVN), confirms name and date-of-birth consistency, and flags potential fraud indicators — covering the core requirements of Nigerian KYC compliance." },
  { q: "Is the Arapoint KYC API CBN compliant?", a: "Arapoint's identity verification outputs align with CBN KYC guidelines. The platform verifies NIN and BVN from official government registries and returns structured identity data that can be used to satisfy Tier 1, Tier 2, and Tier 3 KYC requirements as defined by the CBN." },
  { q: "Is Arapoint NDPA 2023 compliant?", a: "Yes. Arapoint is built in compliance with the Nigeria Data Protection Act 2023 (NDPA). All data is encrypted at rest with AES-256 and in transit with TLS 1.3. All verification requests are logged and auditable. Using Arapoint's API means your KYC workflow inherits this compliance posture." },
  { q: "How do I integrate the Arapoint KYC API?", a: "Register on the Arapoint Developer Portal at developer.arapoint.com.ng, generate an API key, and make a POST request to the NIN or BVN verification endpoint with the identity number and your API key. A free sandbox environment is available for testing before you go live." },
  { q: "What industries use the Arapoint KYC API?", a: "Fintechs and neobanks use it for CBN-mandated onboarding KYC. Lending platforms use it to verify borrowers. Insurance companies use it for policyholder verification. Gig platforms and marketplaces use it to verify sellers and service providers. HR teams use it for pre-employment identity checks." },
  { q: "Can I do KYC on businesses (KYB) with Arapoint?", a: "Yes. In addition to individual KYC, Arapoint supports KYB (Know Your Business) verification through CAC registration checks and TIN verification. Confirm that a company is validly registered with the Corporate Affairs Commission before entering a business relationship." },
  { q: "What is the difference between KYC and identity verification?", a: "Identity verification is a component of KYC. KYC is the broader regulatory process of understanding who your customer is and assessing risk. Identity verification (NIN, BVN) confirms that the person is who they claim to be. Arapoint provides both the identity verification data and the cross-reference analysis needed for a complete KYC decision." },
];

export default function KYCApiPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-0">
      <SeoSchema schema={[orgSchema(), productSchema({ name: "KYC API for Nigerian Businesses – Arapoint", description: "CBN-aligned KYC API for Nigeria. NIN and BVN verification with cross-reference analysis. NDPA 2023 compliant. Used by fintechs, lenders, and marketplaces.", url: "https://arapoint.com.ng/kyc-api" }), faqSchema(faqs)]} />

      <section className="relative pt-20 pb-24 overflow-hidden bg-mesh border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-indigo-500/10 text-indigo-600 border-indigo-200">
            <Code2 className="w-3 h-3 mr-1.5" /> CBN-Aligned · NDPA Compliant · developer.arapoint.com.ng
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-foreground tracking-tight leading-tight">
            KYC API for<br className="hidden sm:block" /> Nigerian Businesses
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Arapoint provides a KYC API that verifies Nigerian customer identities against government registries. NIN verification from NIMC, BVN lookup from CBN, and automated cross-reference analysis — all through a single REST API. NDPA 2023 compliant by default.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/developer">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                Go to Developer Portal <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                Start KYC for Free
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground">
            {["NIN from NIMC", "BVN from CBN", "NDPA Compliant", "Free Sandbox"].map(t => (
              <div key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-b border-border/50 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl font-heading font-bold">KYC in Nigeria — what the law requires</h2>
            <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
              <p>The Central Bank of Nigeria (CBN) requires all financial institutions to conduct KYC (Know Your Customer) verification on all customers. The CBN KYC guidelines define three customer tiers with escalating verification requirements:</p>
              <ul className="space-y-2 pl-4 list-disc">
                <li><strong>Tier 1</strong> — Phone number and BVN. Daily transaction limit of ₦50,000.</li>
                <li><strong>Tier 2</strong> — NIN, BVN, and proof of address. Daily limit ₦200,000.</li>
                <li><strong>Tier 3</strong> — Full KYC with document verification. Unlimited transactions.</li>
              </ul>
              <p>Arapoint's KYC API covers NIN and BVN verification — the core requirement for both Tier 2 and Tier 3 compliance. The platform also provides cross-reference analysis to detect inconsistencies between identity sources, which is required for AML (Anti-Money Laundering) screening.</p>
              <p>Arapoint provides KYC verification services for Nigerian businesses. Arapoint is used by fintechs, neobanks, lenders, insurance companies, and marketplaces for CBN-compliant customer onboarding and NDPA-compliant identity verification.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">What Arapoint's KYC API provides</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: Shield, title: "NIN verification (NIMC)", desc: "Query the NIMC database and return the full legal name, date of birth, gender, and phone number registered against a NIN. Satisfies Tier 2 and Tier 3 KYC requirements.", tag: "Instant · ₦130" },
              { icon: Building2, title: "BVN verification (CBN)", desc: "Query the CBN inter-bank system to return the registered name, DOB, and phone number for a BVN. Required for Tier 1 and above KYC compliance.", tag: "Instant · ₦80" },
              { icon: Zap, title: "Identity cross-reference", desc: "Automatically compare NIN and BVN data for name similarity and DOB consistency. Flags mismatches that may indicate fraud, impersonation, or data entry errors.", tag: "Included" },
              { icon: Lock, title: "NDPA 2023 compliance", desc: "All data encrypted at rest (AES-256) and in transit (TLS 1.3). Full request audit log. Purpose-limited processing. Inheriting Arapoint's compliance means less work for your DPO.", tag: "Included" },
              { icon: Code2, title: "REST API + Webhooks", desc: "Clean JSON REST API. Webhooks for async verifications. API logs with full request/response history. Free sandbox environment for development and testing.", tag: "developer.arapoint.com.ng" },
              { icon: Globe, title: "KYB — business verification", desc: "In addition to individual KYC, Arapoint supports CAC registration checks and TIN verification for business customers. Full KYB workflow available.", tag: "KYB" },
            ].map(({ icon: Icon, title, desc, tag }) => (
              <div key={title} className="flex gap-4 bg-background border border-border/50 rounded-xl p-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{title}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">{tag}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y border-border/50 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Integrate the KYC API in minutes</h2>
          </div>
          <div className="bg-gray-950 rounded-2xl p-6 border border-gray-800 max-w-2xl mx-auto mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-gray-500 font-mono">kyc-verification.js</span>
            </div>
            <pre className="text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{`// Arapoint KYC API — NIN + BVN cross-reference
const [nin, bvn] = await Promise.all([
  fetch("https://arapoint.com.ng/api/v1/developer/verify/nin", {
    method: "POST",
    headers: { "X-API-Key": "ara_your_key", "Content-Type": "application/json" },
    body: JSON.stringify({ nin: "12345678901" })
  }).then(r => r.json()),
  fetch("https://arapoint.com.ng/api/v1/developer/verify/bvn", {
    method: "POST",
    headers: { "X-API-Key": "ara_your_key", "Content-Type": "application/json" },
    body: JSON.stringify({ bvn: "12345678901" })
  }).then(r => r.json())
]);
// Both return in under 2 seconds
// Compare nin.data.firstName, bvn.data.firstName for name match
// Use Employment Screening for automated cross-reference scoring`}</pre>
          </div>
          <div className="text-center">
            <Link href="/developer">
              <Button size="lg" className="h-12 px-8 text-base">
                Full API Documentation <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Frequently Asked Questions about KYC in Nigeria</h2>
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
        <p>Related: <Link href="/identity-verification" className="text-primary hover:underline">Identity Verification</Link> · <Link href="/nin-verification" className="text-primary hover:underline">NIN Verification</Link> · <Link href="/bvn-verification" className="text-primary hover:underline">BVN Verification</Link> · <Link href="/employment-screening" className="text-primary hover:underline">Employment Screening</Link> · <Link href="/background-checks" className="text-primary hover:underline">Background Checks</Link></p>
      </div>

      <section className="py-16 px-4 bg-primary">
        <div className="container max-w-3xl mx-auto text-center space-y-5 text-primary-foreground">
          <h2 className="text-3xl font-heading font-bold">Build KYC-compliant onboarding in minutes</h2>
          <p className="text-primary-foreground/80">Free sandbox. Pay-as-you-go pricing. No setup fee. Start verifying Nigerian customers today.</p>
          <Link href="/developer">
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
              Get API Access <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
