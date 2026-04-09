"use client";

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/hooks/use-wishlist';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  item: {
    id: string;
    type: 'kit' | 'fragrance' | 'discovery_kit';
    name: string;
    price?: number;
    image?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  /**
   * ``onCard``: light border + soft shadow for product tiles (matches quick-view pill).
   * ``default``: stronger shadow for headers / loose layouts.
   */
  variant?: 'default' | 'onCard';
  /** Extra classes on the button element. */
  className?: string;
}

/**
 * Wishlist toggle button component
 *
 * Args:
 *     item: Item to add/remove from wishlist.
 *     size: Button size variant.
 *     variant: Visual weight (see prop).
 *     className: Optional Tailwind merge.
 */
export default function WishlistButton({
  item,
  size = 'md',
  variant = 'default',
  className,
}: WishlistButtonProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    setLoading(true);
    try {
      await toggleWishlist(item);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  /** ``sm`` uses 44px min touch target (WCAG 2.5.5) while keeping a compact icon. */
  const sizeClasses = {
    sm: 'min-h-[44px] min-w-[44px] h-11 w-11',
    md: 'min-h-[44px] min-w-[44px] h-11 w-11',
    lg: 'w-12 h-12 min-h-[48px] min-w-[48px]'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const variantClasses =
    variant === 'onCard'
      ? 'border border-[#E4DFD9] bg-white/95 shadow-[0_1px_3px_rgba(26,26,26,0.06)] backdrop-blur-sm hover:border-terracotta-200/70 hover:bg-white hover:shadow-md'
      : 'bg-white shadow-md hover:bg-[#FAFAFA]';

  const wishlisted = isInWishlist(item.id);
  const nameShort = item.name.length > 80 ? `${item.name.slice(0, 77)}…` : item.name;
  const ariaLabel = wishlisted
    ? `Remove ${nameShort} from wishlist`
    : `Add ${nameShort} to wishlist`;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-label={ariaLabel}
      aria-pressed={wishlisted}
      className={cn(
        'z-10 flex items-center justify-center rounded-full disabled:opacity-50',
        'transition-[transform,box-shadow,colors,border-color] duration-150 ease-out hover:scale-[1.04] active:scale-[0.96]',
        sizeClasses[size],
        variantClasses,
        className,
      )}
    >
      <Heart
        className={cn(
          iconSizes[size],
          'transition-colors',
          wishlisted ? 'fill-terracotta-500 text-terracotta-500' : 'text-neutral-400',
        )}
      />
    </button>
  );
}
