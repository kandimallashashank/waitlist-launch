/**
 * JSON-LD for India market clarity: Organization footprint + WebSite (SearchAction).
 * URLs are absolute using the deployed origin from ``getWaitlistSiteUrl``.
 */

const SUPPORT_EMAIL = "support@scentrev.com";

/**
 * Builds a schema.org ``@graph`` document for the public waitlist app.
 *
 * @param siteUrl - Canonical HTTPS origin, no trailing slash
 * @returns Object suitable for ``JSON.stringify`` in a ``application/ld+json`` script
 */
export function buildScentRevStructuredDataGraph(siteUrl: string): Record<string, unknown> {
  const orgId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: "ScentRev",
        url: siteUrl,
        logo: `${siteUrl}/icon`,
        email: SUPPORT_EMAIL,
        currenciesAccepted: "INR",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Jubilee Hills",
          addressLocality: "Hyderabad",
          addressRegion: "Telangana",
          postalCode: "500033",
          addressCountry: "IN",
        },
        areaServed: {
          "@type": "Country",
          name: "India",
        },
        availableLanguage: ["en-IN"],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "ScentRev",
        url: siteUrl,
        inLanguage: "en-IN",
        publisher: { "@id": orgId },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/catalog?search={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteUrl}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Perfume Samples Catalog",
            item: `${siteUrl}/catalog`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is ScentRev?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "ScentRev is India's premier fragrance discovery platform, offering authentic micro-samples (decants) of niche and designer perfumes."
            }
          },
          {
            "@type": "Question",
            "name": "Can I buy perfume samples online in India?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, ScentRev delivers 3ml, 5ml, and 8ml perfume samples across India, allowing you to try expensive fragrances before committing to a full bottle."
            }
          },
          {
            "@type": "Question",
            "name": "Which perfumes work best in India's hot and humid weather?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We curate a selection of high-longevity citrus, aquatic, and fresh woody scents that are specifically tested to perform well in the Indian climate."
            }
          },
          {
            "@type": "Question",
            "name": "How does the ScentRev fragrance quiz work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Our AI-powered quiz analyzes your scent preferences and recommends the best fragrance matches for your style and the Indian weather."
            }
          },
          {
            "@type": "Question",
            "name": "Does ScentRev do corporate gifting in India?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, we offer premium perfume discovery sets for corporate gifting, employee rewards, and Diwali gifts across India."
            }
          }
        ]
      }
    ],
  };
}
