// Base44 API Client with TypeScript interfaces
// Enhanced with proper API integration, error handling, and retry logic

import { mockFragrances, mockReviews, getMockFragrances, getMockReviews } from '@/lib/mockData';
import * as cartStorage from '@/lib/storage/cartStorage';
import * as wishlistStorage from '@/lib/storage/wishlistStorage';
import { getSession, getUser, saveSession, clearSession, getSessionId } from '@/lib/storage/sessionStorage';
import { getAccessToken } from '@/lib/supabase';

// ==================== Response Validation ====================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

class ResponseValidator {
  static validateFragrance(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data.id) errors.push('Missing required field: id');
    if (!data.name) errors.push('Missing required field: name');
    // view returns brand_name; direct perfume rows return brand
    if (!data.brand && !data.brand_name) errors.push('Missing required field: brand');
    if (!data.gender) errors.push('Missing required field: gender');
    // price_3ml may be null for items without pricing yet don't hard-fail
    if (data.price_3ml !== undefined && data.price_3ml !== null && typeof data.price_3ml !== 'number') {
      errors.push('Invalid field: price_3ml must be a number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateDiscoveryKit(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data.id) errors.push('Missing required field: id');
    if (!data.name) errors.push('Missing required field: name');
    if (typeof data.price !== 'number') errors.push('Invalid field: price must be a number');
    if (typeof data.vial_count !== 'number') errors.push('Invalid field: vial_count must be a number');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateReview(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data.id) errors.push('Missing required field: id');
    if (!data.fragrance_id) errors.push('Missing required field: fragrance_id');
    if (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
      errors.push('Invalid field: rating must be a number between 1 and 5');
    }
    if (!data.comment) errors.push('Missing required field: comment');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateCart(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data.id) errors.push('Missing required field: id');
    if (!data.item_id) errors.push('Missing required field: item_id');
    if (!data.item_type) errors.push('Missing required field: item_type');
    if (!data.item_name) errors.push('Missing required field: item_name');
    if (typeof data.price !== 'number') errors.push('Invalid field: price must be a number');
    if (typeof data.quantity !== 'number' || data.quantity < 1) {
      errors.push('Invalid field: quantity must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateOrder(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data.id) errors.push('Missing required field: id');
    if (!Array.isArray(data.items)) errors.push('Invalid field: items must be an array');
    if (typeof data.total_amount !== 'number') errors.push('Invalid field: total_amount must be a number');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateWishlist(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data.id) errors.push('Missing required field: id');
    if (!data.item_id) errors.push('Missing required field: item_id');
    if (!data.item_type) errors.push('Missing required field: item_type');
    if (!data.item_name) errors.push('Missing required field: item_name');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateUser(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data.email) errors.push('Missing required field: email');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateArray<T>(data: any[], validator: (item: any) => ValidationResult): ValidationResult {
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: ['Expected an array']
      };
    }

    const allErrors: string[] = [];
    data.forEach((item, index) => {
      const result = validator(item);
      if (!result.isValid) {
        allErrors.push(`Item ${index}: ${result.errors.join(', ')}`);
      }
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }
}

// ==================== Error Types ====================

export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTH = 'auth',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  recoverable: boolean;
  action?: 'retry' | 'signin' | 'home' | 'refresh';
  statusCode?: number;
}

// ==================== API Client Configuration ====================

interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  useMockFallback: boolean;
}

// Default API port - should match backend uvicorn configuration
const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT || '8000';
const DEFAULT_API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'localhost';

/**
 * Determine if mock fallback should be enabled
 * - Controlled by NEXT_PUBLIC_USE_MOCK environment variable
 * - Default: disabled (use real API data)
 */
const shouldUseMockFallback = (): boolean => {
  const useMockEnv = process.env.NEXT_PUBLIC_USE_MOCK;

  // Explicit override via environment variable
  if (useMockEnv === 'true') return true;
  if (useMockEnv === 'false') return false;

  // Default: disabled (use real API)
  return false;
};

const defaultConfig: ApiClientConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || `http://${DEFAULT_API_HOST}:${DEFAULT_API_PORT}`,
  timeout: 8000,  // 8s fail fast so product/dashboard can show retry sooner
  retryAttempts: 2, // 2 attempts total (1 retry)
  retryDelay: 400,   // 400ms before retry
  useMockFallback: shouldUseMockFallback()
};

// ==================== API Response Types ====================

interface ApiResponse<T> {
  data: T | null;
  error: AppError | null;
  isFromCache: boolean;
}

// ==================== HTTP Client with Retry Logic ====================

class HttpClient {
  private config: ApiClientConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: ApiClientConfig = defaultConfig) {
    this.config = config;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoff(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s
    return this.config.retryDelay * Math.pow(2, attempt);
  }

  private transformError(error: any, url: string): AppError {
    // Network errors
    if (error.name === 'AbortError' || error.message === 'Failed to fetch') {
      return {
        type: ErrorType.NETWORK,
        message: `Network request failed: ${url}`,
        userMessage: 'Unable to connect to the server. Please check your internet connection.',
        recoverable: true,
        action: 'retry'
      };
    }

    // Timeout errors
    if (error.name === 'TimeoutError') {
      return {
        type: ErrorType.NETWORK,
        message: `Request timeout: ${url}`,
        userMessage: 'The request took too long. Please try again.',
        recoverable: true,
        action: 'retry'
      };
    }

    // HTTP errors
    if (error.statusCode) {
      switch (error.statusCode) {
        case 401:
        case 403:
          return {
            type: ErrorType.AUTH,
            message: 'Authentication required',
            userMessage: 'Please sign in to continue.',
            recoverable: true,
            action: 'signin',
            statusCode: error.statusCode
          };
        case 404:
          return {
            type: ErrorType.NOT_FOUND,
            message: 'Resource not found',
            userMessage: 'The requested item could not be found.',
            recoverable: false,
            statusCode: 404
          };
        case 422:
          const validationMessage = error.detail
            ? (Array.isArray(error.detail)
              ? error.detail.map((e: any) => e.msg || e.message).join(', ')
              : error.detail)
            : 'Validation error';
          return {
            type: ErrorType.VALIDATION,
            message: validationMessage,
            userMessage: 'Please check your input and try again.',
            recoverable: true,
            statusCode: 422
          };
        case 500:
        case 502:
        case 503:
          return {
            type: ErrorType.SERVER,
            message: 'Server error',
            userMessage: 'Something went wrong on our end. Please try again later.',
            recoverable: true,
            action: 'retry',
            statusCode: error.statusCode
          };
        default:
          return {
            type: ErrorType.UNKNOWN,
            message: error.detail || error.message || 'Unknown error',
            userMessage: 'An unexpected error occurred. Please try again.',
            recoverable: true,
            action: 'retry',
            statusCode: error.statusCode
          };
      }
    }

    // Unknown errors
    return {
      type: ErrorType.UNKNOWN,
      message: error.message || 'Unknown error',
      userMessage: 'An unexpected error occurred. Please try again.',
      recoverable: true,
      action: 'retry'
    };
  }

  async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: { skipRetry?: boolean; requestId?: string; validator?: (data: any) => ValidationResult } = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const requestId = options.requestId || `${method}-${endpoint}-${Date.now()}`;

    // Cancel any existing request with the same ID
    if (this.abortControllers.has(requestId)) {
      this.abortControllers.get(requestId)?.abort();
    }

    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    let lastError: AppError | null = null;
    const maxAttempts = options.skipRetry ? 1 : this.config.retryAttempts;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Add delay for retries
        if (attempt > 0) {
          await this.sleep(this.calculateBackoff(attempt - 1));
        }

        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, this.config.timeout);

        // Get Supabase access token for Authorization header (primary auth method)
        // Fallback to session ID if Supabase auth is not available
        let authToken: string | null = null;

        try {
          authToken = await getAccessToken();
        } catch (error) {
          console.debug('Supabase auth not available, trying session-based auth');
        }

        // Fallback to session ID if Supabase token is not available
        if (!authToken) {
          const sessionId = getSessionId();
          if (sessionId) {
            authToken = sessionId;
          }
        }

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Add Authorization header if token exists
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(url, {
          method,
          headers,
          body: data && method !== 'GET' ? JSON.stringify(data) : undefined,
          signal: abortController.signal,
          credentials: 'include' // Include cookies for session management
        });

