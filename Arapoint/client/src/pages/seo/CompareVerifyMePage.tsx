import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, ArrowRight, GraduationCap, Code2, Zap, Lock } from "lucide-react";
import SeoSchema, { orgSchema, faqSchema } from "@/components/SeoSchema";

const faqs = [
  { q: "Is Arapoint a VerifyMe alternative in Nigeria?", a: "Yes. Arapoint is a VerifyMe alternative for Nigerian businesses that need identity verification, BVN lookup, and NIN verification. Arapoint uniquely extends this with education certificate verification (WAEC, NECO, NABTEB, NBAIS), employment screening, and a bundled Employment Screening API that combines all three verification types in one request." },
  { q: "What does Arapoint offer that is different from VerifyMe?", a: "Arapoint's primary differentiation is its Education Verification and Employment Screening capabilities. While VerifyMe focuses on identity and biometric verification, Arapoint also verifies WAEC, NECO, NABTEB, and NBAIS results directly from examination bodies — enabling automated employment background checks with a single API call." },
  { q: "Does Arapoint verify NIN and BVN like VerifyMe?", a: "Yes. Arapoint verifies NIN from the NIMC registry and BVN from the CBN inter-bank system — the same government sources used by other identity verification providers in Nigeria. Arapoint returns full name, date of birth, gender, phone number, and cross-reference analysis." },
  { q: "How does Arapoint's pricing compare to VerifyMe?", a: "Arapoint uses pay-as-you-go pricing with no monthly subscription. NIN verification starts at ₦130 and BVN verification at ₦80. A complete employment screening package (NIN + BVN + SSCE) costs ₦391 per candidate with a 15% bundle discount. Visit arapoint.com.ng/pricing for the current rates." },
];

const rows = [
  ["NIN verification", true, true],
  ["BVN verification", true, true],
  ["WAEC result verification", true, false],
  ["NECO result verification", true, false],
  ["NABTEB / NBAIS verification", true, false],
  ["Employment screening API (NIN + BVN + SSCE bundle)", true, false],
  ["Automated PASS / REVIEW / FAIL scoring", true, false],
  ["100-point cross-reference analysis", true, false],
  ["Developer API + sandbox", true, true],
  ["Pay-as-you-go pricing", true, "Subscription"],
  ["NDPA 2023 compliance", true, true],
  ["CAC / KYB verification", true, true],
];

export default function CompareVerifyMePage() {
  return (
    <div className="flex flex-col gap-0">
      <SeoSchema schema={[orgSchema(), faqSchema(faqs), {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Arapoint vs VerifyMe — Identity Verification Nigeria",
        description: "Compare Arapoint and VerifyMe for Nigerian identity verification. Arapoint adds education verification and employment screening. Free sandbox available.",
        url: "https://arapoint.com.ng/compare/verifyme-alternative",
      }]} />

      <section className="relative pt-20 pb-24 overflow-hidden bg-mesh border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            Comparison · Identity Verification Nigeria
          </div>
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-foreground tracking-tight leading-tight">
            Arapoint vs VerifyMe<br className="hidden sm:block" /> — Best VerifyMe Alternative in Nigeria
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Looking for a VerifyMe alternative with education verification and employment screening? Arapoint provides everything VerifyMe offers — NIN, BVN, developer API — plus WAEC, NECO, and NABTEB certificate checking in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                Try Arapoint Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Feature comparison</h2>
            <p className="text-muted-foreground">How Arapoint compares to VerifyMe for Nigerian identity and verification needs.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left py-4 px-5 font-semibold">Feature</th>
                  <th className="text-center py-4 px-5 font-semibold text-primary">Arapoint</th>
                  <th className="text-center py-4 px-5 font-semibold text-muted-foreground">VerifyMe</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([feature, arapoint, verifyme], i) => (
                  <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="py-3.5 px-5 text-muted-foreground">{feature}</td>
                    <td className="py-3.5 px-5 text-center">{arapoint === true ? <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" /> : <span className="text-xs text-muted-foreground">{arapoint}</span>}</td>
                    <td className="py-3.5 px-5 text-center">{verifyme === true ? <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" /> : verifyme === false ? <span className="text-xs text-red-400 font-medium">No</span> : <span className="text-xs text-muted-foreground">{verifyme}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">This comparison is based on publicly available information. Features may change. Verify current capabilities on each provider's website.</p>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y border-border/50 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Why businesses choose Arapoint</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: GraduationCap, title: "Education verification included", desc: "Arapoint verifies WAEC, NECO, NABTEB, NBAIS, and JAMB results directly from examination bodies. This is a significant capability that most Nigerian identity verification providers do not offer." },
              { icon: Zap, title: "Complete employment screening in one API call", desc: "Arapoint's Employment Screening API bundles NIN + BVN + SSCE into a single request. Get a 100-point score and PASS/REVIEW/FAIL decision automatically — no building your own cross-reference logic." },
              { icon: Code2, title: "Developer-first API", desc: "Full developer portal at developer.arapoint.com.ng with API keys, live logs, interactive documentation, webhook delivery tracking, and a free sandbox for testing every endpoint." },
              { icon: Lock, title: "NDPA 2023 compliant from day one", desc: "Arapoint is built for compliance with the Nigeria Data Protection Act 2023. AES-256 encryption, TLS 1.3, purpose limitation, and a full audit log — no compliance work required from your team." },
              { icon: Shield, title: "Pay-as-you-go — no monthly subscription", desc: "Arapoint uses per-query pricing with no minimum commitment. You only pay for what you verify. Bundle discounts apply when combining NIN + BVN + education verification." },
              { icon: CheckCircle2, title: "NIN and BVN from official sources", desc: "Like VerifyMe and other providers, Arapoint queries NIN from NIMC and BVN from CBN. Results are real-time and reflect the current state of the government databases." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-background border border-border/50 rounded-xl p-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
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
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border/50 rounded-xl overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-muted/30 transition-colors">
                    <span className="font-semibold text-sm pr-4">{faq.q}</span>
                  </summary>
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-4">{faq.a}</div>
                </details>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-muted/30 border-t border-border/50 py-8 px-4 text-center text-sm text-muted-foreground">
        <p>See also: <Link href="/identity-verification" className="text-primary hover:underline">Identity Verification</Link> · <Link href="/nin-verification" className="text-primary hover:underline">NIN Verification</Link> · <Link href="/bvn-verification" className="text-primary hover:underline">BVN Verification</Link> · <Link href="/education-verification" className="text-primary hover:underline">Education Verification</Link> · <Link href="/best-identity-verification-platform-nigeria" className="text-primary hover:underline">Best Platform in Nigeria</Link></p>
      </div>

      <section className="py-16 px-4 bg-primary">
        <div className="container max-w-3xl mx-auto text-center space-y-5 text-primary-foreground">
          <h2 className="text-3xl font-heading font-bold">Switch to Arapoint — try it free</h2>
          <p className="text-primary-foreground/80">No setup fee. No monthly subscription. Free sandbox to test every endpoint. Pay only when you go live.</p>
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
