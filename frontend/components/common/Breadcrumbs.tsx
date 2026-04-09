/**
 * Breadcrumb Navigation Component
 *
 * Provides breadcrumb navigation for product pages, cart, checkout, etc.
 * On narrow screens the trail scrolls horizontally so labels stay on one line
 * (avoids mid-word breaks from global overflow-wrap and flex shrink).
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const CRUMB_TEXT =
  'whitespace-nowrap shrink-0 break-normal [overflow-wrap:normal]';

/**
 * Breadcrumb Navigation Component
 *
 * Args:
 *   items: Array of breadcrumb segments (label + optional href).
 *
 * Returns:
 *   Accessible nav with home link and trail; horizontally scrollable on small viewports.
 */
export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="mb-6 min-w-0" aria-label="Breadcrumb" suppressHydrationWarning>
      <div
        className="-mx-1 flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto px-1 py-0.5 text-sm text-neutral-600 scrollbar-hide [scrollbar-width:none] sm:gap-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <Link
          href={createPageUrl('Home')}
          className={`hover:text-primary flex shrink-0 items-center transition-colors ${CRUMB_TEXT}`}
          aria-label="Home"
        >
          <Home className="h-4 w-4 shrink-0" />
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const linkClass = `hover:text-primary cursor-pointer transition-colors ${CRUMB_TEXT}`;
          const spanClass = isLast
            ? `${CRUMB_TEXT} font-medium text-neutral-900`
            : `${CRUMB_TEXT} text-neutral-600`;

          return (
            <React.Fragment key={index}>
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
              {item.href && item.href.trim() !== '' && !isLast ? (
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              ) : (
                <span className={spanClass}>{item.label}</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
