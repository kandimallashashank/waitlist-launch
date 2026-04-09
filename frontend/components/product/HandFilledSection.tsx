'use client';

import React from 'react';
import { Pipette, ShieldCheck, Package } from 'lucide-react';

export default function HandFilledSection() {
  return (
    <div className="bg-[#FDF6F3] rounded-2xl p-6 md:p-8 border border-[#F0EDE9]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
          <Pipette className="w-5 h-5 text-[#B85A3A]" />
        </div>
        <div>
          <h3 className="text-[#1A1A1A] text-base font-semibold">Hand-filled with care</h3>
          <p className="text-xs text-[#5C5A52]">Every decant, made to order</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: Pipette,
            title: 'Precision filled',
            desc: 'Each vial is hand-filled using calibrated syringes for exact measurements',
          },
          {
            icon: ShieldCheck,
            title: 'Quality sealed',
            desc: 'Sealed with tamper-evident caps and labeled with batch information',
          },
          {
            icon: Package,
            title: 'Safely packed',
            desc: 'Bubble-wrapped and shipped in crush-proof packaging across India',
          },
        ].map((item) => (
          <div key={item.title} className="bg-white rounded-xl p-3 border border-[#F0EDE9]">
            <item.icon className="w-4 h-4 text-[#B85A3A] mb-2" />
            <p className="text-xs font-semibold text-[#1A1A1A] mb-1">{item.title}</p>
            <p className="text-[10px] text-[#5C5A52] leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Placeholder for sample bottle images */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#F0EDE9]">
        <div className="flex -space-x-2">
          {['#C0C0C0', '#B76E79', '#1A1A1A'].map((color) => (
            <div
              key={color}
              className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
              style={{ background: color }}
            />
          ))}
        </div>
        <p className="text-xs text-[#5C5A52]">Available in multiple case colours for 8ml &amp; 10ml</p>
      </div>
    </div>
  );
}
