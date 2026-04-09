'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    q: 'What exactly is a decant?',
    a: 'A decant is a smaller portion of an original perfume, carefully transferred from the full bottle into a travel-friendly atomiser. You get the exact same fragrance just in a more affordable, pocket-sized format. Perfect for trying before committing to a full bottle.',
  },
  {
    q: 'Are these 100% authentic perfumes?',
    a: 'Absolutely. Every fragrance is sourced from authorised distributors and decanted from genuine, sealed bottles. We never deal in imitations or "inspired by" versions. What you smell is the real thing.',
  },
  {
    q: 'How long does each size last?',
    a: 'We offer decants in 3ml, 5ml, 8ml, and 10ml. 3ml is about 30–40 sprays (roughly 1–2 weeks of daily use). 5ml sits between sample and travel. 8ml is about 80–100 sprays (1–2 months). 10ml is about 100–120 sprays (2–3 months). Actual duration depends on how many sprays you use per application.',
  },
  {
    q: 'What if I don\'t like the fragrance?',
    a: 'That\'s exactly why decants exist to avoid expensive regrets. We offer a 7-day return policy on unopened items. For opened decants, we can\'t accept returns (hygiene reasons), but our Blind Buy Score and AI recommendations are designed to minimise mismatches.',
  },
  {
    q: 'How does shipping work across India?',
    a: 'We ship pan-India via trusted courier partners. Orders above ₹599 get free shipping. Standard delivery takes 3-7 business days depending on your location. You\'ll receive tracking details as soon as your order is dispatched.',
  },
  {
    q: 'What is the Blind Buy Score?',
    a: 'It\'s our proprietary rating (0-5) that predicts how likely you are to love a fragrance without smelling it first. It factors in longevity, sillage, versatility, community sentiment from 100k+ data points, and climate suitability for Indian weather.',
  },
  {
    q: 'How are decants filled and stored?',
    a: 'Each decant is hand-filled in a clean environment using precision syringes. We use high-quality glass atomisers with aluminium shells. All decants are sealed, labeled with batch info, and stored away from heat and light to preserve the fragrance.',
  },
  {
    q: 'Do you offer COD (Cash on Delivery)?',
    a: 'Yes! We offer both prepaid (UPI, cards, wallets via Razorpay) and Cash on Delivery options. COD is available on orders up to ₹2,000 across most pin codes in India.',
  },
  {
    q: 'Are decant cases reusable?',
    a: 'Yes! Our decant cases are designed to be reused. Once you finish a sample, simply remove the empty vial and slot in a new one. One 8ml or 10ml case works for multiple fragrances over time—no need to buy a new case for every sample. This makes them perfect for building a rotation or trying new scents on the go.',
  },
  {
    q: 'How many decant cases do I need for a discovery kit?',
    a: 'You don\'t need one case per sample. Since cases are reusable, most customers buy 1-2 cases for a kit of 5+ samples. Finish one, swap in the next. If you like to carry multiple scents at once (e.g. a day scent and an evening scent), 2 cases is the sweet spot.',
  },
];

export default function ProductFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Frequently Asked Questions</h3>
      <div className="space-y-0 border border-[#E9E1DA] rounded-2xl overflow-hidden">
        {faqs.map((faq, i) => (
          <div key={i} className={i > 0 ? 'border-t border-[#E9E1DA]' : ''}>
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FDF6F3]/50 transition-colors"
            >
              <span className="text-sm font-medium text-[#1A1A1A] pr-4">{faq.q}</span>
              <ChevronDown className={`w-4 h-4 text-[#5C5A52] shrink-0 transition-transform duration-200 ${openIdx === i ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openIdx === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 text-sm text-[#5C5A52] leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
