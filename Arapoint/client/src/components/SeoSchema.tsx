import { useEffect } from "react";

interface SchemaProps {
  schema: Record<string, unknown> | Record<string, unknown>[];
}

export default function SeoSchema({ schema }: SchemaProps) {
  const json = JSON.stringify(Array.isArray(schema) ? schema : [schema]);
  useEffect(() => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.text = json;
    el.dataset.schema = "arapoint";
    document.head.appendChild(el);
    return () => {
      document.head.removeChild(el);
    };
  }, [json]);
  return null;
}

export function orgSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Arapoint",
    url: "https://arapoint.com.ng",
    logo: "https://arapoint.com.ng/logo.png",
    description:
      "Arapoint is Nigeria's identity verification and employment screening platform. We provide NIN verification, BVN lookup, education credential checks, and KYC APIs for businesses.",
    address: { "@type": "PostalAddress", addressCountry: "NG" },
    areaServed: "NG",
    sameAs: ["https://developer.arapoint.com.ng"],
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function productSchema(opts: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    brand: { "@type": "Brand", name: "Arapoint" },
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Arapoint" },
    },
  };
}
