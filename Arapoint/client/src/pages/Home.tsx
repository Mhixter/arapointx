import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Shield, GraduationCap, Building2, Zap, ChevronRight, Lock, ArrowRight, Code2, Terminal, Globe, Webhook } from "lucide-react";
import { Link } from "wouter";
import heroImage from "@/assets/avatar-illustration.jfif";

const DEVELOPER_URL = "https://developer.arapoint.com.ng";

export default function Home() {
  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-mesh">
        <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 animate-in slide-in-from-left-5 duration-700 fade-in justify-self-start max-w-lg">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
              <Shield className="w-3 h-3 mr-1" /> NDPA Compliant & Secure
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-foreground tracking-tight leading-[1.15]">
              The Trusted Standard for <span className="text-primary">Identity</span> in Nigeria
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Verify identities, validate education results, and access digital services securely. Arapoint is the all-in-one platform for individuals and businesses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                  Get Started Now <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-background/50 backdrop-blur-sm">
                  View Services
                </Button>
              </Link>
            </div>
            
            <div className="pt-6 sm:pt-8 flex flex-wrap items-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Registry Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Instant Results</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Bank-Grade Security</span>
              </div>
            </div>
          </div>

          <div className="relative h-[300px] sm:h-[400px] lg:h-[600px] w-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/50 animate-in slide-in-from-right-5 duration-1000 fade-in delay-200 group justify-self-start lg:justify-self-end">
             <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
             <img 
              src={heroImage} 
              alt="Secure Identity Verification" 
              className="object-contain w-full h-full transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl font-heading font-bold">Comprehensive Verification Suite</h2>
          <p className="text-muted-foreground">Everything you need to verify customers, employees, and businesses in one place.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Shield}
            title="Identity Verification"
            description="Instant NIN and BVN validation directly from source databases. Biometric facial matching included."
          />
          <FeatureCard 
            icon={GraduationCap}
            title="Education Checks"
            description="Verify JAMB admissions, WAEC, and NECO results. Generate official digital certificates."
          />
          <FeatureCard 
            icon={Building2}
            title="Business Validation"
            description="Confirm CAC registration status, Tax Identification Number (TIN), and IPE clearance."
          />
          <FeatureCard 
            icon={Zap}
            title="VTU & Utilities"
            description="Purchase airtime, data bundles, and pay electricity bills instantly. Result checker pins available."
          />
          <FeatureCard 
            icon={Lock}
            title="Fraud Prevention"
            description="Advanced risk scoring and AML checks to keep your business safe from bad actors."
          />
          <FeatureCard 
            icon={CheckCircle2}
            title="API Integration"
            description="Developer-friendly APIs to integrate verification directly into your own applications."
          />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-muted py-24 border-y border-border/50">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-heading font-bold">Simple & Secure Process</h2>
            <p className="text-muted-foreground">Get verified in minutes, not days. Our streamlined process makes identity verification effortless.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary text-2xl font-bold">1</div>
                <h3 className="text-xl font-heading font-bold mb-3">Create Account</h3>
                <p className="text-muted-foreground">Sign up in seconds with your email and basic information. No lengthy paperwork required.</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border/50 transform -translate-y-1/2"></div>
            </div>

            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary text-2xl font-bold">2</div>
                <h3 className="text-xl font-heading font-bold mb-3">Submit Details</h3>
                <p className="text-muted-foreground">Provide your BVN, NIN, or education credentials. Your data is encrypted and secure.</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border/50 transform -translate-y-1/2"></div>
            </div>

            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary text-2xl font-bold">3</div>
                <h3 className="text-xl font-heading font-bold mb-3">Get Results</h3>
                <p className="text-muted-foreground">Instant verification results with detailed reports. Access anytime from your dashboard.</p>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 text-base">
                Start Verifying Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* For Developers Introduction */}
      <section id="developers" className="container px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-indigo-950/40 text-indigo-400 border-indigo-800">
              <Code2 className="w-3 h-3 mr-1.5" /> Developer API
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold leading-tight">
              Build powerful apps with the <span className="text-primary">Arapoint API</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Integrate Nigeria's most comprehensive identity and verification infrastructure directly into your product. Our RESTful API is designed for speed, reliability, and developer experience — so you can go from key to production in minutes.
            </p>
            <ul className="space-y-3">
              {[
                "Verify NIN, BVN, CAC, and education results in real-time",
                "Pay-as-you-go pricing with no monthly commitment",
                "99.9% uptime SLA with sub-2-second response times",
                "Sandbox environment for testing at no cost",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="text-primary h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a href={DEVELOPER_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                  Visit Developer Portal <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href={`${DEVELOPER_URL}/docs`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  Read the Docs
                </Button>
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-950 rounded-2xl p-6 border border-gray-800 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-gray-500 font-mono">verify-nin.js</span>
              </div>
              <pre className="text-sm text-gray-300 font-mono overflow-x-auto leading-relaxed">{`const response = await fetch(
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
// { firstName: "JOHN", lastName: "DOE",
//   dateOfBirth: "1990-01-15", ... }`}</pre>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Terminal, label: "REST API", desc: "Clean JSON" },
                { icon: Globe, label: "Sandbox", desc: "Free testing" },
                { icon: Webhook, label: "Webhooks", desc: "Real-time events" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="bg-muted rounded-xl p-4 text-center border border-border/50">
                  <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Visit Developer Portal CTA */}
      <section className="container px-4">
        <div className="bg-gray-950 border border-indigo-900/50 rounded-2xl sm:rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-transparent" />
          <div className="relative z-10 grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-indigo-950/60 text-indigo-300 border-indigo-800">
                <Code2 className="w-3 h-3 mr-1.5" /> developer.arapoint.com.ng
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white">Start building in minutes</h2>
              <p className="text-gray-400 leading-relaxed">
                The Arapoint Developer Portal gives you everything you need — API keys, live logs, interactive documentation, wallet top-ups, and a full sandbox — all in one place.
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Identity APIs", items: ["NIN Verification", "BVN Lookup", "CAC Check"] },
                  { label: "Education APIs", items: ["WAEC Results", "NECO Results", "JAMB Status"] },
                ].map((group) => (
                  <div key={group.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs font-semibold text-indigo-400 mb-2">{group.label}</p>
                    <ul className="space-y-1">
                      {group.items.map((item) => (
                        <li key={item} className="text-xs text-gray-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-500" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <a href={DEVELOPER_URL} target="_blank" rel="noopener noreferrer" className="block">
                <Button size="lg" className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-500">
                  Go to Developer Portal <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mb-20 px-4">
        <div className="bg-primary rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-20 text-center text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-heading font-bold">Ready to get started?</h2>
            <p className="text-primary-foreground/80 text-lg">Join thousands of Nigerian businesses using Arapoint to trust their customers.</p>
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="h-14 px-10 text-lg shadow-xl hover:shadow-2xl transition-all">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300">
      <CardHeader>
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

