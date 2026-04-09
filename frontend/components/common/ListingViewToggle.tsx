'use client';

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import type { PlpListingViewMode } from '@/lib/plpListingView';
import { cn } from '@/lib/utils';

export interface ListingViewToggleProps {
  /** Active layout mode. */
  value: PlpListingViewMode;
  /** Called when the user selects grid or single-column layout. */
  onChange: (mode: PlpListingViewMode) => void;
  /** Optional extra classes on the outer wrapper. */
  className?: string;
}

const btnBase =
  'flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B85A3A] focus-visible:ring-offset-1';

/**
 * Two-state control: multi-column grid vs single-column list (catalog PLPs).
 */
export function ListingViewToggle({ value, onChange, className }: ListingViewToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-[#E5E5E5] bg-white p-0.5',
        className,
      )}
      role="group"
      aria-label="Product layout"
    >
      <button
        type="button"
        aria-pressed={value === 'grid'}
        title="Grid view"
        onClick={() => onChange('grid')}
        className={cn(
          btnBase,
          value === 'grid' ? 'bg-[#B85A3A] text-white shadow-sm' : 'text-[#404040] hover:bg-[#F5F5F5]',
        )}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={value === 'single'}
        title="Single column"
        onClick={() => onChange('single')}
        className={cn(
          btnBase,
          value === 'single' ? 'bg-[#B85A3A] text-white shadow-sm' : 'text-[#404040] hover:bg-[#F5F5F5]',
        )}
      >
        <List className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
