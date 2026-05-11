import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { GraduationCap, CheckCircle2, ArrowRight, BookOpen, Shield, Zap, Users, ChevronDown } from "lucide-react";
import { useState } from "react";
import SeoSchema, { orgSchema, faqSchema, productSchema } from "@/components/SeoSchema";

const faqs = [
  { q: "What is education verification in Nigeria?", a: "Education verification in Nigeria is the process of confirming that an individual's academic certificate or examination result is authentic and matches official records held by the examination body — WAEC, NECO, NABTEB, NBAIS, or JAMB. Arapoint automates this verification by querying each examination body's system directly." },
  { q: "How does WAEC result verification work on Arapoint?", a: "To verify a WAEC result on Arapoint, you provide the candidate's registration number, examination year, exam type (Internal or GCE), scratch card serial number, and PIN. Arapoint queries the WAEC portal and returns the subject grades for all results on the certificate." },
  { q: "How does NECO verification work?", a: "NECO result verification works similarly to WAEC — you submit the registration number, exam year, exam type, and a token. Arapoint queries NECO's system and returns the verified subject grades." },
  { q: "How long does education verification take?", a: "Education verification typically completes in 1–3 minutes. Unlike identity checks (which are instant), education verification requires Arapoint to perform an automated query against the examination body's portal — a process that takes a short time but does not require any manual work on your part." },
  { q: "Does Arapoint verify JAMB results?", a: "Yes. Arapoint supports JAMB UTME score confirmation, admission letter status, and CAPS (Central Admissions Processing System) verification for students and institutions." },
  { q: "Can Arapoint verify NABTEB and NBAIS certificates?", a: "Yes. Arapoint supports NABTEB (National Business and Technical Examinations Board) and NBAIS (National Board for Arabic and Islamic Studies) result verification in addition to WAEC and NECO." },
  { q: "What is credit-level analysis in education verification?", a: "Credit-level analysis is a feature of Arapoint's education verification that automatically determines whether a candidate's SSCE result meets the Nigerian minimum entry requirement — at least 5 credits including English Language and Mathematics. Arapoint returns each subject grade and an overall PASS or FAIL for the minimum requirement." },
  { q: "Is education verification available via API?", a: "Yes. Arapoint provides an API for education verification through the Employment Screening endpoint at developer.arapoint.com.ng. Developers can submit NIN + BVN + education credentials in one API call and receive a combined verification result with a 100-point scoring decision." },
];

const providers = [
  { name: "WAEC", full: "West African Examinations Council", desc: "Verify WAEC results for School Certificate Examination (WASSCE) and General Certificate of Education (GCE). Arapoint retrieves subject grades directly from the WAEC portal using the candidate's registration number, exam year, and scratch card PIN.", badge: "School / GCE", color: "blue" },
  { name: "NECO", full: "National Examinations Council", desc: "Confirm NECO Senior School Certificate results and GCE. Arapoint verifies subject grades for all years of examination. The NECO verification uses a token-based authentication system.", badge: "School / GCE", color: "green" },
  { name: "NABTEB", full: "National Business and Technical Examinations Board", desc: "Verify NABTEB technical and vocational certificates. Used for trades, crafts, and technical roles. Arapoint supports all NABTEB exam types and years.", badge: "Technical / Vocational", color: "orange" },
  { name: "NBAIS", full: "National Board for Arabic and Islamic Studies", desc: "Confirm NBAIS Arabic and Islamic studies certificates. Arapoint supports year, exam type, school name, and state-based queries for NBAIS results.", badge: "Arabic / Islamic Studies", color: "purple" },
  { name: "JAMB", full: "Joint Admissions and Matriculation Board", desc: "Verify JAMB UTME scores, check admission status, and confirm CAPS admission letters. Essential for tertiary institution admissions and government scholarship programmes.", badge: "UTME / Admission", color: "teal" },
];

