/**
 * Wishlist Storage Module
 * 
 * Provides localStorage-based wishlist management with CRUD operations
 * and cross-tab synchronization using storage events.
 * 
 * Features:
 * - Persistent wishlist storage per user
 * - Cross-tab synchronization
 * - Automatic cleanup of expired items
 * - Error handling for storage quota
 */

import { type Wishlist } from '@/api/base44Client';

const WISHLIST_STORAGE_PREFIX = 'scentrev_wishlist_';
const WISHLIST_EXPIRY_DAYS = 365; // Wishlist items last longer

/**
 * Get storage key for a user's wishlist
 */
function getWishlistKey(userEmail: string): string {
  return `${WISHLIST_STORAGE_PREFIX}${userEmail}`;
}

/**
 * Get all wishlist items for a user
 * 
 * @param userEmail - User's email address
 * @returns Array of wishlist items
 */
export function getWishlistItems(userEmail: string): Wishlist[] {
  try {
    if (typeof window === 'undefined') return [];
    
    const key = getWishlistKey(userEmail);
    const stored = localStorage.getItem(key);
    
    if (!stored) return [];
    
    const data = JSON.parse(stored);
    
    // Validate expiry
    if (data.expiry && new Date(data.expiry) < new Date()) {
      clearWishlist(userEmail);
      return [];
    }
    
    return data.items || [];
  } catch (error) {
    console.error('Error reading wishlist from storage:', error);
    return [];
  }
}

/**
 * Save wishlist items for a user
 * 
 * @param userEmail - User's email address
 * @param items - Array of wishlist items to save
 */
export function saveWishlistItems(userEmail: string, items: Wishlist[]): void {
  if (typeof window === 'undefined') return;

  const key = getWishlistKey(userEmail);
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + WISHLIST_EXPIRY_DAYS);

  const data = {
    items,
    expiry: expiry.toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(key, JSON.stringify(data));

    // Dispatch storage event for cross-tab sync
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        newValue: JSON.stringify(data),
        oldValue: localStorage.getItem(key),
      })
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded. Clearing old wishlist data.');
      clearOldWishlists();
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (retryError) {
        console.error('Failed to save wishlist after cleanup:', retryError);
        throw new Error('Unable to save wishlist. Storage is full.');
      }
    } else {
      console.error('Error saving wishlist to storage:', error);
      throw error;
    }
  }
}

/**
 * Add item to wishlist
 * 
 * @param userEmail - User's email address
 * @param item - Wishlist item to add
 * @returns Updated wishlist items
 */
export function addToWishlist(userEmail: string, item: Wishlist): Wishlist[] {
  const items = getWishlistItems(userEmail);
  
  // Check if item already exists
  const exists = items.some(i => i.item_id === item.item_id);
  
  if (!exists) {
    const newItem: Wishlist = {
      ...item,
      id: item.id || `wishlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_by: userEmail
    };
    items.push(newItem);
    saveWishlistItems(userEmail, items);
  }
  
  return items;
}

/**
 * Remove item from wishlist
 * 
 * @param userEmail - User's email address
 * @param itemId - Wishlist item ID to remove
 * @returns Updated wishlist items
 */
export function removeFromWishlist(userEmail: string, itemId: string): Wishlist[] {
  const items = getWishlistItems(userEmail).filter(i => i.id !== itemId);
  saveWishlistItems(userEmail, items);
  return items;
}

/**
 * Check if item is in wishlist
 * 
 * @param userEmail - User's email address
 * @param itemId - Item ID to check
 * @returns True if item is in wishlist
 */
export function isInWishlist(userEmail: string, itemId: string): boolean {
  const items = getWishlistItems(userEmail);
  return items.some(i => i.item_id === itemId);
}

/**
 * Get wishlist item by item ID
 * 
 * @param userEmail - User's email address
 * @param itemId - Item ID to find
 * @returns Wishlist item or null
 */
export function getWishlistItem(userEmail: string, itemId: string): Wishlist | null {
  const items = getWishlistItems(userEmail);
  return items.find(i => i.item_id === itemId) || null;
}

/**
 * Clear all wishlist items for a user
 * 
 * @param userEmail - User's email address
 */
export function clearWishlist(userEmail: string): void {
  try {
    if (typeof window === 'undefined') return;
    
    const key = getWishlistKey(userEmail);
    localStorage.removeItem(key);
    
    // Dispatch storage event
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      newValue: null,
      oldValue: localStorage.getItem(key)
    }));
  } catch (error) {
    console.error('Error clearing wishlist:', error);
  }
}

/**
 * Get wishlist count for a user
 * 
 * @param userEmail - User's email address
 * @returns Number of items in wishlist
 */
export function getWishlistCount(userEmail: string): number {
  return getWishlistItems(userEmail).length;
}

/**
 * Filter wishlist items
 * 
 * @param userEmail - User's email address
 * @param filters - Filter criteria
 * @returns Filtered wishlist items
 */
export function filterWishlistItems(userEmail: string, filters: {
  item_id?: string;
  item_type?: string;
}): Wishlist[] {
  const items = getWishlistItems(userEmail);
  
  return items.filter(item => {
    if (filters.item_id && item.item_id !== filters.item_id) return false;
    if (filters.item_type && item.item_type !== filters.item_type) return false;
    return true;
  });
}

/**
 * Clear old wishlists (cleanup utility)
 */
function clearOldWishlists(): void {
  try {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    const wishlistKeys = keys.filter(k => k.startsWith(WISHLIST_STORAGE_PREFIX));
    
    wishlistKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.expiry && new Date(data.expiry) < new Date()) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing old wishlists:', error);
  }
}
