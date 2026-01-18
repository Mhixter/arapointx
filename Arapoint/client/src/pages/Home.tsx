import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Shield, GraduationCap, Building2, Zap, ChevronRight, Lock, ArrowRight, Zap as ZapIcon } from "lucide-react";
import { Link } from "wouter";
import heroImage from "@/assets/avatar-illustration.jfif";

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
                <span>NIMC Connected</span>
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

