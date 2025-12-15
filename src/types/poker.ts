/**
 * Type definitions for Planning Poker.
 *
 * This file contains all the shared types used across the application.
 * Keeping types in one place makes them easier to find and update.
 */

/**
 * A participant can either vote or just watch.
 * - 'voter': Can select cards and their vote counts toward the result
 * - 'observer': Can see everything but cannot vote (good for PMs, stakeholders)
 */
export type ParticipantRole = 'voter' | 'observer';

/**
 * A person in a poker session.
 *
 * This is the "live" version sent over Pusher and used in the UI.
 * Contains everything needed to render the participant card.
 */
export interface Participant {
  id: string;              // Unique ID (UUID) - generated when joining
  name: string;            // Display name chosen by user
  role: ParticipantRole;   // Whether they can vote
  vote: string | null;     // Their current vote, null if not voted yet
  avatar: string;          // Animal avatar name (e.g., 'chicken', 'dog')
  lastHeartbeat?: string;  // ISO timestamp of last heartbeat (for online status)
}

/**
 * Subset of Participant data stored in localStorage.
 *
 * WHY A SEPARATE TYPE?
 * We don't want to store everything (like vote or lastHeartbeat) locally.
 * This type contains just what we need to rejoin after a page refresh.
 */
export interface StoredParticipant {
  name: string;
  role: ParticipantRole;
  participantId: string;  // Note: called 'participantId' not 'id' for clarity
  avatar: string;
}

/**
 * A completed story in the estimation history.
 *
 * When votes are revealed and the team agrees on an estimate,
 * the story gets saved to history for reference.
 */
export interface HistoryEntry {
  id: string;        // Unique ID for React key prop
  story: string;     // The story/ticket name that was estimated
  vote: string;      // The final agreed-upon estimate
  timestamp: number; // When it was saved (Unix ms)
}

/**
 * Server-side representation of a poker session.
 *
 * Uses Map for O(1) participant lookups by ID.
 * This is stored in the sessionManager on the server.
 */
export interface PokerSession {
  id: string;
  name: string;
  participants: Map<string, Participant>;  // Map for fast lookups
  revealed: boolean;                       // Are votes visible?
  createdAt: Date;
}

/**
 * Client-side session state received from the server.
 *
 * WHY DIFFERENT FROM PokerSession?
 * - Participants as array (easier for React rendering)
 * - Includes story/storyLocked for syncing the current story being estimated
 * - No createdAt (client doesn't need it)
 */
export interface SessionState {
  id: string;
  name: string;
  participants: Participant[];  // Array for easy .map() in React
  revealed: boolean;
  story?: string;               // Current story being estimated
  storyLocked?: boolean;        // Whether story is "set" vs being edited
}

/**
 * Available voting scales.
 * Users can switch between these during a session.
 */
export type VotingScale = 'fibonacci' | 'tshirt';

/**
 * Configuration for each voting scale.
 *
 * Each scale has:
 * - name: Display name shown in the UI
 * - values: The voting options available
 *
 * Note: '?' means "I don't know" and '☕' means "I need a break"
 */
export const VOTING_SCALES: Record<VotingScale, { name: string; values: string[] }> = {
  fibonacci: {
    name: 'Story Points',
    values: ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'],
  },
  tshirt: {
    name: 'T-Shirt Sizes',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
  },
};

/**
 * Order for cycling through scales with the up/down arrows.
 */
export const SCALE_ORDER: VotingScale[] = ['fibonacci', 'tshirt'];

/**
 * @deprecated Use VOTING_SCALES.fibonacci.values instead.
 * Kept for backward compatibility with older code.
 */
export const CARD_VALUES = VOTING_SCALES.fibonacci.values;
