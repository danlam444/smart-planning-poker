/**
 * Voting utility functions for Planning Poker.
 *
 * These are PURE FUNCTIONS - they don't modify state or have side effects.
 * This makes them easy to test and reason about.
 *
 * WHY EXTRACT THESE?
 * 1. Unit testable without needing React/browser environment
 * 2. Reusable across components
 * 3. Keeps the main page component focused on UI logic
 */

import type { Participant, HistoryEntry } from '@/types/poker';

/**
 * How long (in ms) before we consider a participant offline.
 * Participants send heartbeats every 10 seconds, so 30s gives us
 * buffer for network delays while still detecting disconnects quickly.
 */
export const OFFLINE_THRESHOLD = 30000;

/**
 * The possible outcomes when votes are revealed:
 * - 'none': Nobody voted yet
 * - 'consensus': Everyone agreed on the same value (the ideal outcome!)
 * - 'majority': One value got the most votes
 * - 'joint': Multiple values tied for most votes (need discussion)
 */
export type ResultType = 'consensus' | 'majority' | 'joint' | 'none';

/**
 * Analyzes votes to determine the result type.
 *
 * IMPORTANT: Only counts votes from participants with role='voter'.
 * Observers are excluded from vote counting.
 *
 * @example
 * // All voted '5' -> 'consensus'
 * getResultType([{vote: '5'}, {vote: '5'}])
 *
 * // Mixed votes, '5' has most -> 'majority'
 * getResultType([{vote: '5'}, {vote: '5'}, {vote: '8'}])
 *
 * // Tied votes -> 'joint'
 * getResultType([{vote: '5'}, {vote: '8'}])
 */
export function getResultType(participants: Participant[]): ResultType {
  // Step 1: Extract only voter votes (exclude observers and null votes)
  const allVotes = participants
    .filter((p) => p.role === 'voter')
    .map((p) => p.vote)
    .filter((v): v is string => v !== null); // Type guard: removes nulls AND narrows type

  if (allVotes.length === 0) return 'none';

  // Step 2: Count how many times each vote value appears
  // e.g., ['5', '5', '8'] -> { '5': 2, '8': 1 }
  const voteCounts = allVotes.reduce((acc, vote) => {
    acc[vote] = (acc[vote] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Step 3: Find the highest vote count
  const maxCount = Math.max(...Object.values(voteCounts));

  // Step 4: Find all votes that have the highest count (could be multiple if tied)
  const majorityVotes = Object.entries(voteCounts)
    .filter(([, count]) => count === maxCount)
    .map(([vote]) => vote);

  // Consensus requires: 2+ votes AND only one unique value AND everyone voted that value
  if (allVotes.length > 1 && majorityVotes.length === 1 && maxCount === allVotes.length) {
    return 'consensus';
  }

  // Joint majority: multiple values tied for the most votes
  if (majorityVotes.length > 1) {
    return 'joint';
  }

  // Single majority: one value has the most votes (but not everyone)
  return 'majority';
}

/**
 * Gets the consensus vote value if all voters voted the same.
 *
 * Used for auto-saving to history: when everyone agrees, we can
 * automatically save the story with the consensus value.
 *
 * @returns The vote value if consensus, null otherwise
 */
export function getConsensusVote(participants: Participant[]): string | null {
  const allVotes = participants
    .filter((p) => p.role === 'voter')
    .map((p) => p.vote)
    .filter((v): v is string => v !== null);

  // Need at least 2 votes for meaningful consensus
  // (1 person voting isn't really "consensus")
  if (allVotes.length < 2) return null;

  // Check if every vote matches the first vote
  const firstVote = allVotes[0];
  if (allVotes.every(v => v === firstVote)) {
    return firstVote;
  }
  return null;
}

/**
 * Minimal interface for heartbeat checking.
 * Using a separate interface (not full Participant) makes the function
 * more flexible and easier to test.
 */
interface ParticipantWithHeartbeat {
  lastHeartbeat?: string;
}

/**
 * Determines if a participant is currently online.
 *
 * HOW IT WORKS:
 * - Each participant sends a "heartbeat" to the server every 10 seconds
 * - The server stores the timestamp of the last heartbeat
 * - If we haven't heard from them in 30+ seconds, they're offline
 *
 * WHY THIS MATTERS:
 * - Shows other participants who has disconnected
 * - Offline participants appear grayed out in the UI
 * - Helps team know if they should wait for someone to reconnect
 *
 * @param participant - Object with lastHeartbeat timestamp
 * @param now - Current time (injectable for testing)
 */
export function isParticipantOnline(participant: ParticipantWithHeartbeat, now: number = Date.now()): boolean {
  // No heartbeat ever recorded = offline (new participant or never connected)
  if (!participant.lastHeartbeat) return false;

  // Parse the ISO timestamp string to milliseconds
  const lastHeartbeat = new Date(participant.lastHeartbeat).getTime();

  // Online if heartbeat is recent (within threshold)
  return now - lastHeartbeat < OFFLINE_THRESHOLD;
}

/**
 * Finds which history entries should be highlighted.
 *
 * USE CASE:
 * In the history sidebar, we highlight the LAST occurrence of each estimate value.
 * This helps quickly identify: "When did we last estimate something as a 5?"
 *
 * ALGORITHM:
 * Walk backwards through history. First time we see each vote value,
 * that's the "last occurrence" - add its ID to the result set.
 *
 * @example
 * history = [{id: 'a', vote: '5'}, {id: 'b', vote: '8'}, {id: 'c', vote: '5'}]
 * result = Set{'b', 'c'}  // 'c' is last '5', 'b' is last '8', 'a' is NOT last '5'
 *
 * @param history - Array of history entries (must have id and vote)
 * @returns Set of IDs that should be highlighted
 */
export function getLastOccurrenceIds(history: Pick<HistoryEntry, 'id' | 'vote'>[]): Set<string> {
  const seenVotes = new Set<string>();      // Track which vote values we've seen
  const lastOfVoteIds = new Set<string>();  // IDs to highlight

  // Walk backwards: newest to oldest
  for (let i = history.length - 1; i >= 0; i--) {
    const vote = history[i].vote;
    // First time seeing this vote value (from the end) = it's the last occurrence
    if (!seenVotes.has(vote)) {
      seenVotes.add(vote);
      lastOfVoteIds.add(history[i].id);
    }
  }

  return lastOfVoteIds;
}
