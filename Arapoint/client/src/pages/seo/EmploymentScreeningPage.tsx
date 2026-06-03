import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Briefcase, CheckCircle2, ArrowRight, Shield, Zap, Users, BarChart3, Clock, Building2, GraduationCap, ChevronDown } from "lucide-react";
import { useState } from "react";
import SeoSchema, { orgSchema, faqSchema, productSchema } from "@/components/SeoSchema";
import { TestimonialsSlider } from "@/components/TestimonialsSlider";

const faqs = [
  { q: "What is employment screening?", a: "Employment screening (also called pre-employment background checks) is the process of verifying a job candidate's identity, academic credentials, and other background information before hiring. In Nigeria, this typically involves verifying the candidate's NIN, BVN, and SSCE result (WAEC, NECO, or NABTEB certificate)." },
  { q: "What does Arapoint's employment screening include?", a: "Arapoint's Employment Screening API combines three checks in a single request: (1) NIN verification from the NIMC registry, (2) BVN verification from the CBN system, and (3) SSCE education certificate verification from WAEC, NECO, NABTEB, or NBAIS. All data is cross-referenced automatically to produce a 100-point score and a PASS / REVIEW / FAIL decision." },
  { q: "How long does employment screening take on Arapoint?", a: "NIN and BVN verification complete in under 2 seconds. Education certificate verification (SSCE) takes 1–3 minutes because it requires an automated query to the examination body's portal. The total employment screening result is typically available within 3–5 minutes." },
  { q: "What is the PASS / REVIEW / FAIL scoring system?", a: "Arapoint's Employment Screening API scores candidates on a 100-point scale across 10 checks: NIN verified (15 pts), BVN verified (15 pts), NIN-BVN name similarity (10 pts), NIN-BVN DOB match (5 pts), education record found (10 pts), education name match (10 pts), education DOB match (5 pts), English Language credit (10 pts), Mathematics credit (10 pts), and 5-credit minimum met (10 pts). PASS = 85+, REVIEW = 60–84, FAIL = below 60." },
  { q: "What education providers does employment screening support?", a: "Arapoint's Employment Screening API supports WAEC (West African Examinations Council), NECO (National Examinations Council), NABTEB (National Business and Technical Examinations Board), and NBAIS (National Board for Arabic and Islamic Studies)." },
  { q: "Is employment screening available via API?", a: "Yes. The Employment Screening API is available at developer.arapoint.com.ng. A single POST request with NIN, BVN, and education credentials returns a complete screening result with cross-reference analysis and automated PASS / REVIEW / FAIL decision." },
  { q: "How much does employment screening cost?", a: "Employment screening on Arapoint costs ₦391 per candidate (NIN ₦130 + BVN ₦80 + Education ₦250, with a 15% bundle discount). This is one of the lowest rates for complete three-layer employment screening in Nigeria." },
  { q: "Can Arapoint screen multiple candidates at once?", a: "Yes. Batch screening is available via the API. You can submit multiple candidate screening requests and process them in parallel. The API returns individual results as each completes. Contact Arapoint for enterprise volume pricing." },
];