        clearTimeout(timeoutId);
        this.abortControllers.delete(requestId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // Clear local session on 401/403 to avoid stale redirect loops
          if (response.status === 401 || response.status === 403) {
            const sessionUser = getUser();
            if (sessionUser?.email === 'demo@example.com') {
              console.warn('Clearing stale demo session on 401/403');
              clearSession();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('authError', { detail: { statusCode: response.status } }));
              }
            }
          }

          throw {
            statusCode: response.status,
            message: errorData.message || response.statusText,
            detail: errorData.detail
          };
        }

        const responseData = await response.json();

        // Validate response if validator provided
        if (options.validator) {
          const validation = options.validator(responseData);
          if (!validation.isValid) {
            console.warn('Response validation failed:', validation.errors);
            // Continue with data despite validation warnings
            // In production, you might want to throw an error here
          }
        }

        return {
          data: responseData,
          error: null,
          isFromCache: false
        };

      } catch (error: any) {
        lastError = this.transformError(error, url);

        // Don't retry for non-recoverable errors
        if (!lastError.recoverable || lastError.type === ErrorType.AUTH) {
          break;
        }

        // Don't retry on last attempt
        if (attempt === maxAttempts - 1) {
          break;
        }

        console.warn(`Request failed (attempt ${attempt + 1}/${maxAttempts}):`, lastError.message);
      }
    }

    this.abortControllers.delete(requestId);

    return {
      data: null,
      error: lastError,
      isFromCache: false
    };
  }

  async get<T>(endpoint: string, options?: { skipRetry?: boolean; validator?: (data: any) => ValidationResult }): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data: any, options?: { skipRetry?: boolean; validator?: (data: any) => ValidationResult }): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T>(endpoint: string, data: any, options?: { skipRetry?: boolean; validator?: (data: any) => ValidationResult }): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: { skipRetry?: boolean }): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}

// Create singleton instance
const httpClient = new HttpClient();

// ==================== Exported Utilities ====================

export { ResponseValidator };
export type { ValidationResult, ApiResponse };

// ==================== Type Definitions ====================

export interface User {
  id?: string;
  role?: string;
  /** Null for phone-only accounts (no synthetic placeholder). */
  email: string | null;
  full_name?: string;
  username?: string;
  display_name?: string;
  phone?: string;
  phone_verified?: boolean;
  alternate_phone?: string;
  date_of_birth?: string;
  gender?: string;
  avatar_url?: string;
  // Indian Address Fields
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  /** Free-form locality when distinct from city (e.g. district label). */
  location?: string;
  state?: string;
  pincode?: string;
  country?: string;
  email_verified?: boolean;
  profile_completed?: boolean;
  /** Short badge shown next to your name on forum posts (optional). */
  forum_flair?: string | null;
  provider?: string;
  created_date?: string;
  last_login?: string;
}

export interface UpdateProfileData {
  full_name?: string;
  display_name?: string;
  username?: string;
  phone?: string;
  alternate_phone?: string;
  date_of_birth?: string;
  gender?: string;
  email?: string | null;
  profile_completed?: boolean;
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  avatar_url?: string;
}

export interface DiscoveryKit {
  id?: string;
  name: string;
  tagline?: string;
  /** Full kit description (what's in the box, who it's for, how to use) */
  description?: string;
  price: number;
  original_price?: number;
  /** Optional per-size prices for kit (UI shows 3 / 5 / 8 / 10 ml; API may still use price_12ml for largest) */
  price_4ml?: number;
  price_8ml?: number;
  price_12ml?: number;
  /** @deprecated Use price_4ml for kits. Kept for backward compatibility. */
  price_3ml?: number;
  vial_count: number;
  vial_size_ml?: number;
  blind_buy_score?: number;
  trending_city?: string;
  trending_age_group?: string;
  reorder_rate?: number;
  gender?: 'men' | 'women' | 'unisex';
  season?: string[];
  occasion?: string[];
  style?: string;
  image_url?: string;
  fragrances?: Array<{
    id?: string;
    fragrance_id?: string;
    perfume_id?: string;
    name: string;
    brand: string;
    top_notes?: string;
    mid_notes?: string;
    base_notes?: string;
    blind_buy_score?: number;
    best_for?: string;
    image_url?: string;
  }>;
  why_this_kit?: string;
}

export interface Fragrance {
  id?: string;
  name: string;
  brand: string;
  brand_name?: string;
  gender: 'men' | 'women' | 'unisex';
  price_3ml: number;
  price_8ml?: number;
  price_12ml?: number;
  original_price_3ml?: number;
  original_price_8ml?: number;
  original_price_12ml?: number;
  category?: 'best_seller' | 'new_arrival' | 'sale';
  description?: string;
  notes?: {
    top?: string;
    middle?: string;
    base?: string;
  };
  notes_top?: string | string[];
  notes_middle?: string | string[];
  notes_base?: string | string[];
  image_url?: string;
  images?: string[];
  blind_buy_score?: number;
  scent_family?: string;
  type?: string;
  sillage?: number;
  longevity_hours?: number;
  price_value?: number;
  gender_score?: number;
  /**
   * Optional structured performance object returned by recommendation endpoints.
   * When present, UI should prefer these normalized scores.
   */
  info_card?: {
    longevity_score: number; // normalized 0-10
    longevity_label?: string;
    sillage_score: number; // normalized 0-10
    sillage_label?: string;
    accords?: string[];
    performance_notes?: string;
    concentration?: string;
  } | null;
  pros?: string[];
  cons?: string[];
  main_accords?: string[];
  similar_perfumes?: string[];
  average_rating?: number;
  review_count?: number;
  /** Season suitability: array of names or object { seasonName: score } from API */
  seasons?: string[] | Record<string, number>;
  /** Occasion suitability: object { occasionName: score 0-100 } from API */
  occasions?: Record<string, number> | string[];
  /** When false, product cannot be added to cart (admin catalog flag). */
  in_stock?: boolean;
  compliment_factor?: number;
  gift_confidence_score?: number | null;
}

export interface DecantInventoryItem {
  id: string;
  perfume_id: string;
  size_ml: number;
  color_name: string;
  color_hex: string;
  quantity_in_stock: number;
  total_sold: number;
  price?: number;
}

export interface Review {
  id?: string;
  fragrance_id: string;
  fragrance_name?: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  /** Required when creating a review (backend) */
  user_id?: string;
  user_name?: string;
  user_city?: string;
  verified_purchase?: boolean;
  helpful_count?: number;
  status?: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_date?: string;
}

export interface Wishlist {
  id?: string;
  item_id: string;
  /** `discovery_kit` = discovery sets from `/discovery-sets` (not legacy `/kits`). */
  item_type: 'kit' | 'fragrance' | 'discovery_kit';
  item_name: string;
  item_price?: number;
  item_image?: string;
  created_by?: string;
}

export interface UserProfile {
  id?: string;
  scent_profile?: string;
  profile_summary?: string;
  liked_notes?: string[];
  disliked_notes?: string[];
  preferred_seasons?: string[];
  preferred_occasions?: string[];
  scent_families?: string[];
  preferred_intensity?: string;
  quiz_completed?: boolean;
  created_by?: string;
}

export interface RecentViewItem {
  fragrance: Fragrance;
  viewed_at: string;
  view_count?: number;
}

export interface Cart {
  id?: string;
  item_id: string;
  item_type: 'fragrance' | 'kit' | 'accessory' | 'discovery_kit';
  item_name: string;
  item_brand?: string;
  price: number;
  size?: string;
  quantity?: number;
  image_url?: string;
  created_by?: string;
}

export interface OrderItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  price: number;
  size?: string;
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  locality?: string;
  address_type?: 'home' | 'work' | 'other';
}

export interface Order {
  id?: string;
  order_number?: string;
  user_id?: string;
  items: OrderItem[];
  total_amount: number;
  status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status?: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: 'razorpay' | 'cod' | 'payment_link';
  shipping_address?: ShippingAddress;
  shipping_name?: string;
  shipping_phone?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_pincode?: string;
  payment_id?: string;
  razorpay_order_id?: string;
  paid_at?: string;
  created_by?: string;
  created_date?: string;
}

