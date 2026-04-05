"use client";

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface IconBadgeProps {
  icon: LucideIcon;
  gradient: string;
  iconClassName?: string;
  className?: string;
  ringClassName?: string;
}

export default function IconBadge({
  icon: Icon,
  gradient,
  iconClassName = 'text-[#B85A3A]',
  className = '',
  ringClassName = 'border-white/70'
}: IconBadgeProps) {
  return (
    <div className={`relative rounded-full ${className}`}>
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient} opacity-80`} />
      <div className={`absolute inset-[5px] rounded-full bg-white/80 backdrop-blur border ${ringClassName} shadow-sm`} />
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <Icon className={`w-6 h-6 md:w-7 md:h-7 ${iconClassName}`} />
      </div>
    </div>
  );
}
