/**
 * Cart Storage Module
 * 
 * Provides localStorage-based cart management with CRUD operations
 * and cross-tab synchronization using storage events.
 * 
 * Features:
 * - Persistent cart storage per user
 * - Cross-tab synchronization
 * - Automatic cleanup of expired items
 * - Error handling for storage quota
 */

import { type Cart } from '@/api/base44Client';

const CART_STORAGE_PREFIX = 'scentrev_cart_';
const CART_EXPIRY_DAYS = 30;

/**
 * Get storage key for a user's cart
 */
function getCartKey(userEmail: string): string {
  return `${CART_STORAGE_PREFIX}${userEmail}`;
}

/**
 * Validate a cart item has all required fields
 * 
 * @param item - Cart item to validate
 * @returns true if valid, false otherwise
 */
function isValidCartItem(item: any): item is Cart {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.item_id === 'string' &&
    typeof item.item_type === 'string' &&
    (item.item_type === 'fragrance' || item.item_type === 'kit' || item.item_type === 'accessory' || item.item_type === 'discovery_kit') &&
    typeof item.item_name === 'string' &&
    typeof item.price === 'number' &&
    item.price >= 0 &&
    typeof item.quantity === 'number' &&
    item.quantity > 0
  );
}

/**
 * Get all cart items for a user
 * 
 * @param userEmail - User's email address
 * @returns Array of cart items
 */
export function getCartItems(userEmail: string): Cart[] {
  try {
    if (typeof window === 'undefined') return [];
    
    const key = getCartKey(userEmail);
    const stored = localStorage.getItem(key);
    
    if (!stored) return [];
    
    const data = JSON.parse(stored);
    
    // Validate expiry
    if (data.expiry && new Date(data.expiry) < new Date()) {
      console.log('Cart expired, clearing...');
      clearCart(userEmail);
      return [];
    }
    
    // Validate cart items
    if (!Array.isArray(data.items)) {
      console.warn('Invalid cart data structure, clearing...');
      clearCart(userEmail);
      return [];
    }
    
    // Filter out invalid items
    const validItems = data.items.filter((item: any) => {
      const isValid = isValidCartItem(item);
      if (!isValid) {
        console.warn('Removing invalid cart item:', item);
      }
      return isValid;
    });
    
    // If we removed any items, save the cleaned cart
    if (validItems.length !== data.items.length) {
      console.log(`Cleaned cart: removed ${data.items.length - validItems.length} invalid items`);
      saveCartItems(userEmail, validItems);
    }
    
    return validItems;
  } catch (error) {
    console.error('Error reading cart from storage:', error);
    // Clear corrupted cart data
    try {
      clearCart(userEmail);
    } catch (clearError) {
      console.error('Error clearing corrupted cart:', clearError);
    }
    return [];
  }
}

/**
 * Save cart items for a user
 * 
 * @param userEmail - User's email address
 * @param items - Array of cart items to save
 */
export function saveCartItems(userEmail: string, items: Cart[]): void {
  try {
    if (typeof window === 'undefined') return;
    
    const key = getCartKey(userEmail);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + CART_EXPIRY_DAYS);
    
    const data = {
      items,
      expiry: expiry.toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const jsonData = JSON.stringify(data);
    
    try {
      localStorage.setItem(key, jsonData);
    } catch (storageError) {
      if (storageError instanceof DOMException && storageError.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded. Attempting cleanup...');
        // Try to clear old carts
        clearOldCarts();
        // Retry once after cleanup
        try {
          localStorage.setItem(key, jsonData);
          console.log('Successfully saved cart after cleanup');
        } catch (retryError) {
          console.error('Failed to save cart after cleanup:', retryError);
          throw new Error('Unable to save cart. Storage is full even after cleanup.');
        }
      } else {
        throw storageError;
      }
    }
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('cartUpdated', {
      detail: { userEmail, items }
    }));
    
  } catch (error) {
    console.error('Error saving cart to storage:', error);
    throw error;
  }
}

