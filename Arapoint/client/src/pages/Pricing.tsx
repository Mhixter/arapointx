import { CheckCircle2, ArrowRight, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const plans = [
  {
    name: "Pay-As-You-Go",
    tagline: "For individuals & small teams",
    price: null,
    highlight: "No monthly fee",
    popular: false,
    features: [
      "Access to all verification services",
      "Pay only per successful check",
      "Prepaid wallet top-up",
      "API access with 60 req/min rate limit",
      "Developer sandbox (free)",
      "Email support",
      "API logs & usage history",
    ],
    cta: { label: "Get Started Free", href: "/auth/signup" },
  },
  {
    name: "Growth",
    tagline: "For scaling businesses",
    price: null,
    highlight: "Volume discounts",
    popular: true,
    features: [
      "Everything in Pay-As-You-Go",
      "Discounted per-check rates (high volume)",
      "300 req/min API rate limit",
      "Priority email & phone support",
      "Dedicated account manager",
      "Custom webhook configurations",
      "Monthly usage reports",
      "Team member access (up to 5 seats)",
    ],
    cta: { label: "Contact Sales", href: "/contact" },
  },
  {
    name: "Enterprise",
    tagline: "For large organisations",
    price: null,
    highlight: "Custom pricing",
    popular: false,
    features: [
      "Everything in Growth",
      "Custom per-check pricing",
      "Unlimited API rate limits",
      "SLA guarantee with uptime credits",
      "Dedicated infrastructure option",
      "On-premise or private cloud deployment",
      "Unlimited team seats",
      "24/7 priority support",
      "NDPA compliance reports & audit logs",
    ],
    cta: { label: "Talk to Sales", href: "/contact" },
  },
];

const faqs = [
  {
    q: "How does billing work?",
    a: "Arapoint uses a prepaid wallet system. You top up your wallet and each successful verification deducts the applicable fee. There are no monthly subscription charges unless you are on a Growth or Enterprise plan.",
  },
  {
    q: "Am I charged for failed lookups?",
    a: "No. If a verification returns a 404 (record not found in the source database), you are not charged. You are only charged for successful verifications (HTTP 200 responses).",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept bank transfers, debit cards, and USSD payments via Paystack and Monnify. All payments are in Nigerian Naira (NGN).",
  },
  {
    q: "Can I get a refund on my wallet balance?",
    a: "Wallet top-ups are generally non-refundable. In cases of verified service failures or incorrect charges, we will credit your wallet on a case-by-case basis. Contact support@arapoint.com.ng for assistance.",
  },
  {
    q: "Are there volume discounts?",
    a: "Yes. Accounts that exceed high monthly verification volumes qualify for discounted per-check rates. Contact our sales team at sales@arapoint.com.ng to discuss pricing.",
  },
  {
    q: "Is the sandbox free to use?",
    a: "Yes — the sandbox environment is completely free and does not deduct from your wallet balance. Use it to test all API endpoints with realistic mock responses before going live.",
  },
  {
    q: "What is the minimum top-up amount?",
    a: "Contact our support team at support@arapoint.com.ng to learn about wallet top-up requirements and payment options.",
  },
];

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-muted/30 border-b border-border/50 py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            Simple, Transparent Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight text-foreground">
            Pay only for what you use.<br className="hidden sm:block" /> No surprises.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Arapoint charges per successful verification with no monthly fees for standard usage. Top up your wallet and start verifying instantly.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {["No monthly commitment", "Pay-as-you-go", "Volume discounts available", "Free sandbox"].map(item => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl font-heading font-bold">Choose your plan</h2>
            <p className="text-muted-foreground text-sm">All plans use the same per-check pricing. Growth and Enterprise add volume discounts and higher limits.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-7 flex flex-col gap-6 relative ${plan.popular ? "border-primary shadow-lg shadow-primary/10 bg-primary/5" : "border-border/50 bg-background"}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-heading font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{plan.tagline}</p>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-foreground">{plan.highlight}</span>
                  </div>
                </div>
                <ul className="space-y-3 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.cta.href}>
                  <Button
                    size="lg"
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full gap-2"
                  >
                    {plan.cta.label} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl font-heading font-bold">Frequently asked questions</h2>
            <p className="text-muted-foreground text-sm">Everything you need to know about pricing and billing.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border/50 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                  <HelpCircle className={`w-4 h-4 flex-shrink-0 transition-colors ${openFaq === i ? "text-primary" : "text-muted-foreground"}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 border-t border-border/40 bg-muted/20">
                    <p className="text-sm text-muted-foreground leading-relaxed pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/30 border-t border-border/50 py-16 px-4">
        <div className="container max-w-xl mx-auto text-center space-y-5">
          <h2 className="text-2xl font-heading font-bold">Get started today</h2>
          <p className="text-muted-foreground text-sm">Top up your wallet, run your first verification, and see Arapoint in action — no lock-ins, no monthly fees.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="h-11 px-7 gap-2">
                Create Free Account <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="h-11 px-7">Talk to Sales</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