export interface LayeringCombo {
  id?: string;
  combo_name?: string;
  base_fragrance: {
    id: string;
    name: string;
    brand: string;
  };
  layer_fragrance: {
    id: string;
    name: string;
    brand: string;
  };
  layering_score?: number;
  explanation?: string;
  notes?: string;
  created_by?: string;
}

export interface ForumPost {
  id?: string;
  title: string;
  content: string;
  category?: 'recommendations' | 'reviews' | 'layering' | 'general' | 'questions';
  user_name?: string;
  likes_count?: number;
  replies_count?: number;
  created_by?: string;
  created_date?: string;
}

export interface ForumReply {
  id?: string;
  post_id: string;
  content: string;
  user_name?: string;
  likes_count?: number;
  created_by?: string;
  created_date?: string;
}


// ==================== Base44 Client ====================

export const base44 = {
  auth: {
    me: async (): Promise<User> => {
      // Try to get user from localStorage first
      const sessionUser = getUser();

      // Check if we have a valid auth token before making API call
      let hasAuthToken = false;
      try {
        const token = await getAccessToken();
        hasAuthToken = !!token;
      } catch (error) {
        hasAuthToken = false;
      }

      // Only validate with API if we have an auth token
      if (hasAuthToken) {
        // Skip retry on auth endpoints to avoid repeated 401s
        const response = await httpClient.get<User>('/api/v1/auth/me', { skipRetry: true });

        if (response.error) {
          // If 401/403, user is not authenticated - use session user instead
          if (response.error.statusCode === 401 || response.error.statusCode === 403) {
            if (sessionUser) {
              // Silently use session user - don't log or throw
              return sessionUser;
            }
            // No session user available, throw error
            throw response.error;
          }

          // For other errors with mock fallback enabled
          if (defaultConfig.useMockFallback && sessionUser) {
            console.warn('API unavailable, using session storage:', response.error.message);
            return sessionUser;
          }

          // Re-throw other errors
          throw response.error;
        }

        // Save to session for persistence
        if (response.data) {
          saveSession(response.data);
          return response.data;
        }
      }

      // Fallback to session user if no auth token or API call failed
      if (sessionUser) {
        return sessionUser;
      }

      // Last resort: return default user for demo (only if mock fallback enabled)
      if (defaultConfig.useMockFallback) {
        console.warn('Using demo fallback user because useMockFallback is enabled');
        const defaultUser: User = {
          role: 'user',
          email: 'demo@example.com',
          full_name: 'Demo User',
          created_date: new Date().toISOString()
        };
        saveSession(defaultUser);
        return defaultUser;
      }

      console.error('No user session found and mock fallback is disabled');
      throw new Error('No user session found');
    },
    /**
     * Update user profile with personal info and address.
     * 
     * @param data - Profile data to update (only provided fields will be updated)
     * @returns Updated user object
     */
    updateProfile: async (data: UpdateProfileData): Promise<User> => {
      const response = await httpClient.put<User>('/api/v1/auth/me', data);

      if (response.error) {
        throw response.error;
      }

      // Update local session with new data
      if (response.data) {
        saveSession(response.data);
        return response.data;
      }

      throw new Error('Failed to update profile');
    },
    logout: async (redirectUrl?: string): Promise<void> => {
      const response = await httpClient.post('/api/v1/auth/logout', {});

      // Clear local session regardless of API response
      clearSession();

      if (response.error && !defaultConfig.useMockFallback) {
        console.warn('Logout API error:', response.error.message);
      }

      if (redirectUrl && typeof window !== 'undefined') {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin: async (): Promise<void> => {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },
  entities: {
    DiscoveryKit: {
      list: async (sort?: string, limit?: number): Promise<DiscoveryKit[]> => {
        const params = new URLSearchParams();
        if (sort) params.append('sort', sort);
        if (limit) params.append('limit', limit.toString());

        const endpoint = `/api/v1/kits${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await httpClient.get<DiscoveryKit[]>(endpoint);

        if (response.error) {
          throw response.error;
        }

        return response.data || [];
      },
      filter: async (filters: any): Promise<DiscoveryKit[]> => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            params.append(key, filters[key].toString());
          }
        });

        const endpoint = `/api/v1/kits${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await httpClient.get<DiscoveryKit[]>(endpoint);

        if (response.error) {
          throw response.error;
        }

        return response.data || [];
      },
      get: async (id: string): Promise<DiscoveryKit | null> => {
        const response = await httpClient.get<DiscoveryKit>(`/api/v1/kits/${id}`);

        if (response.error) {
          throw response.error;
        }

        return response.data ?? null;
      },
      create: async (data: Partial<DiscoveryKit>): Promise<DiscoveryKit> => {
        const response = await httpClient.post<DiscoveryKit>('/api/v1/kits/', data);

        if (response.error) {
          throw response.error;
        }

        return response.data || { id: 'new-kit-id', name: data.name || '', price: data.price || 0, vial_count: data.vial_count || 0, ...data };
      },
      update: async (id: string, data: Partial<DiscoveryKit>): Promise<DiscoveryKit> => {
        const response = await httpClient.put<DiscoveryKit>(`/api/v1/kits/${id}`, data);

        if (response.error) {
          throw response.error;
        }

        return response.data || { id, name: '', price: 0, vial_count: 0, ...data };
      },
      delete: async (id: string): Promise<void> => {
        const response = await httpClient.delete(`/api/v1/kits/${id}`);

        if (response.error) {
          throw response.error;
        }
      }
    },
    Fragrance: {
      list: async (sort?: string, limit?: number): Promise<Fragrance[]> => {
        const params = new URLSearchParams();
        if (sort) params.append('sort', sort);
        if (limit) params.append('limit', limit.toString());

        const endpoint = `/api/v1/fragrances/${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await httpClient.get<Fragrance[]>(endpoint, {
          validator: (data) => ResponseValidator.validateArray(data, ResponseValidator.validateFragrance)
        });

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using mock data:', response.error.message);
          const data = limit ? mockFragrances.slice(0, limit) : mockFragrances;
          return [...data];
        }

        if (response.error) {
          throw response.error;
        }

        return (response.data || []).map((item: any) => ({
          ...item,
          image_url: item.primary_image_url || item.image_url || undefined,
          brand: item.brand_name || item.brand,
        }));
      },
      filter: async (filters: any): Promise<Fragrance[]> => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            params.append(key, filters[key].toString());
          }
        });

        const endpoint = `/api/v1/fragrances/${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await httpClient.get<Fragrance[]>(endpoint);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using mock data:', response.error.message);
          return getMockFragrances(filters);
        }

        if (response.error) {
          throw response.error;
        }

        return (response.data || []).map((item: any) => ({
          ...item,
          image_url: item.primary_image_url || item.image_url || undefined,
          brand: item.brand_name || item.brand,
        }));
      },
      get: async (id: string): Promise<Fragrance | null> => {
        const response = await httpClient.get<Fragrance>(`/api/v1/fragrances/${id}`, {
          validator: ResponseValidator.validateFragrance
        });

        if (response.error) {
          // 404: product does not exist return null so page can show notFound()
          if (response.error.type === ErrorType.NOT_FOUND || response.error.statusCode === 404) {
            return null;
          }
          // Network/connection failure throw so product page can show retry UI
          if (response.error.type === ErrorType.NETWORK) {
            throw response.error;
          }
          if (defaultConfig.useMockFallback) {
            console.warn('API unavailable, using mock data:', response.error.message);
            return mockFragrances.find(f => f.id === id) || null;
          }
          throw response.error;
        }

        const item = response.data;
        if (!item) return null;
        return {
          ...item,
          image_url: (item as any).primary_image_url || item.image_url || undefined,
          brand: (item as any).brand_name || item.brand,
        };
      },
      create: async (data: Partial<Fragrance>): Promise<Fragrance> => {
        const response = await httpClient.post<Fragrance>('/api/v1/fragrances/', data);

        if (response.error) {
          throw response.error;
        }

        return response.data || { id: 'new-fragrance-id', name: data.name || '', brand: data.brand || '', gender: data.gender || 'unisex', price_3ml: data.price_3ml || 0, ...data };
      },
      update: async (id: string, data: Partial<Fragrance>): Promise<Fragrance> => {
        const response = await httpClient.put<Fragrance>(`/api/v1/fragrances/${id}`, data);

        if (response.error) {
          throw response.error;
        }

        return response.data || { id, name: '', brand: '', gender: 'unisex', price_3ml: 0, ...data };
      }
    },
    Review: {
      list: async (sort?: string): Promise<Review[]> => {
        const params = new URLSearchParams();
        if (sort) params.append('sort', sort);

        const endpoint = `/api/v1/reviews/${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await httpClient.get<Review[]>(endpoint);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using mock data:', response.error.message);
          return [...mockReviews];
        }

        if (response.error) {
          throw response.error;
        }

        return response.data || [];
      },
      filter: async (filters: any): Promise<Review[]> => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            params.append(key, filters[key].toString());
          }
        });

        const endpoint = `/api/v1/reviews/${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await httpClient.get<Review[]>(endpoint);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using mock data:', response.error.message);
          let results = [...mockReviews];

          if (filters.fragrance_id) {
            results = results.filter(r => r.fragrance_id === filters.fragrance_id);
          }

          if (filters.status) {
            results = results.filter(r => r.status === filters.status);
          }

          return results;
        }

        if (response.error) {
          throw response.error;
        }

        return response.data || [];
      },
      get: async (id: string): Promise<Review | null> => {
        const response = await httpClient.get<Review>(`/api/v1/reviews/${id}`);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using mock data:', response.error.message);
          return mockReviews.find(r => r.id === id) || null;
        }

        if (response.error) {
          throw response.error;
        }

        return response.data;
      },
      create: async (data: Partial<Review>): Promise<Review> => {
        const response = await httpClient.post<Review>('/api/v1/reviews/', data);

        if (response.error) {
          throw response.error;
        }

        return response.data || { id: 'new-review-id', fragrance_id: data.fragrance_id || '', rating: data.rating || 0, comment: data.comment || '', ...data };
      },
      update: async (id: string, data: Partial<Review>): Promise<Review> => {
        const response = await httpClient.put<Review>(`/api/v1/reviews/${id}`, data);

        if (response.error) {
          throw response.error;
        }

        return response.data || { id, fragrance_id: '', rating: 0, comment: '', ...data };
      },
      delete: async (id: string): Promise<void> => {
        const response = await httpClient.delete(`/api/v1/reviews/${id}`);

        if (response.error) {
          throw response.error;
        }
      },
      markHelpful: async (id: string): Promise<Review> => {
        const response = await httpClient.put<Review>(`/api/v1/reviews/${id}/helpful`, {});

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using mock data:', response.error.message);
          // Update mock data locally
          const review = mockReviews.find(r => r.id === id);
          if (review) {
            review.helpful_count = (review.helpful_count || 0) + 1;
            return { ...review };
          }
          throw new Error('Review not found');
        }

        if (response.error) {
          throw response.error;
        }

        return response.data || { id, fragrance_id: '', rating: 0, comment: '', helpful_count: 1 };
      },
      /**
       * Toggle like on a review (like if not liked, unlike if already liked).
       * Requires authentication. Returns the new like status and count.
       */
      toggleLike: async (id: string): Promise<{ liked: boolean; helpful_count: number; message: string }> => {
        const response = await httpClient.post<{ liked: boolean; helpful_count: number; message: string }>(
          `/api/v1/reviews/${id}/like`,
          {}
        );

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using mock fallback:', response.error.message);
          // Mock toggle behavior
          const review = mockReviews.find(r => r.id === id);
          if (review) {
            review.helpful_count = (review.helpful_count || 0) + 1;
            return { liked: true, helpful_count: review.helpful_count, message: 'Review liked (mock)' };
          }
          throw new Error('Review not found');
        }

        if (response.error) {
          throw response.error;
        }

        return response.data || { liked: true, helpful_count: 1, message: 'Review liked' };
      },
      /**
       * Get the current user's like status for a review.
       */
      getLikeStatus: async (id: string): Promise<{ liked: boolean; authenticated: boolean }> => {
        const response = await httpClient.get<{ liked: boolean; authenticated: boolean }>(
          `/api/v1/reviews/${id}/like-status`
        );

        if (response.error && defaultConfig.useMockFallback) {
          return { liked: false, authenticated: false };
        }

        if (response.error) {
          // Don't throw on auth errors, just return unauthenticated state
          return { liked: false, authenticated: false };
        }

        return response.data || { liked: false, authenticated: false };
      },
      /**
       * Get all review IDs that the current user has liked.
       * Useful for initializing UI state on page load.
       */
      getUserLikedReviews: async (): Promise<string[]> => {
        const response = await httpClient.get<{ liked_review_ids: string[] }>(
          '/api/v1/reviews/user/liked'
        );

        if (response.error && defaultConfig.useMockFallback) {
          return [];
        }

        if (response.error) {
          // Don't throw on auth errors, just return empty array
          return [];
        }

        return response.data?.liked_review_ids || [];
      }
    },
    Wishlist: {
      filter: async (filters: any): Promise<Wishlist[]> => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            params.append(key, filters[key].toString());
          }
        });

        const endpoint = `/api/v1/wishlist/${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await httpClient.get<Wishlist[]>(endpoint);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using localStorage:', response.error.message);
          const userEmail = filters.created_by;
          if (!userEmail) return [];

          if (filters.item_id) {
            const item = wishlistStorage.getWishlistItem(userEmail, filters.item_id);
            return item ? [item] : [];
          }

          return wishlistStorage.filterWishlistItems(userEmail, filters);
        }

        if (response.error) {
          throw response.error;
        }

        return response.data || [];
      },
      get: async (id: string): Promise<Wishlist | null> => {
        const response = await httpClient.get<Wishlist>(`/api/v1/wishlist/${id}`);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using localStorage:', response.error.message);
          const sessionUser = getUser();
          if (!sessionUser?.email) return null;

          const items = wishlistStorage.getWishlistItems(sessionUser.email);
          return items.find(i => i.id === id) || null;
        }

        if (response.error) {
          throw response.error;
        }

        return response.data;
      },
      create: async (data: Partial<Wishlist>): Promise<Wishlist> => {
        const response = await httpClient.post<Wishlist>('/api/v1/wishlist/', data);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using localStorage:', response.error.message);
          const sessionUser = getUser();
          if (!sessionUser?.email) {
            throw new Error('User not authenticated');
          }

          const newItem: Wishlist = {
            id: `wishlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            item_id: data.item_id || '',
            item_type: data.item_type || 'fragrance',
            item_name: data.item_name || '',
            item_price: data.item_price,
            item_image: data.item_image,
            created_by: sessionUser.email
          };

          wishlistStorage.addToWishlist(sessionUser.email, newItem);
          window.dispatchEvent(new CustomEvent('wishlistUpdated'));

          return newItem;
        }

        if (response.error) {
          throw response.error;
        }

        // Sync to localStorage
        const sessionUser = getUser();
        if (sessionUser?.email && response.data) {
          wishlistStorage.addToWishlist(sessionUser.email, response.data);
        }

        window.dispatchEvent(new CustomEvent('wishlistUpdated'));
        return response.data || { id: 'new-wishlist-id', item_id: '', item_type: 'fragrance', item_name: '' };
      },
      delete: async (id: string): Promise<void> => {
        const response = await httpClient.delete(`/api/v1/wishlist/${id}`);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using localStorage:', response.error.message);
          const sessionUser = getUser();
          if (!sessionUser?.email) {
            throw new Error('User not authenticated');
          }

          wishlistStorage.removeFromWishlist(sessionUser.email, id);
          window.dispatchEvent(new CustomEvent('wishlistUpdated'));
          return;
        }

        if (response.error) {
          throw response.error;
        }

        // Sync to localStorage
        const sessionUser = getUser();
        if (sessionUser?.email) {
          wishlistStorage.removeFromWishlist(sessionUser.email, id);
        }

        window.dispatchEvent(new CustomEvent('wishlistUpdated'));
      }
    },
    UserProfile: {
      filter: async (filters: any): Promise<UserProfile[]> => {
        // Placeholder - implement based on your API structure
        return [];
      },
      get: async (id: string): Promise<UserProfile | null> => {
        // Placeholder - implement based on your API structure
        return null;
      },
      create: async (data: Partial<UserProfile>): Promise<UserProfile> => {
        // Placeholder - implement based on your API structure
        return { id: 'new-profile-id', ...data };
      },
      update: async (id: string, data: Partial<UserProfile>): Promise<UserProfile> => {
        // Placeholder - implement based on your API structure
        return { id, ...data };
      }
    },
    RecentViews: {
      list: async (limit: number = 20): Promise<RecentViewItem[]> => {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());

        const endpoint = `/api/v1/users/recent-views?${params.toString()}`;
        const response = await httpClient.get<RecentViewItem[]>(endpoint);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, returning empty recent views:', response.error.message);
          return [];
        }

        if (response.error) {
          throw response.error;
        }

        return response.data || [];
      },
      track: async (productId: string, viewSource: string = 'product_page'): Promise<void> => {
        const user = getUser();
        const userId = user?.id;

        if (!userId) {
          console.warn('No user ID available, skipping recent view tracking');
          return;
        }

        const params = new URLSearchParams();
        params.append('user_id', userId);
        if (viewSource) params.append('view_source', viewSource);

        const endpoint = `/api/v1/users/recent-views/${productId}?${params.toString()}`;
        const response = await httpClient.post<{ status: string }>(endpoint, {});

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, skipping recent view tracking:', response.error.message);
          return;
        }

        if (response.error) {
          throw response.error;
        }
      }
    },
    Cart: {
      filter: async (filters: any): Promise<Cart[]> => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            params.append(key, filters[key].toString());
          }
        });

        const endpoint = `/api/v1/cart/${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await httpClient.get<Cart[]>(endpoint);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using localStorage:', response.error.message);
          const userEmail = filters.created_by;
          if (!userEmail) return [];
          return cartStorage.filterCartItems(userEmail, filters);
        }

        if (response.error) {
          throw response.error;
        }

        return response.data || [];
      },
      get: async (id: string): Promise<Cart | null> => {
        const response = await httpClient.get<Cart>(`/api/v1/cart/${id}`);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using localStorage:', response.error.message);
          const sessionUser = getUser();
          if (!sessionUser?.email) return null;

          const items = cartStorage.getCartItems(sessionUser.email);
          return items.find(i => i.id === id) || null;
        }

        if (response.error) {
          throw response.error;
        }

        return response.data;
      },
      create: async (data: Partial<Cart>): Promise<Cart> => {
        const response = await httpClient.post<Cart>('/api/v1/cart/', data, {
          validator: ResponseValidator.validateCart
        });

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using localStorage:', response.error.message);
          const sessionUser = getUser();
          if (!sessionUser?.email) {
            throw new Error('User not authenticated');
          }

          const newItem: Cart = {
            id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            item_id: data.item_id || '',
            item_type: data.item_type || 'fragrance',
            item_name: data.item_name || '',
            item_brand: data.item_brand,
            price: data.price || 0,
            size: data.size,
            quantity: data.quantity || 1,
            image_url: data.image_url,
            created_by: sessionUser.email
          };

          cartStorage.addToCart(sessionUser.email, newItem);
          window.dispatchEvent(new CustomEvent('cartUpdated'));

          return newItem;
        }

        if (response.error) {
          throw response.error;
        }

        // Sync to localStorage for offline access
        const sessionUser = getUser();
        if (sessionUser?.email && response.data) {
          cartStorage.addToCart(sessionUser.email, response.data);
        }

        window.dispatchEvent(new CustomEvent('cartUpdated'));
        return response.data || { id: 'new-cart-id', item_id: '', item_type: 'fragrance', item_name: '', price: 0, quantity: 1 };
      },
      update: async (id: string, data: Partial<Cart>): Promise<Cart> => {
        const response = await httpClient.put<Cart>(`/api/v1/cart/${id}`, data);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using localStorage:', response.error.message);
          const sessionUser = getUser();
          if (!sessionUser?.email) {
            throw new Error('User not authenticated');
          }

          if (data.quantity !== undefined) {
            cartStorage.updateCartItem(sessionUser.email, id, data.quantity);
          }

          window.dispatchEvent(new CustomEvent('cartUpdated'));

          const items = cartStorage.getCartItems(sessionUser.email);
          const updated = items.find(i => i.id === id);
          return updated || { id, item_id: '', item_type: 'fragrance', item_name: '', price: 0, quantity: 1 };
        }

        if (response.error) {
          throw response.error;
        }

        // Sync to localStorage
        const sessionUser = getUser();
        if (sessionUser?.email && response.data) {
          if (data.quantity !== undefined) {
            cartStorage.updateCartItem(sessionUser.email, id, data.quantity);
          }
        }

        window.dispatchEvent(new CustomEvent('cartUpdated'));
        return response.data || { id, item_id: '', item_type: 'fragrance', item_name: '', price: 0, quantity: 1 };
      },
      delete: async (id: string): Promise<void> => {
        const response = await httpClient.delete(`/api/v1/cart/${id}`);

        if (response.error && defaultConfig.useMockFallback) {
          console.warn('API unavailable, using localStorage:', response.error.message);
          const sessionUser = getUser();
          if (!sessionUser?.email) {
            throw new Error('User not authenticated');
          }

          cartStorage.removeCartItem(sessionUser.email, id);
          window.dispatchEvent(new CustomEvent('cartUpdated'));
          return;
        }

        if (response.error) {
          throw response.error;
        }

        // Sync to localStorage
        const sessionUser = getUser();
        if (sessionUser?.email) {
          cartStorage.removeCartItem(sessionUser.email, id);
        }

        window.dispatchEvent(new CustomEvent('cartUpdated'));
      }
    },
    Order: {
      filter: async (filters: any): Promise<Order[]> => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            params.append(key, filters[key].toString());
          }
        });

        const endpoint = `/api/v1/orders/${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await httpClient.get<Order[]>(endpoint);

        if (response.error) {
          throw response.error;
        }

        return response.data || [];
      },
      get: async (id: string): Promise<Order | null> => {
        const response = await httpClient.get<Order>(`/api/v1/orders/${id}`);

        if (response.error) {
          throw response.error;
        }

        return response.data;
      },
      create: async (data: Partial<Order>): Promise<Order> => {
        const response = await httpClient.post<Order>('/api/v1/orders/', data, {
          validator: ResponseValidator.validateOrder
        });

        if (response.error) {
          throw response.error;
        }

        return response.data || { id: 'new-order-id', items: data.items || [], total_amount: data.total_amount || 0, ...data };
      },
      update: async (id: string, data: Partial<Order>): Promise<Order> => {
        const response = await httpClient.put<Order>(`/api/v1/orders/${id}`, data);

        if (response.error) {
          throw response.error;
        }

        return response.data || { id, items: [], total_amount: 0, ...data };
      }
    },
    LayeringCombo: {
      filter: async (filters: any): Promise<LayeringCombo[]> => {
        // Placeholder - implement based on your API structure
        console.log("Filtering LayeringCombo with:", filters);
        return [];
      },
      get: async (id: string): Promise<LayeringCombo | null> => {
        // Placeholder - implement based on your API structure
        console.log("Getting LayeringCombo:", id);
        return null;
      },
      create: async (data: Partial<LayeringCombo>): Promise<LayeringCombo> => {
        // Placeholder - implement based on your API structure
        console.log("Creating LayeringCombo:", data);
        return {
          id: 'new-combo-id',
          base_fragrance: data.base_fragrance || { id: '', name: '', brand: '' },
          layer_fragrance: data.layer_fragrance || { id: '', name: '', brand: '' },
          ...data
        };
      },
      update: async (id: string, data: Partial<LayeringCombo>): Promise<LayeringCombo> => {
        // Placeholder - implement based on your API structure
        console.log("Updating LayeringCombo:", id, data);
        return {
          id,
          base_fragrance: { id: '', name: '', brand: '' },
          layer_fragrance: { id: '', name: '', brand: '' },
          ...data
        };
      },
      delete: async (id: string): Promise<void> => {
        // Placeholder - implement based on your API structure
        console.log("Deleting LayeringCombo:", id);
      }
    },
    ForumPost: {
      list: async (sort?: string): Promise<ForumPost[]> => {
        // Placeholder - implement based on your API structure
        console.log("Listing ForumPosts with sort:", sort);
        return [];
      },
      filter: async (filters: any): Promise<ForumPost[]> => {
        // Placeholder - implement based on your API structure
        console.log("Filtering ForumPosts with:", filters);
        return [];
      },
      get: async (id: string): Promise<ForumPost | null> => {
        // Placeholder - implement based on your API structure
        console.log("Getting ForumPost:", id);
        return null;
      },
      create: async (data: Partial<ForumPost>): Promise<ForumPost> => {
        // Placeholder - implement based on your API structure
        console.log("Creating ForumPost:", data);
        return { id: 'new-post-id', title: data.title || '', content: data.content || '', ...data };
      },
      update: async (id: string, data: Partial<ForumPost>): Promise<ForumPost> => {
        // Placeholder - implement based on your API structure
        console.log("Updating ForumPost:", id, data);
        return { id, title: '', content: '', ...data };
      },
      delete: async (id: string): Promise<void> => {
        // Placeholder - implement based on your API structure
        console.log("Deleting ForumPost:", id);
      }
    },
    ForumReply: {
      filter: async (filters: any): Promise<ForumReply[]> => {
        // Placeholder - implement based on your API structure
        console.log("Filtering ForumReplies with:", filters);
        return [];
      },
      get: async (id: string): Promise<ForumReply | null> => {
        // Placeholder - implement based on your API structure
        console.log("Getting ForumReply:", id);
        return null;
      },
      create: async (data: Partial<ForumReply>): Promise<ForumReply> => {
        // Placeholder - implement based on your API structure
        console.log("Creating ForumReply:", data);
        return { id: 'new-reply-id', post_id: data.post_id || '', content: data.content || '', ...data };
      },
      update: async (id: string, data: Partial<ForumReply>): Promise<ForumReply> => {
        // Placeholder - implement based on your API structure
        console.log("Updating ForumReply:", id, data);
        return { id, post_id: '', content: '', ...data };
      },
      delete: async (id: string): Promise<void> => {
        // Placeholder - implement based on your API structure
        console.log("Deleting ForumReply:", id);
      }
    },
    UserFollow: {
      filter: async (filters: any): Promise<any[]> => {
        // Placeholder - implement based on your API structure
        console.log("Filtering UserFollow with:", filters);
        return [];
      }
    }
  },
  integrations: {
    Core: {
      // LLM integration removed - all AI features have been replaced with rule-based alternatives
      InvokeLLM: async (_params: { prompt: string; response_json_schema: any }): Promise<any> => {
        console.warn("InvokeLLM is deprecated. All AI features have been removed and replaced with rule-based alternatives.");
        return {};
      }
    }
  },

  // ==================== Enhanced Perfume Catalog API ====================
  // Requirements: 10.1-10.6

  collections: {
    /**
     * Get all fragrances for a brand with filtering and pagination.
     * 
     * Requirements: 3.1, 3.2, 3.3, 10.1
     * 
     * @param brandSlug - URL-friendly brand identifier (e.g., "dior", "chanel")
     * @param filters - Optional filter parameters
     * @returns Collection response with paginated fragrances
     */
    getCollection: async (
      brandSlug: string,
      filters?: {
        gender?: string[];
        concentration?: string[];
        priceMin?: number;
        priceMax?: number;
        season?: string[];
        occasion?: string[];
        scentAccord?: string[];
        year?: number[];
        sortBy?: 'popularity' | 'price_low_high' | 'price_high_low' | 'rating' | 'newest';
        page?: number;
        pageSize?: number;
      }
    ): Promise<CollectionResponse> => {
      const params = new URLSearchParams();

      if (filters) {
        // Handle array parameters
        if (filters.gender) {
          filters.gender.forEach(g => params.append('gender', g));
        }
        if (filters.concentration) {
          filters.concentration.forEach(c => params.append('concentration', c));
        }
        if (filters.season) {
          filters.season.forEach(s => params.append('season', s));
        }
        if (filters.occasion) {
          filters.occasion.forEach(o => params.append('occasion', o));
        }
        if (filters.scentAccord) {
          filters.scentAccord.forEach(a => params.append('scent_accord', a));
        }
        if (filters.year) {
          filters.year.forEach(y => params.append('year', y.toString()));
        }

        // Handle scalar parameters
        if (filters.priceMin !== undefined) {
          params.append('price_min', filters.priceMin.toString());
        }
        if (filters.priceMax !== undefined) {
          params.append('price_max', filters.priceMax.toString());
        }
        if (filters.sortBy) {
          params.append('sort_by', filters.sortBy);
        }
        if (filters.page) {
          params.append('page', filters.page.toString());
        }
        if (filters.pageSize) {
          params.append('page_size', filters.pageSize.toString());
        }
      }

      const queryString = params.toString();
      const endpoint = `/api/v1/collections/${brandSlug}${queryString ? `?${queryString}` : ''}`;

      const response = await httpClient.get<any>(endpoint);

      if (response.error) {
        throw response.error;
      }

      // Transform snake_case to camelCase
      const rawData = response.data;
      return {
        data: (rawData.data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          brandName: item.brand_name,
          brandSlug: item.brand_slug,
          gender: item.gender,
          concentration: item.concentration,
          price3ml: item.price_3ml,
          price8ml: item.price_8ml,
          price12ml: item.price_12ml,
          originalPrice3ml: item.original_price_3ml,
          blindBuyScore: item.blind_buy_score || 4.0,
          averageRating: item.average_rating,
          reviewCount: item.review_count || 0,
          imageUrl: item.primary_image_url || item.image_url,
          isOnSale: item.is_on_sale || false,
          isBestseller: item.is_bestseller || false,
          isNew: item.is_new || false,
          discountPercentage: item.discount_percentage,
          seasons: item.seasons || [],
          occasions: item.occasions || [],
          scentAccords: item.scent_accords || [],
          yearIntroduced: item.year_introduced,
        })),
        pagination: {
          page: rawData.pagination?.page || 1,
          pageSize: rawData.pagination?.page_size || 24,
          total: rawData.pagination?.total || 0,
          totalPages: rawData.pagination?.total_pages || 1,
        },
        brandName: rawData.brand_name || brandSlug,
        brandSlug: rawData.brand_slug || brandSlug,
        filtersApplied: rawData.filters_applied || {},
      };
    },

    /**
     * Get list of all available brands with fragrance counts.
     * 
     * @returns List of brands sorted alphabetically
     */
    listBrands: async (): Promise<BrandsListResponse> => {
      const response = await httpClient.get<any>('/api/v1/collections/');

      if (response.error) {
        throw response.error;
      }

      return {
        brands: response.data?.brands || [],
        total: response.data?.total || 0,
      };
    }
  },

  enhancedFragrances: {
    /**
     * Get enhanced fragrance detail with full metadata.
     * 
     * Requirements: 10.2
     * 
     * @param id - Fragrance ID or slug
     * @returns Enhanced fragrance detail
     */
    getEnhanced: async (id: string): Promise<EnhancedFragranceDetail> => {
      const response = await httpClient.get<any>(`/api/v1/fragrances/${id}/enhanced`);

      if (response.error) {
        throw response.error;
      }

      const raw = response.data;
      return {
        id: raw.id,
        name: raw.name,
        brandName: raw.brand_name,
        brandSlug: raw.brand_slug,
        sku: raw.sku,
        gender: raw.gender,
        concentration: raw.concentration,
        notes: raw.notes || {},
        ingredients: raw.ingredients || [],
        scentAccords: raw.scent_accords || [],
        seasons: raw.seasons || [],
        occasions: raw.occasions || [],
        recommendedUses: raw.recommended_uses || [],
        yearIntroduced: raw.year_introduced,
        aboutFragrance: raw.about_fragrance,
        price3ml: raw.price_3ml,
        price8ml: raw.price_8ml,
        price12ml: raw.price_12ml,
        originalPrice3ml: raw.original_price_3ml,
        originalPrice8ml: raw.original_price_8ml,
        originalPrice12ml: raw.original_price_12ml,
        isOnSale: raw.is_on_sale || false,
        discountPercentage: raw.discount_percentage,
        blindBuyScore: raw.blind_buy_score || 4.0,
        averageRating: raw.average_rating,
        reviewCount: raw.review_count || 0,
        isBestseller: raw.is_bestseller || false,
        isNew: raw.is_new || false,
        imageUrl: raw.primary_image_url || raw.image_url,
        images: raw.images || [],
        isAuthentic: raw.is_authentic ?? true,
        freeShippingEligible: raw.free_shipping_eligible ?? true,
        rewardsEligible: raw.rewards_eligible ?? true,
      };
    },

    /**
     * Get fragrances similar to a specific fragrance.
     * 
     * Requirements: 10.3, 5.4, 5.5, 5.6
     * 
     * @param id - Fragrance ID or slug
     * @param limit - Number of similar fragrances to return (default: 6)
     * @returns Similar fragrances with similarity scores
     */
    getSimilar: async (id: string, limit: number = 6): Promise<SimilarFragrancesResponse> => {
      const response = await httpClient.get<any>(`/api/v1/fragrances/${id}/similar?limit=${limit}`);

      if (response.error) {
        throw response.error;
      }

      const raw = response.data;
      // Backend returns a plain array, not {data: [...]}
      const items = Array.isArray(raw) ? raw : (raw?.data || []);
      return {
        data: items.map((item: any) => ({
          id: item.id,
          name: item.name,
          brandName: item.brand_name || item.brandName,
          gender: item.gender,
          imageUrl: item.image_url || item.primary_image_url || item.imageUrl,
          price: item.price || item.price_3ml,
          originalPrice: item.original_price || item.original_price_3ml,
          blindBuyScore: item.blind_buy_score || item.blindBuyScore || 4.0,
          similarityScore: item.similarity_score,
          matchReasons: item.match_reasons || [],
        })),
        sourceFragranceId: Array.isArray(raw) ? id : (raw.source_fragrance_id || id),
        total: Array.isArray(raw) ? raw.length : (raw.total || 0),
      };
    },

    /**
     * Search fragrances with BM25 ranking.
     * 
     * Requirements: 10.4, 8.1-8.5
     * 
     * @param query - Search query string
     * @param filters - Optional filter parameters
     * @returns Search results ranked by relevance
     */
    search: async (
      query: string,
      filters?: {
        gender?: string[];
        concentration?: string[];
        priceMin?: number;
        priceMax?: number;
        page?: number;
        pageSize?: number;
      }
    ): Promise<SearchResponse> => {
      const params = new URLSearchParams();
      params.append('q', query);

      if (filters) {
        if (filters.gender) {
          filters.gender.forEach(g => params.append('gender', g));
        }
        if (filters.concentration) {
          filters.concentration.forEach(c => params.append('concentration', c));
        }
        if (filters.priceMin !== undefined) {
          params.append('price_min', filters.priceMin.toString());
        }
        if (filters.priceMax !== undefined) {
          params.append('price_max', filters.priceMax.toString());
        }
        if (filters.page) {
          params.append('page', filters.page.toString());
        }
        if (filters.pageSize) {
          params.append('page_size', filters.pageSize.toString());
        }
      }

      const endpoint = `/api/v1/fragrances/search/advanced?${params.toString()}`;
      const response = await httpClient.get<any>(endpoint);

      if (response.error) {
        throw response.error;
      }

      const raw = response.data;
      return {
        data: (raw.data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          brand: item.brand ?? item.brand_name,
          gender: item.gender,
          price3ml: item.price_3ml,
          price8ml: item.price_8ml,
          price12ml: item.price_12ml,
          imageUrl: item.image_url ?? item.primary_image_url,
          blindBuyScore: item.blind_buy_score,
          relevanceScore: item.relevance_score,
          matchType: item.match_type,
        })),
        query: raw.query || query,
        total: raw.total || 0,
        page: raw.page || 1,
        pageSize: raw.page_size || 24,
        totalPages: raw.total_pages || 1,
      };
    }
  },

  filters: {
    /**
     * Get available filter options with counts.
     * 
     * Requirements: 3.4-3.11, 10.6
     * 
     * @param brandSlug - Optional brand slug to get brand-specific filters
     * @returns Filter options with product counts
     */
    getOptions: async (brandSlug?: string): Promise<FilterOptionsResponse> => {
      const params = new URLSearchParams();
      if (brandSlug) {
        params.append('brand_slug', brandSlug);
      }

      const queryString = params.toString();
      const endpoint = `/api/v1/filters/options${queryString ? `?${queryString}` : ''}`;

      const response = await httpClient.get<any>(endpoint);

      if (response.error) {
        throw response.error;
      }

      const raw = response.data;
      const data = raw.data || {};

      return {
        data: {
          genders: data.genders || [],
          concentrations: data.concentrations || [],
          priceRanges: (data.price_ranges || []).map((pr: any) => ({
            minPrice: pr.min_price,
            maxPrice: pr.max_price,
            label: pr.label,
            count: pr.count,
          })),
          seasons: data.seasons || [],
          occasions: data.occasions || [],
          scentAccords: data.scent_accords || [],
          years: data.years || [],
          brands: data.brands || [],
        },
        totalProducts: raw.total_products || 0,
        brandSlug: raw.brand_slug,
      };
    }
  },

  // ==================== Community API ====================
  community: {
    /**
     * Get community posts with filtering and sorting
     */
    getPosts: async (params?: {
      category?: PostCategory;
      sort_by?: SortBy;
      top_period?: TopPeriod;
      q?: string;
      limit?: number;
      offset?: number;
    }): Promise<CommunityPost[]> => {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params?.top_period) queryParams.append('top_period', params.top_period);
      if (params?.q?.trim()) queryParams.append('q', params.q.trim());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const endpoint = `/api/v1/community/posts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await httpClient.get<CommunityPost[]>(endpoint);

      if (response.error && defaultConfig.useMockFallback) {
        console.warn('API unavailable, using empty array:', response.error.message);
        return [];
      }

      if (response.error) {
        throw response.error;
      }

      return response.data || [];
    },

    /**
     * Get a single post by ID
     */
    getPost: async (postId: string): Promise<CommunityPost> => {
      const response = await httpClient.get<CommunityPost>(`/api/v1/community/posts/${postId}`);

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('Post not found');
      }

      return response.data;
    },

    /**
     * Create a new community post (requires auth)
     */
    getSimilarPosts: async (postId: string, limit: number = 5): Promise<CommunityPost[]> => {
      const response = await httpClient.get<CommunityPost[]>(
        `/api/v1/community/posts/${postId}/similar?limit=${limit}`
      );
      if (response.error) {
        throw response.error;
      }
      return response.data || [];
    },

    listSavedPosts: async (params?: { limit?: number; offset?: number }): Promise<CommunityPost[]> => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      const qs = queryParams.toString();
      const response = await httpClient.get<CommunityPost[]>(
        `/api/v1/community/posts/saved/me${qs ? `?${qs}` : ''}`
      );
      if (response.error) {
        throw response.error;
      }
      return response.data || [];
    },

    savePost: async (postId: string): Promise<CommunityPost> => {
      const response = await httpClient.post<CommunityPost>(`/api/v1/community/posts/${postId}/save`, {});
      if (response.error) {
        throw response.error;
      }
      if (!response.data) {
        throw new Error('Failed to save post');
      }
      return response.data;
    },

    unsavePost: async (postId: string): Promise<CommunityPost> => {
      const response = await httpClient.delete<CommunityPost>(`/api/v1/community/posts/${postId}/save`);
      if (response.error) {
        throw response.error;
      }
      if (!response.data) {
        throw new Error('Failed to unsave post');
      }
      return response.data;
    },

    createReport: async (data: {
      target_type: 'post' | 'comment';
      target_id: string;
      post_id?: string;
      reason: string;
      details?: string;
    }): Promise<void> => {
      const response = await httpClient.post('/api/v1/community/reports', data);
      if (response.error) {
        throw response.error;
      }
    },

    createPost: async (data: {
      title: string;
      content: string;
      category: PostCategory;
      post_flair?: PostFlair;
      review_meta?: ReviewMeta;
      perfume_ids?: string[];
      images?: string[];
    }): Promise<CommunityPost> => {
      const response = await httpClient.post<CommunityPost>(
        '/api/v1/community/posts',
        data
      );

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('Failed to create post');
      }

      return response.data;
    },

    /**
     * Update a post (requires auth, only by author)
     */
    updatePost: async (postId: string, data: {
      title?: string;
      content?: string;
      category?: PostCategory;
      post_flair?: PostFlair;
      review_meta?: ReviewMeta | null;
      perfume_ids?: string[];
      images?: string[];
    }): Promise<CommunityPost> => {
      const response = await httpClient.put<CommunityPost>(
        `/api/v1/community/posts/${postId}`,
        data
      );

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('Failed to update post');
      }

      return response.data;
    },

    /**
     * Delete a post (requires auth, only by author)
     */
    deletePost: async (postId: string): Promise<void> => {
      const response = await httpClient.delete(`/api/v1/community/posts/${postId}`);

      if (response.error) {
        throw response.error;
      }
    },

    /**
     * Vote on a post (requires auth)
     */
    voteOnPost: async (postId: string, voteType: 'upvote' | 'downvote' | 'remove'): Promise<CommunityPost> => {
      const response = await httpClient.post<CommunityPost>(
        `/api/v1/community/posts/${postId}/vote`,
        { vote_type: voteType }
      );

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('Failed to vote on post');
      }

      return response.data;
    }
  },

  // ==================== Comments API ====================
  comments: {
    /**
     * Get comments for a post (with nested replies)
     */
    getPostComments: async (
      postId: string,
      commentSort: 'best' | 'old' = 'best'
    ): Promise<Comment[]> => {
      const response = await httpClient.get<Comment[]>(
        `/api/v1/comments/post/${postId}?comment_sort=${commentSort}`
      );

      if (response.error && defaultConfig.useMockFallback) {
        console.warn('API unavailable, using empty array:', response.error.message);
        return [];
      }

      if (response.error) {
        throw response.error;
      }

      return response.data || [];
    },

    /**
     * Create a comment (requires auth)
     */
    createComment: async (data: {
      post_id: string;
      parent_comment_id?: string;
      content: string;
    }): Promise<Comment> => {
      const response = await httpClient.post<Comment>(
        '/api/v1/comments/',
        data
      );

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('Failed to create comment');
      }

      return response.data;
    },

    /**
     * Update a comment (requires auth, only by author)
     */
    updateComment: async (commentId: string, data: {
      content: string;
    }): Promise<Comment> => {
      const response = await httpClient.put<Comment>(
        `/api/v1/comments/${commentId}`,
        data
      );

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('Failed to update comment');
      }

      return response.data;
    },

    /**
     * Delete a comment (requires auth, only by author)
     */
    deleteComment: async (commentId: string): Promise<void> => {
      const response = await httpClient.delete(`/api/v1/comments/${commentId}`);

      if (response.error) {
        throw response.error;
      }
    },

    /**
     * Vote on a comment (requires auth)
     */
    voteOnComment: async (commentId: string, voteType: 'upvote' | 'downvote' | 'remove'): Promise<Comment> => {
      const response = await httpClient.post<Comment>(
        `/api/v1/comments/${commentId}/vote`,
        { vote_type: voteType }
      );

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('Failed to vote on comment');
      }

      return response.data;
    }
  },

};


// ==================== Type Exports for Enhanced API ====================

export interface CollectionFragranceItem {
  id: string;
  name: string;
  brandName: string;
  brandSlug: string;
  gender: string;
  concentration?: string;
  price3ml: number;
  price8ml?: number;
  price12ml?: number;
  originalPrice3ml?: number;
  blindBuyScore: number;
  averageRating?: number;
  reviewCount: number;
  imageUrl?: string;
  isOnSale: boolean;
  isBestseller: boolean;
  isNew: boolean;
  discountPercentage?: number;
  seasons: string[];
  occasions: string[];
  scentAccords: string[];
  yearIntroduced?: number;
}

export interface CollectionResponse {
  data: CollectionFragranceItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  brandName: string;
  brandSlug: string;
  filtersApplied: Record<string, unknown>;
}

export interface BrandsListResponse {
  brands: Array<{
    slug: string;
    name: string;
    count: number;
  }>;
  total: number;
}

export interface EnhancedFragranceDetail {
  id: string;
  name: string;
  brandName: string;
  brandSlug: string;
  sku?: string;
  gender: string;
  concentration?: string;
  notes: {
    top?: string[];
    middle?: string[];
    base?: string[];
  };
  ingredients: string[];
  scentAccords: string[];
  seasons: string[];
  occasions: string[];
  recommendedUses: string[];
  yearIntroduced?: number;
  aboutFragrance?: string;
  price3ml: number;
  price8ml?: number;
  price12ml?: number;
  originalPrice3ml?: number;
  originalPrice8ml?: number;
  originalPrice12ml?: number;
  isOnSale: boolean;
  discountPercentage?: number;
  blindBuyScore: number;
  averageRating?: number;
  reviewCount: number;
  isBestseller: boolean;
  isNew: boolean;
  imageUrl?: string;
  images: string[];
  isAuthentic: boolean;
  freeShippingEligible: boolean;
  rewardsEligible: boolean;
}

export interface SimilarFragranceItem {
  id: string;
  name: string;
  brandName: string;
  gender: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  blindBuyScore: number;
  similarityScore: number;
  matchReasons: string[];
}

export interface SimilarFragrancesResponse {
  data: SimilarFragranceItem[];
  sourceFragranceId: string;
  total: number;
}

export interface SearchResultItem {
  id: string;
  name: string;
  brand: string;
  gender: string;
  price3ml: number;
  price8ml?: number;
  price12ml?: number;
  imageUrl?: string;
  blindBuyScore?: number;
  relevanceScore: number;
  matchType: string;
}

export interface SearchResponse {
  data: SearchResultItem[];
  query: string;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface PriceRangeOption {
  minPrice?: number;
  maxPrice?: number;
  label: string;
  count: number;
}

export interface FilterOptionsData {
  genders: FilterOption[];
  concentrations: FilterOption[];
  priceRanges: PriceRangeOption[];
  seasons: FilterOption[];
  occasions: FilterOption[];
  scentAccords: FilterOption[];
  years: FilterOption[];
  brands: FilterOption[];
}

export interface FilterOptionsResponse {
  data: FilterOptionsData;
  totalProducts: number;
  brandSlug?: string;
}

// ==================== Community Types ====================

export type PostCategory =
  | 'layering_combo'
  | 'magical_layering_combo'
  | 'gatekeeping_perfumes'
  | 'middle_eastern_perfumes'
  | 'general';

export type SortBy = 'hot' | 'new' | 'top';

export type TopPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export type PostFlair =
  | 'discussion'
  | 'question'
  | 'sotd'
  | 'review'
  | 'layering_recipe'
  | 'battle'
  | 'wtb_wts';

export interface ReviewMeta {
  longevity?: string;
  projection?: string;
  season?: string;
  occasion?: string;
  value_rating?: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  user_name?: string;
  user_avatar_url?: string;
  title: string;
  content: string;
  category: PostCategory;
  post_flair?: string | null;
  review_meta?: ReviewMeta | null;
  perfume_ids?: string[];
  perfume_names?: string[];
  images?: string[];
  upvotes: number;
  downvotes: number;
  score: number;
  comment_count: number;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  is_weekly_thread?: boolean;
  author_forum_flair?: string | null;
  is_saved?: boolean | null;
  user_vote?: 'upvote' | 'downvote' | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user_name?: string;
  user_avatar_url?: string;
  parent_comment_id?: string;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  reply_count: number;
  is_deleted: boolean;
  is_edited: boolean;
  user_vote?: 'upvote' | 'downvote' | null;
  replies?: Comment[];
  created_at: string;
  updated_at: string;
}

