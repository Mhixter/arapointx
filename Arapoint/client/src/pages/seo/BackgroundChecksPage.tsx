import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UserCheck, CheckCircle2, ArrowRight, Shield, GraduationCap, Building2, Briefcase, Zap, ChevronDown } from "lucide-react";
import { useState } from "react";
import SeoSchema, { orgSchema, faqSchema, productSchema } from "@/components/SeoSchema";

const faqs = [
  { q: "What is a background check?", a: "A background check is a verification process that confirms details a person has provided — such as their identity, academic credentials, work history, and legal status. In Nigeria, background checks for employment typically cover NIN verification (identity), BVN verification (financial identity), and SSCE certificate verification (academic credentials)." },
  { q: "What does an Arapoint background check include?", a: "An Arapoint background check covers identity verification (NIN from NIMC), financial identity verification (BVN from CBN), and academic credential verification (WAEC, NECO, NABTEB, or NBAIS results). The Employment Screening API bundles all three into one request with automated scoring and a PASS / REVIEW / FAIL decision." },
  { q: "How long does a background check take on Arapoint?", a: "Identity checks (NIN and BVN) return in under 2 seconds. Education certificate verification takes 1–3 minutes. A complete background check result is typically available within 3–5 minutes — significantly faster than traditional manual verification which can take 3–10 days." },
  { q: "Is background checking legal in Nigeria?", a: "Yes. Employers in Nigeria are legally permitted to conduct background checks on employees and candidates, provided they have the candidate's informed consent. Arapoint processes all verification requests in compliance with the Nigeria Data Protection Act 2023 (NDPA), which requires explicit consent and purpose limitation for personal data processing." },
  { q: "Can I do background checks in bulk on Arapoint?", a: "Yes. The Arapoint API supports batch processing of multiple candidates. You can submit multiple employment screening requests simultaneously, making it efficient for high-volume hiring, agency recruitment, or onboarding large groups of employees." },
  { q: "Does Arapoint do criminal background checks?", a: "Currently, Arapoint focuses on identity verification, education credential verification, and financial identity confirmation. Criminal record checks (police clearance) are not currently part of the Arapoint platform but are on the product roadmap." },
  { q: "What industries in Nigeria use background checks?", a: "Background checks in Nigeria are widely used in financial services (CBN KYC compliance), oil and gas (security clearance), fintech, insurance, corporate hiring, logistics and transport (driver verification), healthcare (credential verification), and government agencies (civil service recruitment)." },
];