export default function EmploymentScreeningPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-0">
      <SeoSchema schema={[orgSchema(), productSchema({ name: "Employment Screening API – NIN + BVN + SSCE Nigeria", description: "Pre-employment background checks for Nigerian businesses. NIN verification, BVN lookup, and SSCE education certificate verification in one API call. Automated PASS/REVIEW/FAIL scoring.", url: "https://arapoint.com.ng/employment-screening" }), faqSchema(faqs)]} />

      <section className="relative pt-20 pb-24 overflow-hidden bg-mesh border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            <Briefcase className="w-3 h-3 mr-1.5" /> NIN + BVN + SSCE · One API Call · PASS / REVIEW / FAIL
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-foreground tracking-tight leading-tight">
            Employment Screening API<br className="hidden sm:block" /> for Nigerian Businesses
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The most complete pre-employment background check in Nigeria. Verify NIN, BVN, and SSCE certificate in a single API call. Arapoint cross-references all three sources and returns a 100-point score with an automated PASS / REVIEW / FAIL decision — in under 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/employment-screening/register">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                Start Screening Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/employment-screening/login">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                Sign In to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground">
            {["NIN verified (NIMC)", "BVN verified (CBN)", "SSCE from source", "₦391 per candidate"].map(t => (
              <div key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-b border-border/50 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-heading font-bold">One API call. Complete screening.</h2>
              <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
                <p>Traditional employment screening in Nigeria is slow, expensive, and manual. HR teams spend days chasing physical certificates, contacting examination bodies, and cross-referencing information by hand.</p>
                <p>Arapoint replaces all of that with a single API call. Submit the candidate's NIN, BVN, and education credentials and receive a complete screening result — with cross-reference analysis and automated scoring — within minutes.</p>
                <p>Arapoint provides employment screening and background check services for Nigerian businesses. Businesses use Arapoint for pre-employment NIN verification, BVN checks, WAEC result verification, and automated hiring decisions.</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[{ stat: "100pt", label: "Scoring scale" }, { stat: "3–5 min", label: "Total time" }, { stat: "₦391", label: "Per candidate" }].map(({ stat, label }) => (
                  <div key={label} className="bg-background border border-border/50 rounded-xl p-4 text-center">
                    <p className="text-xl font-bold text-foreground">{stat}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { icon: Shield, title: "NIN Verification (15 pts)", desc: "Confirms the candidate's National Identification Number from NIMC. Returns full name, date of birth, and gender." },
                  { icon: Building2, title: "BVN Verification (15 pts)", desc: "Confirms the Bank Verification Number from CBN. Cross-references name and DOB against NIN data." },
                  { icon: GraduationCap, title: "SSCE Verification (30 pts)", desc: "Verifies WAEC, NECO, NABTEB, or NBAIS result from the examination body. Checks English, Maths, and 5-credit minimum." },
                  { icon: BarChart3, title: "Cross-Reference Analysis (40 pts)", desc: "Name similarity score, DOB match, NIN-BVN-SSCE consistency check. Fraud flag detection across all three sources." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-3 bg-background border border-border/50 rounded-xl p-4">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                    </div>
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
            <h2 className="text-3xl font-heading font-bold">PASS / REVIEW / FAIL scoring explained</h2>
            <p className="text-muted-foreground">Arapoint doesn't just return raw data — it makes an intelligent decision based on all the evidence.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { decision: "PASS", score: "85 – 100", color: "green", desc: "All major checks passed. Identity confirmed, NIN-BVN data consistent, education credential verified with minimum 5 credits including English and Maths. Candidate meets requirements." },
              { decision: "REVIEW", score: "60 – 84", color: "yellow", desc: "Most checks passed but some flags detected. Could be a name spelling variation, partial education match, or minor DOB inconsistency. Human review recommended." },
              { decision: "FAIL", score: "Below 60", color: "red", desc: "Significant issues detected. NIN-BVN mismatch, unverified education record, or the candidate does not meet the minimum 5-credit SSCE requirement." },
            ].map(({ decision, score, color, desc }) => (
              <div key={decision} className={`bg-background border border-${color}-200 rounded-2xl p-6 space-y-3`}>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-${color}-500/10 text-${color}-600`}>{decision}</div>
                <p className={`text-2xl font-bold text-${color}-600`}>{score} pts</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-gray-950 rounded-2xl p-6 border border-gray-800 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-gray-500 font-mono">employment-screening.js</span>
            </div>
            <pre className="text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{`const response = await fetch(
  "https://arapoint.com.ng/api/v1/developer/verify/employment-screening",
  {
    method: "POST",
    headers: { "X-API-Key": "ara_your_key", "Content-Type": "application/json" },
    body: JSON.stringify({
      nin: "12345678901",
      bvn: "12345678901",
      educationProvider: "waec",
      registrationNumber: "WA2020/12345",
      examYear: 2020, examType: "Internal",
      cardSerialNumber: "CS123456", cardPin: "1234"
    })
  }
);
const { data } = await response.json();
// data.decision   → "PASS"
// data.score      → 95
// data.summary    → "NIN and BVN confirmed. Education verified. 5 credits met."
// data.flags      → []`}</pre>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y border-border/50 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Who uses employment screening?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Building2, title: "Fintechs & Neobanks", desc: "Screen staff before granting access to customer data and financial systems. Confirm identity and academic qualifications for compliance roles." },
              { icon: Users, title: "Recruiting Agencies", desc: "Validate candidate credentials at scale before shortlisting. Replace manual WAEC and NECO certificate checking with automated verification." },
              { icon: Briefcase, title: "Corporate HR Teams", desc: "Automate pre-employment background checks. Reduce time-to-hire by removing manual verification bottlenecks from the onboarding process." },
              { icon: GraduationCap, title: "Staffing Agencies", desc: "Screen large volumes of candidates for contract and temporary positions. API access makes batch processing fast and cost-effective." },
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

      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Frequently Asked Questions about Employment Screening</h2>
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
        <p>Related: <Link href="/identity-verification" className="text-primary hover:underline">Identity Verification</Link> · <Link href="/nin-verification" className="text-primary hover:underline">NIN Verification</Link> · <Link href="/bvn-verification" className="text-primary hover:underline">BVN Verification</Link> · <Link href="/education-verification" className="text-primary hover:underline">Education Verification</Link> · <Link href="/kyc-api" className="text-primary hover:underline">KYC API</Link></p>
      </div>

      <section className="bg-muted/20 border-y border-border/50">
        <TestimonialsSlider />
      </section>

      <section className="py-16 px-4 bg-primary">
        <div className="container max-w-3xl mx-auto text-center space-y-5 text-primary-foreground">
          <h2 className="text-3xl font-heading font-bold">Screen your first candidate today</h2>
          <p className="text-primary-foreground/80">Complete pre-employment background check for ₦391. NIN + BVN + SSCE verified. Result in 3–5 minutes.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/developer">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                Explore API
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
