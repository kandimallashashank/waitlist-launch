/**
 * Session Storage Module
 * 
 * Provides localStorage-based session management for user authentication,
 * preferences, and quiz results.
 * 
 * Features:
 * - User session persistence with expiry checking
 * - Automatic session refresh
 * - Session restoration on app initialization
 * - Quiz results storage
 * - User preferences storage
 */

import { type User, type UserProfile } from '@/api/base44Client';

const SESSION_STORAGE_KEY = 'scentrev_session';
const QUIZ_RESULTS_KEY = 'scentrev_quiz_results';
const USER_PREFERENCES_KEY = 'scentrev_preferences';
const SESSION_EXPIRY_HOURS = 24 * 7; // 7 days
const SESSION_REFRESH_THRESHOLD_HOURS = 24; // Refresh if less than 24 hours remaining

interface SessionData {
  user: User;
  sessionId: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Detect whether a string looks like a JWT (`header.payload.signature`).
 *
 * We avoid persisting JWTs in localStorage; they must be resolved from Supabase
 * runtime session only.
 */
function isLikelyJwt(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Keep only non-JWT opaque session identifiers in browser storage.
 */
function sanitizeStoredSessionId(sessionId?: string): string {
  if (!sessionId) return '';
  const trimmed = sessionId.trim();
  if (!trimmed || isLikelyJwt(trimmed)) return '';
  return trimmed;
}

interface QuizResults {
  answers: Record<string, string | string[]>;
  completedAt: string;
  recommendations?: any[];
}

/**
 * Save user session
 * 
 * @param user - User object to save
 * @param sessionId - Session ID from backend
 * @param expiresAt - Optional expiration timestamp (ISO string)
 */
export function saveSession(user: User, sessionId?: string, expiresAt?: string): void {
  try {
    if (typeof window === 'undefined') return;
    
    const expiry = expiresAt ? new Date(expiresAt) : new Date();
    if (!expiresAt) {
      expiry.setHours(expiry.getHours() + SESSION_EXPIRY_HOURS);
    }
    
    const sessionData: SessionData = {
      user,
      sessionId: sanitizeStoredSessionId(sessionId),
      expiresAt: expiry.toISOString(),
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

/**
 * Get current user session
 * 
 * @returns SessionData object or null if session expired/not found
 */
export function getSession(): SessionData | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    
    const sessionData: SessionData = JSON.parse(stored);
    const sanitizedSessionId = sanitizeStoredSessionId(sessionData.sessionId);
    if (sanitizedSessionId !== sessionData.sessionId) {
      sessionData.sessionId = sanitizedSessionId;
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    }
    
    // Check if session expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      clearSession();
      return null;
    }
    
    return sessionData;
  } catch (error) {
    console.error('Error reading session:', error);
    return null;
  }
}

/**
 * Get current user from session
 * 
 * @returns User object or null if session expired/not found
 */
export function getUser(): User | null {
  const session = getSession();
  return session?.user || null;
}

/**
 * Get session ID
 * 
 * @returns Session ID or null
 */
export function getSessionId(): string | null {
  const session = getSession();
  const sanitized = sanitizeStoredSessionId(session?.sessionId);
  return sanitized || null;
}

/**
 * Clear user session
 */
export function clearSession(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Check if session is valid (not expired)
 * 
 * @returns True if session exists and is not expired
 */
export function isSessionValid(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return false;
    
    const sessionData: SessionData = JSON.parse(stored);
    
    // Check if session expired
    return new Date(sessionData.expiresAt) > new Date();
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
}

/**
 * Get time until session expires (in milliseconds)
 * 
 * @returns Milliseconds until expiry, or 0 if expired/invalid
 */
export function getTimeUntilExpiry(): number {
  const session = getSession();
  if (!session) return 0;
  
  const expiresAt = new Date(session.expiresAt);
  const now = new Date();
  const timeRemaining = expiresAt.getTime() - now.getTime();
  
  return Math.max(0, timeRemaining);
}

/**
 * Check if user is authenticated
 * 
 * @returns True if valid session exists
 */
export function isAuthenticated(): boolean {
  return isSessionValid();
}

/**
 * Check if session needs refresh
 * 
 * @returns True if session expires within SESSION_REFRESH_THRESHOLD_HOURS
 */
export function shouldRefreshSession(): boolean {
  const session = getSession();
  if (!session) return false;
  
  const expiresAt = new Date(session.expiresAt);
  const now = new Date();
  const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  return hoursUntilExpiry < SESSION_REFRESH_THRESHOLD_HOURS && hoursUntilExpiry > 0;
}

/**
 * Extend session expiry
 * 
 * @param expiresAt - New expiration timestamp (ISO string)
 */
export function extendSession(expiresAt?: string): void {
  const session = getSession();
  if (session) {
    saveSession(session.user, session.sessionId, expiresAt);
  }
}

/**
 * Save quiz results
 * 
 * @param userEmail - User's email address
 * @param answers - Quiz answers
 * @param recommendations - Optional recommendations
 */
export function saveQuizResults(
  userEmail: string,
  answers: Record<string, string | string[]>,
  recommendations?: any[]
): void {
  try {
    if (typeof window === 'undefined') return;
    
    const quizResults: QuizResults = {
      answers,
      completedAt: new Date().toISOString(),
      recommendations
    };
    
    const key = `${QUIZ_RESULTS_KEY}_${userEmail}`;
    localStorage.setItem(key, JSON.stringify(quizResults));
  } catch (error) {
    console.error('Error saving quiz results:', error);
  }
}

/**
 * Get quiz results for a user
 * 
 * @param userEmail - User's email address
 * @returns Quiz results or null
 */
export function getQuizResults(userEmail: string): QuizResults | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const key = `${QUIZ_RESULTS_KEY}_${userEmail}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading quiz results:', error);
    return null;
  }
}

/**
 * Clear quiz results for a user
 * 
 * @param userEmail - User's email address
 */
export function clearQuizResults(userEmail: string): void {
  try {
    if (typeof window === 'undefined') return;
    
    const key = `${QUIZ_RESULTS_KEY}_${userEmail}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing quiz results:', error);
  }
}

/**
 * Save user preferences
 * 
 * @param userEmail - User's email address
 * @param preferences - User preferences object
 */
export function saveUserPreferences(userEmail: string, preferences: Partial<UserProfile>): void {
  try {
    if (typeof window === 'undefined') return;
    
    const key = `${USER_PREFERENCES_KEY}_${userEmail}`;
    const data = {
      ...preferences,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

/**
 * Get user preferences
 * 
 * @param userEmail - User's email address
 * @returns User preferences or null
 */
export function getUserPreferences(userEmail: string): Partial<UserProfile> | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const key = `${USER_PREFERENCES_KEY}_${userEmail}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading user preferences:', error);
    return null;
  }
}

/**
 * Clear user-specific data (cart, wishlist, preferences, quiz results)
 * 
 * @param userEmail - User's email address
 */
export function clearUserData(userEmail: string): void {
  try {
    if (typeof window === 'undefined') return;
    
    // Clear user-specific data
    const keysToRemove = [
      `${QUIZ_RESULTS_KEY}_${userEmail}`,
      `${USER_PREFERENCES_KEY}_${userEmail}`,
      `scentrev_cart_${userEmail}`,
      `scentrev_wishlist_${userEmail}`
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
}

/**
 * Clear all session data (logout)
 * Clears session, cart, wishlist, quiz results, and preferences for current user
 */
export function clearAllSessionData(): void {
  try {
    if (typeof window === 'undefined') return;
    
    // Get current user before clearing session
    const session = getSession();
    const userEmail = session?.user?.email;
    
    // Clear session first
    clearSession();
    
    // Clear user-specific data if we have the email
    if (userEmail) {
      clearUserData(userEmail);
    } else {
      // Fallback: clear all user data if we can't identify the user
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (
          key.startsWith(QUIZ_RESULTS_KEY) || 
          key.startsWith(USER_PREFERENCES_KEY) ||
          key.startsWith('scentrev_cart_') ||
          key.startsWith('scentrev_wishlist_')
        ) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error('Error clearing session data:', error);
  }
}