export default function BackgroundChecksPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-0">
      <SeoSchema schema={[orgSchema(), productSchema({ name: "Background Checks Nigeria – Arapoint", description: "Automated background checks for Nigerian businesses. Identity verification, education certificate checks, and BVN verification in one platform. Faster and cheaper than manual background checking.", url: "https://arapoint.com.ng/background-checks" }), faqSchema(faqs)]} />

      <section className="relative pt-20 pb-24 overflow-hidden bg-mesh border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-purple-500/10 text-purple-600 border-purple-200">
            <UserCheck className="w-3 h-3 mr-1.5" /> Identity · Education · Financial · All in One
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-foreground tracking-tight leading-tight">
            Background Checks<br className="hidden sm:block" /> in Nigeria — Automated
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Replace slow, expensive manual background checking with Arapoint's automated platform. Verify identity (NIN), financial identity (BVN), and education credentials (WAEC, NECO, NABTEB) in one request. Results in minutes, not days.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                Start Background Checks <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/employment-screening">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                See Employment Screening
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground">
            {["Identity confirmed", "Education verified", "3–5 minute results", "₦391 per candidate"].map(t => (
              <div key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-b border-border/50 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-5">
              <h2 className="text-3xl font-heading font-bold">Background checks in Nigeria — the problem</h2>
              <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
                <p>Traditional background checking in Nigeria involves calling examination bodies, contacting previous employers, visiting government offices, and waiting days for responses. It is expensive, inconsistent, and easy to bypass with forged documents.</p>
                <p>Studies show that a significant percentage of Nigerian job applicants misrepresent their qualifications. Fake WAEC certificates, altered NECO results, and incorrect NIN details are common problems that traditional verification fails to catch reliably.</p>
                <p>Arapoint solves this by querying each verification source directly — NIMC for NIN, CBN for BVN, and each examination body for SSCE results. There is no intermediary and no reliance on documents presented by the candidate.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-background border border-border/50 rounded-2xl p-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-muted-foreground text-xs mb-2 uppercase tracking-wider">Traditional background check</p>
                    {["3–10 days", "₦5,000–₦25,000+", "Manual, error-prone", "Document-dependent", "No cross-referencing"].map(i => (
                      <div key={i} className="flex items-center gap-2 py-1.5 text-muted-foreground"><span className="w-3 h-3 rounded-full bg-red-200 flex-shrink-0" />{i}</div>
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold text-primary text-xs mb-2 uppercase tracking-wider">Arapoint background check</p>
                    {["3–5 minutes", "₦391 per candidate", "Automated, accurate", "Source-connected", "Automatic cross-match"].map(i => (
                      <div key={i} className="flex items-center gap-2 py-1.5"><CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />{i}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">What Arapoint checks in a background verification</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Identity Verification", points: ["NIN from NIMC registry", "Full legal name and DOB", "Gender, phone, state of origin", "Real-time — under 2 seconds", "Fraud flag detection"], color: "blue" },
              { icon: Building2, title: "Financial Identity Check", points: ["BVN from CBN system", "Name and DOB from bank records", "NIN-BVN name similarity score", "DOB consistency check", "Cross-institution fraud detection"], color: "green" },
              { icon: GraduationCap, title: "Education Credential Check", points: ["WAEC, NECO, NABTEB, NBAIS", "Subject grades from source", "English & Maths credit check", "5-credit minimum analysis", "PASS / FAIL determination"], color: "purple" },
            ].map(({ icon: Icon, title, points, color }) => (
              <div key={title} className={`bg-background border border-${color}-200/50 rounded-2xl p-6 space-y-4`}>
                <div className={`h-12 w-12 rounded-xl bg-${color}-500/10 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
                <h3 className="font-heading font-bold text-lg">{title}</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {points.map(p => (
                    <li key={p} className="flex items-center gap-2"><CheckCircle2 className={`w-3.5 h-3.5 text-${color}-600 flex-shrink-0`} />{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y border-border/50 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Who needs background checks in Nigeria?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Briefcase, title: "Corporate Employers", desc: "Verify candidates before onboarding. Protect your company from credential fraud and confirm identity before granting system access." },
              { icon: Building2, title: "Fintechs & Banks", desc: "KYC compliance requires identity verification for all customers. Background checks on employees and vendors protect against insider fraud." },
              { icon: Zap, title: "Gig & Logistics Platforms", desc: "Verify driver, rider, and delivery agent identities before activation. Confirm that platform participants are who they claim to be." },
              { icon: Shield, title: "Insurance Companies", desc: "Confirm policyholder identities during registration. Verify education credentials for scholarship and graduate-linked insurance products." },
              { icon: UserCheck, title: "Recruitment Agencies", desc: "Offer verified candidate profiles to clients. Use Arapoint's API to automate certificate verification and reduce liability from unverified referrals." },
              { icon: GraduationCap, title: "Schools & Universities", desc: "Verify O'Level results during admissions. Detect altered certificates before offering admission or scholarships." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-background border border-border/50 rounded-xl p-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center text-sm text-muted-foreground max-w-2xl mx-auto">
            <p>Arapoint provides identity verification, education verification, and employment screening for Nigerian businesses. Arapoint is used for KYC compliance, pre-employment background checks, WAEC certificate verification, NECO result confirmation, NIN verification, BVN lookup, and fraud prevention across Nigeria.</p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Frequently Asked Questions about Background Checks in Nigeria</h2>
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
        <p>Related: <Link href="/employment-screening" className="text-primary hover:underline">Employment Screening</Link> · <Link href="/identity-verification" className="text-primary hover:underline">Identity Verification</Link> · <Link href="/education-verification" className="text-primary hover:underline">Education Verification</Link> · <Link href="/kyc-api" className="text-primary hover:underline">KYC API</Link> · <Link href="/nin-verification" className="text-primary hover:underline">NIN Verification</Link></p>
      </div>

      <section className="py-16 px-4 bg-primary">
        <div className="container max-w-3xl mx-auto text-center space-y-5 text-primary-foreground">
          <h2 className="text-3xl font-heading font-bold">Run your first background check today</h2>
          <p className="text-primary-foreground/80">Complete background check for ₦391. NIN + BVN + SSCE verified. Result in 3–5 minutes.</p>
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
