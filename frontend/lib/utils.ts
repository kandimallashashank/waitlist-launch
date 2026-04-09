import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes with proper precedence
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Whole rupees still needed to reach a free-shipping threshold.
 * Uses ceiling so floating-point subtotals never show values like ₹574.6600000000001.
 *
 * Args:
 *   threshold: Minimum cart value for free shipping (e.g. 999).
 *   subtotal: Current line total in rupees.
 *
 * Returns:
 *   Non-negative integer rupees to display (0 if already at or above threshold).
 */
export function rupeesUntilFreeShipping(threshold: number, subtotal: number): number {
  return Math.max(0, Math.ceil(threshold - subtotal))
}

/**
 * Formats a rupee amount for UI (integer rupees, Indian grouping). Avoids PDP prices like ₹486.18.
 *
 * Args:
 *   amount: Price in INR (may be float from API).
 *
 * Returns:
 *   Localized string without fractional rupees.
 */
export function formatInrDisplay(amount: number): string {
  const whole = Math.round(Number(amount))
  return whole.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
}
