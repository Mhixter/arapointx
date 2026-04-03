export default function TermsOfService() {
  const lastUpdated = "April 3, 2026";

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: `By accessing or using Arapoint (arapoint.com.ng), its API, developer portal, or any related services, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use our services.

These Terms constitute a legally binding agreement between you ("User", "Developer", or "Customer") and Arapoint Technologies ("Arapoint", "we", "us", or "our").`,
    },
    {
      title: "2. Eligibility",
      content: `You must be at least 18 years old and legally capable of entering into contracts under Nigerian law to use our services. By registering, you represent that you meet these requirements.

Businesses must be duly registered under Nigerian law (or their home jurisdiction for international clients). You are responsible for ensuring that your use of Arapoint complies with all applicable laws in your jurisdiction.`,
    },
    {
      title: "3. Description of Services",
      content: `Arapoint provides identity verification and digital services including:

• National Identification Number (NIN) verification via NIMC
• Bank Verification Number (BVN) lookup
• CAC business registration verification
• Academic result verification (WAEC, NECO, NABTEB, JAMB)
• Virtual Top-Up (VTU) for airtime, data, and utility bills
• Developer API access for integration into third-party applications
• Wallet-based prepaid billing for API consumers

Services are subject to availability and may be modified, suspended, or discontinued at any time with reasonable notice.`,
    },
    {
      title: "4. Account Registration & Security",
      content: `You must provide accurate, complete, and current information when registering. You are responsible for maintaining the confidentiality of your password and API keys. You must notify us immediately at support@arapoint.com.ng if you suspect unauthorised access to your account.

Arapoint is not liable for any loss or damage arising from your failure to protect your credentials. We reserve the right to suspend or terminate accounts that are inactive, suspected of fraud, or in violation of these Terms.`,
    },
    {
      title: "5. Permitted Use",
      content: `You agree to use Arapoint only for lawful purposes and in accordance with these Terms. Permitted uses include:

• Verifying the identity of your customers, employees, or business partners
• Validating academic credentials for admissions or employment purposes
• CAC verification for business due diligence
• Integrating our API into your legitimate business application

You must obtain appropriate consent from individuals whose data you submit for verification, in accordance with the NDPA 2023.`,
    },
    {
      title: "6. Prohibited Use",
      content: `You must not use Arapoint to:

• Conduct unlawful surveillance, stalking, or harassment of individuals
• Submit verification requests without the subject's knowledge or consent
• Attempt to reverse-engineer, scrape, or circumvent our systems
• Use the API in a way that violates any third party's rights
• Engage in money laundering, fraud, or any criminal activity
• Resell or redistribute our API data without written authorisation
• Submit false, misleading, or fabricated verification requests
• Attempt to access another user's account or data

Violation of these prohibitions may result in immediate account termination and may be reported to Nigerian law enforcement authorities.`,
    },
    {
      title: "7. Wallet, Payments & Billing",
      content: `Arapoint operates on a prepaid wallet system. You must maintain a positive balance to use paid verification services. Funds added to your wallet are non-refundable except at our sole discretion in cases of verified service failure.

Charges are deducted per successful verification as listed on our pricing page. Failed lookups (HTTP 404 — record not found) are not charged. We reserve the right to change pricing with 14 days' notice.

All payments are processed in Nigerian Naira (NGN) via Paystack or Monnify.`,
    },
    {
      title: "8. API Usage",
      content: `Developer API access is subject to rate limits as described in our documentation. You must not attempt to circumvent rate limits. API keys must be kept confidential and used only by your authorised systems.

We reserve the right to revoke API keys that are found to be misused, compromised, or in violation of these Terms. You are responsible for all activity that occurs under your API key.`,
    },
    {
      title: "9. Data & Privacy",
      content: `Your use of Arapoint is also governed by our Privacy Policy. By using our services, you acknowledge that we collect, process, and transmit data as described in that policy. You are responsible for ensuring that your collection and submission of third-party personal data to Arapoint is lawful and compliant with the NDPA 2023.`,
    },
    {
      title: "10. Intellectual Property",
      content: `All content, software, designs, logos, and trademarks on the Arapoint platform are the exclusive property of Arapoint Technologies and may not be copied, reproduced, or used without written permission. Your use of our services does not grant you any intellectual property rights.`,
    },
    {
      title: "11. Limitation of Liability",
      content: `To the maximum extent permitted by Nigerian law, Arapoint's total liability to you for any claim arising from your use of our services shall not exceed the amount you paid to Arapoint in the 30 days preceding the claim.

Arapoint is not liable for: indirect, incidental, or consequential damages; inaccuracies in government database records outside our control; service interruptions caused by third-party providers (NIMC, CBN, etc.); or losses resulting from your failure to secure your account credentials.

Verification results are provided "as-is" from the relevant government source databases. We do not guarantee the accuracy of source data.`,
    },
    {
      title: "12. Indemnification",
      content: `You agree to indemnify and hold Arapoint, its directors, employees, and partners harmless from any claims, damages, or expenses (including legal fees) arising from: your violation of these Terms; your violation of any third party's rights; or your unlawful use of identity data obtained through our platform.`,
    },
    {
      title: "13. Termination",
      content: `Either party may terminate the agreement at any time. You may close your account by contacting support@arapoint.com.ng. We may terminate or suspend your account immediately if you breach these Terms, engage in fraud, or if required by law.

Upon termination, your access to the platform will cease. Remaining wallet balances may be refunded at our discretion, minus any applicable charges.`,
    },
    {
      title: "14. Governing Law & Disputes",
      content: `These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from or relating to these Terms shall be submitted to the courts of competent jurisdiction in Lagos State, Nigeria.

We encourage you to contact us at legal@arapoint.com.ng before initiating any formal dispute proceedings — most issues can be resolved quickly through direct communication.`,
    },
    {
      title: "15. Changes to These Terms",
      content: `We may update these Terms from time to time. We will notify you of significant changes via email or a notice on our platform. Your continued use of Arapoint after such notice constitutes acceptance of the revised Terms. If you do not agree with the changes, you must stop using our services.`,
    },
    {
      title: "16. Contact",
      content: `For questions about these Terms, contact us at:

**Arapoint Technologies**
Email: legal@arapoint.com.ng
Website: arapoint.com.ng`,
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-muted/30 border-b border-border/50 py-16 px-4">
        <div className="container max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl font-heading font-extrabold tracking-tight text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
          <p className="text-muted-foreground leading-relaxed">
            Please read these Terms carefully before using Arapoint. By using our platform, you agree to these Terms in full.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-4">
        <div className="container max-w-3xl mx-auto">
          {/* Table of contents */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-6 mb-12">
            <h2 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">Table of Contents</h2>
            <ul className="grid sm:grid-cols-2 gap-y-2 gap-x-4">
              {sections.map(s => (
                <li key={s.title}>
                  <a
                    href={`#${s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-12">
            {sections.map(section => (
              <div
                key={section.title}
                id={section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                className="space-y-4 scroll-mt-20"
              >
                <h2 className="text-xl font-heading font-bold text-foreground border-b border-border/50 pb-2">{section.title}</h2>
                <div className="text-muted-foreground leading-relaxed text-sm">
                  {section.content.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line mb-3 last:mb-0">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 p-6 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-sm text-foreground font-medium mb-1">Have a legal question?</p>
            <p className="text-sm text-muted-foreground">
              Contact our legal team at{" "}
              <a href="mailto:legal@arapoint.com.ng" className="text-primary hover:underline">legal@arapoint.com.ng</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
