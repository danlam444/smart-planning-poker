/**
 * Storage utilities for persisting participant data in localStorage.
 *
 * WHY THIS EXISTS:
 * When a user joins a session, we save their info to localStorage so they can
 * automatically rejoin if they refresh the page or close/reopen the browser.
 * This creates a smoother UX - users don't have to re-enter their name every time.
 *
 * Each session has its own storage key, so a user can be in multiple sessions
 * with different names/roles if needed.
 */

import type { StoredParticipant } from '@/types/poker';

/**
 * Generates a unique localStorage key for each session.
 * Format: "poker-session-{sessionId}"
 */
export function getStorageKey(sessionId: string): string {
  return `poker-session-${sessionId}`;
}

/**
 * Retrieves the stored participant info for a session.
 *
 * @returns The stored participant data, or null if:
 *   - Running on server (no window/localStorage)
 *   - No data stored for this session
 *   - Stored data is corrupted/invalid JSON
 */
export function getStoredParticipant(sessionId: string): StoredParticipant | null {
  // Guard against server-side rendering - localStorage only exists in browser
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(getStorageKey(sessionId));
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    // If JSON is corrupted, return null rather than crashing
    return null;
  }
}

/**
 * Saves participant info to localStorage for automatic rejoin.
 * Called when a user successfully joins a session.
 */
export function storeParticipant(sessionId: string, participant: StoredParticipant): void {
  localStorage.setItem(getStorageKey(sessionId), JSON.stringify(participant));
}

/**
 * Removes stored participant info.
 * Called when a user explicitly leaves a session (not just closes browser).
 */
export function removeStoredParticipant(sessionId: string): void {
  localStorage.removeItem(getStorageKey(sessionId));
}