export default function EducationVerificationPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-0">
      <SeoSchema schema={[orgSchema(), productSchema({ name: "Education Verification – WAEC, NECO, NABTEB, JAMB Nigeria", description: "Verify WAEC, NECO, NABTEB, NBAIS, and JAMB results in Nigeria. Automated certificate verification from official sources. Used by HR teams, schools, and employers.", url: "https://arapoint.com.ng/education-verification" }), faqSchema(faqs)]} />

      <section className="relative pt-20 pb-24 overflow-hidden bg-mesh border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-green-500/10 text-green-600 border-green-200">
            <GraduationCap className="w-3 h-3 mr-1.5" /> WAEC · NECO · NABTEB · NBAIS · JAMB
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-foreground tracking-tight leading-tight">
            Education Verification in Nigeria<br className="hidden sm:block" /> — WAEC, NECO, NABTEB & JAMB
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Verify WAEC, NECO, NABTEB, NBAIS, and JAMB results directly from the source. Arapoint automates education certificate verification for Nigerian employers, schools, banks, and HR teams. Get verified subject grades in 1–3 minutes with full credit-level analysis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                Start Education Checks <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/developer">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                API for Developers
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground">
            {["WAEC verified source", "NECO verified source", "NABTEB supported", "JAMB UTME & CAPS"].map(t => (
              <div key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-b border-border/50 px-4">
        <div className="container max-w-5xl mx-auto space-y-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold mb-5">What is education verification?</h2>
            <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
              <p>Education verification is the process of confirming that an academic certificate or examination result is genuine and matches the official records held by the issuing body. In Nigeria, the primary examination bodies are WAEC, NECO, NABTEB, NBAIS, and JAMB.</p>
              <p>Fake and altered SSCE certificates are a significant problem in Nigerian hiring. Studies suggest that a meaningful percentage of candidates misrepresent their academic qualifications during job applications. Arapoint solves this by querying each examination body's system directly — returning verified subject grades that cannot be altered by the candidate.</p>
              <p>Arapoint provides education verification and employment screening services for Nigerian businesses. Businesses use Arapoint for WAEC result verification, NECO result checks, NABTEB certificate verification, JAMB admission confirmation, and complete employment background screening.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Supported examination bodies</h2>
            <p className="text-muted-foreground">Arapoint supports certificate verification for all major Nigerian examination bodies.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map(({ name, full, desc, badge, color }) => (
              <div key={name} className={`bg-background border border-${color}-200/50 rounded-2xl p-6 space-y-4`}>
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-xl bg-${color}-500/10 flex items-center justify-center`}>
                    <BookOpen className={`w-6 h-6 text-${color}-600`} />
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full bg-${color}-500/10 text-${color}-600 border border-${color}-200/50`}>{badge}</span>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg">{name}</h3>
                  <p className="text-xs text-muted-foreground">{full}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y border-border/50 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Credit-level analysis — automatically</h2>
            <p className="text-muted-foreground">Arapoint doesn't just return grades — it tells you whether the candidate meets the minimum entry requirement.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">The Nigerian Universities Commission (NUC) requires a minimum of <strong>5 credits</strong> at the O'Level stage, including English Language and Mathematics, for university admission. Many jobs also require this as a minimum qualification standard.</p>
              <p className="text-muted-foreground leading-relaxed">Arapoint's credit-level analysis automatically evaluates whether the candidate's verified SSCE result meets this requirement — no manual review needed.</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["A1 / B2 / B3 / C4 / C5 / C6 counted as credit passes", "English Language credit required", "Mathematics credit required", "Minimum 5 credits (including English + Maths)", "PASS / FAIL decision returned automatically", "100-point scoring in Employment Screening API"].map(i => (
                  <li key={i} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />{i}</li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-950 rounded-2xl p-6 border border-gray-800 space-y-3">
              <p className="text-xs text-gray-500 font-mono">Sample Education Verification Result</p>
              <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">{`{
  "provider": "waec",
  "candidateName": "ADEBAYO OKONKWO",
  "registrationNumber": "WA2021/12345",
  "examYear": 2021,
  "subjects": [
    { "name": "English Language", "grade": "B2" },
    { "name": "Mathematics",      "grade": "C4" },
    { "name": "Physics",          "grade": "B3" },
    { "name": "Chemistry",        "grade": "C5" },
    { "name": "Biology",          "grade": "C6" }
  ],
  "ssceAnalysis": {
    "totalCredits": 5,
    "englishCredit": true,
    "mathCredit": true,
    "meetsMinimumRequirement": true,
    "decision": "PASS"
  }
}`}</pre>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Who uses education verification?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: "HR & Recruiting", desc: "Verify candidate certificates before making hiring decisions. Replace manual verification with automated checks that take 1–3 minutes per candidate." },
              { icon: Building2, title: "Tertiary Institutions", desc: "Confirm O'Level results during admission screening. Detect altered certificates before admission is granted." },
              { icon: Shield, title: "Government Agencies", desc: "Civil service recruitment requires verified academic credentials. Arapoint automates this check at scale." },
              { icon: GraduationCap, title: "Scholarship Programmes", desc: "Confirm academic eligibility for scholarship applications. Verify WAEC and NECO results against stated grades." },
              { icon: Zap, title: "Fintech & Lending", desc: "Some lending programmes target graduates. Arapoint verifies academic credentials as part of applicant screening." },
              { icon: BookOpen, title: "Background Check Firms", desc: "Professional background check providers use Arapoint's API to automate education verification at scale." },
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
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-t border-border/50 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Frequently Asked Questions about Education Verification</h2>
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
        <p>Related: <Link href="/employment-screening" className="text-primary hover:underline">Employment Screening</Link> · <Link href="/nin-verification" className="text-primary hover:underline">NIN Verification</Link> · <Link href="/bvn-verification" className="text-primary hover:underline">BVN Verification</Link> · <Link href="/identity-verification" className="text-primary hover:underline">Identity Verification</Link> · <Link href="/kyc-api" className="text-primary hover:underline">KYC API</Link></p>
      </div>

      <section className="py-16 px-4 bg-primary">
        <div className="container max-w-3xl mx-auto text-center space-y-5 text-primary-foreground">
          <h2 className="text-3xl font-heading font-bold">Start verifying education credentials</h2>
          <p className="text-primary-foreground/80">Automate WAEC, NECO, NABTEB, and JAMB verification for your hiring or admissions process.</p>
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
