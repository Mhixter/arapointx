export default function PrivacyPolicy() {
  const lastUpdated = "April 3, 2026";

  const sections = [
    {
      title: "1. Introduction",
      content: `Arapoint ("we", "our", or "us") is committed to protecting the personal information of individuals who use our platform. This Privacy Policy explains what data we collect, why we collect it, how we use it, and your rights in relation to that data. This policy applies to all users of arapoint.com.ng and our developer API.

We operate in accordance with the Nigeria Data Protection Act (NDPA) 2023 and adhere to global best practices in data privacy.`,
    },
    {
      title: "2. Information We Collect",
      content: `We collect the following categories of information:

**Account Information:** Name, email address, phone number, and password (stored as a cryptographic hash) when you register.

**Identity Verification Data:** NIN, BVN, CAC registration numbers, or education credentials that you submit for verification. This data is used solely to perform the requested verification and is not retained beyond what is necessary.

**Payment Information:** Wallet transaction records, funding history, and payment references. We do not store full card details — payment processing is handled by PCI-DSS compliant third-party providers (Paystack/Monnify).

**Usage Data:** API call logs, IP addresses, device information, browser type, and timestamps of interactions with our platform.

**Communications:** Support tickets, emails, and messages you send to us.`,
    },
    {
      title: "3. How We Use Your Information",
      content: `We use your information to:

• Provide, operate, and improve our identity verification services
• Process wallet transactions and maintain billing records
• Authenticate your identity and secure your account
• Respond to your support requests and inquiries
• Detect and prevent fraud, abuse, and security incidents
• Comply with legal obligations under Nigerian law
• Send important service notifications (not marketing, unless you opt in)
• Improve our platform through aggregated, anonymised analytics`,
    },
    {
      title: "4. Legal Basis for Processing",
      content: `Under the NDPA 2023, we process your data on the following legal grounds:

• **Contract:** Processing is necessary to provide the services you have signed up for.
• **Legal Obligation:** We retain certain records as required by Nigerian financial and data protection laws.
• **Legitimate Interest:** Fraud detection, security monitoring, and platform improvement.
• **Consent:** For marketing communications (you can withdraw at any time).`,
    },
    {
      title: "5. Data Sharing & Disclosure",
      content: `We do not sell your personal data. We share data only in the following circumstances:

• **Government Databases:** We transmit verification queries to NIMC, CBN-affiliated BVN systems, and other authorised government data sources to fulfil verification requests.
• **Payment Processors:** Paystack and Monnify receive payment information necessary to process wallet funding.
• **Infrastructure Providers:** Cloud hosting and database providers who act as data processors under confidentiality agreements.
• **Legal Requirements:** We may disclose data if required by a Nigerian court order, law enforcement agency, or regulatory authority.`,
    },
    {
      title: "6. Data Retention",
      content: `We retain personal data for as long as necessary to provide our services and comply with legal obligations:

• Account data: Retained for the duration of your account and 7 years thereafter (as required by financial regulations).
• Verification logs: Retained for 2 years for audit and fraud prevention purposes.
• Payment records: Retained for 7 years in accordance with Nigerian financial reporting requirements.
• Support correspondence: Retained for 3 years.

You may request deletion of your account and associated data, subject to legal retention requirements.`,
    },
    {
      title: "7. Security",
      content: `We implement industry-standard security measures including:

• AES-256 encryption for data at rest
• TLS 1.3 encryption for all data in transit
• Bcrypt hashing for all passwords
• Regular penetration testing and security audits
• Role-based access control for internal systems
• API key authentication with rate limiting

Despite these measures, no system is completely secure. In the event of a data breach, we will notify affected users and the Nigeria Data Protection Commission (NDPC) as required by the NDPA 2023.`,
    },
    {
      title: "8. Your Rights",
      content: `Under the NDPA 2023, you have the right to:

• **Access:** Request a copy of the personal data we hold about you.
• **Rectification:** Ask us to correct inaccurate or incomplete data.
• **Erasure:** Request deletion of your data (subject to legal retention requirements).
• **Portability:** Receive your data in a structured, machine-readable format.
• **Object:** Object to processing based on legitimate interest.
• **Withdraw Consent:** Withdraw consent for marketing communications at any time.

To exercise any of these rights, contact us at privacy@arapoint.com.ng. We will respond within 30 days.`,
    },
    {
      title: "9. Cookies",
      content: `We use essential cookies to maintain your session and preferences. We do not use third-party advertising cookies. You can disable cookies in your browser settings, but this may affect the functionality of our platform.`,
    },
    {
      title: "10. Changes to This Policy",
      content: `We may update this Privacy Policy from time to time. When we make significant changes, we will notify you by email or through a prominent notice on our platform. Your continued use of Arapoint after changes are posted constitutes acceptance of the updated policy.`,
    },
    {
      title: "11. Contact Us",
      content: `For any privacy-related questions, concerns, or to exercise your rights, please contact:

**Data Protection Officer**
Arapoint Technologies
Email: privacy@arapoint.com.ng
Website: arapoint.com.ng

We aim to respond to all privacy inquiries within 5 business days.`,
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-muted/30 border-b border-border/50 py-16 px-4">
        <div className="container max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl font-heading font-extrabold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
          <p className="text-muted-foreground leading-relaxed">
            Your privacy matters to us. This policy explains in plain language how we handle your data in compliance with the Nigeria Data Protection Act (NDPA) 2023.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-4">
        <div className="container max-w-3xl mx-auto">
          {/* Table of contents */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-6 mb-12">
            <h2 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">Table of Contents</h2>
            <ul className="space-y-2">
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
                <div className="text-muted-foreground leading-relaxed text-sm space-y-2">
                  {section.content.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 p-6 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-sm text-foreground font-medium mb-1">Questions about your privacy?</p>
            <p className="text-sm text-muted-foreground">
              Reach out to our Data Protection Officer at{" "}
              <a href="mailto:privacy@arapoint.com.ng" className="text-primary hover:underline">privacy@arapoint.com.ng</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