/**
 * Add item to cart or update quantity if exists
 * 
 * @param userEmail - User's email address
 * @param item - Cart item to add
 * @returns Updated cart items
 */
export function addToCart(userEmail: string, item: Cart): Cart[] {
  const items = getCartItems(userEmail);
  
  // Check if item already exists (same item_id and size)
  const existingIndex = items.findIndex(
    i => i.item_id === item.item_id && i.size === item.size
  );
  
  if (existingIndex >= 0) {
    // Update quantity
    items[existingIndex] = {
      ...items[existingIndex],
      quantity: (items[existingIndex].quantity || 1) + (item.quantity || 1)
    };
  } else {
    // Add new item with generated ID if not present
    const newItem: Cart = {
      ...item,
      id: item.id || `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      quantity: item.quantity || 1,
      created_by: userEmail
    };
    items.push(newItem);
  }
  
  saveCartItems(userEmail, items);
  return items;
}

/**
 * Update cart item quantity
 * 
 * @param userEmail - User's email address
 * @param itemId - Cart item ID
 * @param quantity - New quantity
 * @returns Updated cart items
 */
export function updateCartItem(userEmail: string, itemId: string, quantity: number): Cart[] {
  if (quantity < 1) {
    return removeCartItem(userEmail, itemId);
  }
  
  const items = getCartItems(userEmail);
  const itemIndex = items.findIndex(i => i.id === itemId);
  
  if (itemIndex >= 0) {
    items[itemIndex] = {
      ...items[itemIndex],
      quantity
    };
    saveCartItems(userEmail, items);
  }
  
  return items;
}

/**
 * Remove item from cart
 * 
 * @param userEmail - User's email address
 * @param itemId - Cart item ID to remove
 * @returns Updated cart items
 */
export function removeCartItem(userEmail: string, itemId: string): Cart[] {
  const items = getCartItems(userEmail).filter(i => i.id !== itemId);
  saveCartItems(userEmail, items);
  return items;
}

/**
 * Clear all cart items for a user
 * 
 * @param userEmail - User's email address
 */
export function clearCart(userEmail: string): void {
  try {
    if (typeof window === 'undefined') return;
    
    const key = getCartKey(userEmail);
    localStorage.removeItem(key);
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('cartUpdated', {
      detail: { userEmail, items: [] }
    }));
  } catch (error) {
    console.error('Error clearing cart:', error);
  }
}

/**
 * Get cart item count for a user
 * 
 * @param userEmail - User's email address
 * @returns Total quantity of items in cart
 */
export function getCartCount(userEmail: string): number {
  const items = getCartItems(userEmail);
  return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

/**
 * Get cart total price for a user
 * 
 * @param userEmail - User's email address
 * @returns Total price of all items in cart
 */
export function getCartTotal(userEmail: string): number {
  const items = getCartItems(userEmail);
  return items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
}

/**
 * Clear old carts (cleanup utility)
 */
function clearOldCarts(): void {
  try {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    const cartKeys = keys.filter(k => k.startsWith(CART_STORAGE_PREFIX));
    
    cartKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.expiry && new Date(data.expiry) < new Date()) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        // Remove invalid entries
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing old carts:', error);
  }
}

/**
 * Filter cart items
 * 
 * @param userEmail - User's email address
 * @param filters - Filter criteria
 * @returns Filtered cart items
 */
export function filterCartItems(userEmail: string, filters: {
  item_id?: string;
  item_type?: string;
  size?: string;
}): Cart[] {
  const items = getCartItems(userEmail);
  
  return items.filter(item => {
    if (filters.item_id && item.item_id !== filters.item_id) return false;
    if (filters.item_type && item.item_type !== filters.item_type) return false;
    if (filters.size && item.size !== filters.size) return false;
    return true;
  });
}
