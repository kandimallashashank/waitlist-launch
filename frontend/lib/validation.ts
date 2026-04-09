/**
 * Validation utilities for form inputs
 * Provides consistent validation logic for Indian market requirements
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Valid starting digits for Indian mobile numbers
const VALID_PHONE_PREFIXES = ['6', '7', '8', '9'] as const;

/**
 * Validate Indian phone number (10 digits)
 * Must start with 6, 7, 8, or 9
 */
export function validatePhone(phone: string | null | undefined): ValidationResult {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (!cleaned) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  if (cleaned.length !== 10) {
    return { isValid: false, error: 'Phone number must be exactly 10 digits' };
  }
  
  const firstDigit = cleaned[0];
  if (!VALID_PHONE_PREFIXES.includes(firstDigit as any)) {
    return { isValid: false, error: 'Phone number must start with 6, 7, 8, or 9' };
  }
  
  return { isValid: true };
}

/**
 * Validate Indian pincode (6 digits)
 */
export function validatePincode(pincode: string | null | undefined): ValidationResult {
  if (!pincode) {
    return { isValid: false, error: 'Pincode is required' };
  }
  
  const cleaned = pincode.replace(/\D/g, '');
  
  if (!cleaned) {
    return { isValid: false, error: 'Pincode is required' };
  }
  
  if (cleaned.length !== 6) {
    return { isValid: false, error: 'Pincode must be exactly 6 digits' };
  }

  if (!/^[1-9]\d{5}$/.test(cleaned)) {
    return { isValid: false, error: 'Please enter a valid Indian pincode' };
  }
  
  return { isValid: true };
}

/**
 * Validate full name for shipping addresses.
 * Allows letters, spaces, apostrophes, and periods.
 */
export function validateIndianFullName(name: string | null | undefined): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Full name is required' };
  }

  const trimmedName = name.trim().replace(/\s+/g, ' ');
  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters' };
  }
  if (trimmedName.length > 70) {
    return { isValid: false, error: 'Full name must be less than 70 characters' };
  }

  if (!/^[A-Za-z][A-Za-z\s'.-]*$/.test(trimmedName)) {
    return { isValid: false, error: 'Use only letters and common name characters' };
  }

  return { isValid: true };
}

/**
 * Validate city/district names for India addresses.
 */
export function validateIndianCity(city: string | null | undefined): ValidationResult {
  if (!city || !city.trim()) {
    return { isValid: false, error: 'City is required' };
  }

  const trimmedCity = city.trim().replace(/\s+/g, ' ');
  if (trimmedCity.length < 2) {
    return { isValid: false, error: 'City must be at least 2 characters' };
  }
  if (trimmedCity.length > 80) {
    return { isValid: false, error: 'City must be less than 80 characters' };
  }

  if (!/^[A-Za-z][A-Za-z\s'.-]*$/.test(trimmedCity)) {
    return { isValid: false, error: 'City can include only letters and spaces' };
  }

  return { isValid: true };
}

/**
 * Validate shipping street address quality.
 */
export function validateIndianAddressLine(address: string | null | undefined): ValidationResult {
  if (!address || !address.trim()) {
    return { isValid: false, error: 'Address is required' };
  }

  const trimmedAddress = address.trim().replace(/\s+/g, ' ');
  if (trimmedAddress.length < 10) {
    return { isValid: false, error: 'Address must be at least 10 characters' };
  }
  if (trimmedAddress.length > 200) {
    return { isValid: false, error: 'Address must be less than 200 characters' };
  }

  if (!/[A-Za-z0-9]/.test(trimmedAddress)) {
    return { isValid: false, error: 'Please enter a valid street address' };
  }

  return { isValid: true };
}

/**
 * Validate email format (RFC 5322 compliant)
 */
export function validateEmail(email: string | null | undefined): ValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const trimmedEmail = email.trim();
  
  if (!trimmedEmail) {
    return { isValid: false, error: 'Email is required' };
  }
  
  // Basic email regex - matches most common email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  if (trimmedEmail.length > 255) {
    return { isValid: false, error: 'Email must be less than 255 characters' };
  }
  
  return { isValid: true };
}

/**
 * Validate required text field
 */
export function validateRequired(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value || !value.trim()) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  return { isValid: true };
}

/**
 * Validate password strength
 * Requirements: Min 8 chars, 1 uppercase, 1 number
 */
export function validatePassword(password: string | null | undefined): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  return { isValid: true };
}

/**
 * Validate review rating (1-5)
 */
export function validateRating(rating: number | null | undefined): ValidationResult {
  if (rating === null || rating === undefined) {
    return { isValid: false, error: 'Rating is required' };
  }
  
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { isValid: false, error: 'Rating must be between 1 and 5' };
  }
  
  return { isValid: true };
}

/**
 * Validate review comment (min 10 characters)
 */
export function validateComment(comment: string | null | undefined, minLength: number = 10): ValidationResult {
  if (!comment) {
    return { isValid: false, error: 'Comment is required' };
  }
  
  const trimmed = comment.trim();
  
  if (trimmed.length < minLength) {
    return { isValid: false, error: `Comment must be at least ${minLength} characters` };
  }
  
  return { isValid: true };
}

/**
 * Format price in INR with proper localization
 */
export function formatPrice(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0.00';
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format date in user-friendly format
 * Returns 'Invalid date' for invalid inputs
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'Invalid date';
  }
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
      return 'Invalid date';
    }
    
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format date in relative format (e.g., "2 days ago")
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'Unknown';
  }
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
      return 'Unknown';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        if (diffMinutes === 0) {
          return 'Just now';
        }
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
      }
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
    
    if (diffDays === 1) {
      return 'Yesterday';
    }
    
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    }
    
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months === 1 ? '' : 's'} ago`;
    }
    
    const years = Math.floor(diffDays / 365);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  } catch (error) {
    return 'Unknown';
  }
}
