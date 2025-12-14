import type { Participant } from '@/types/poker';

// Threshold for considering a participant offline (30 seconds)
export const OFFLINE_THRESHOLD = 30000;

export type ResultType = 'consensus' | 'majority' | 'joint' | 'none';

/**
 * Determines the result type based on participant votes.
 * - 'none': No votes cast
 * - 'consensus': All voters voted the same (requires 2+ votes)
 * - 'majority': Single value has the most votes
 * - 'joint': Multiple values tied for most votes
 */
export function getResultType(participants: Participant[]): ResultType {
  const allVotes = participants
    .filter((p) => p.role === 'voter')
    .map((p) => p.vote)
    .filter((v): v is string => v !== null);

  if (allVotes.length === 0) return 'none';

  const voteCounts = allVotes.reduce((acc, vote) => {
    acc[vote] = (acc[vote] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxCount = Math.max(...Object.values(voteCounts));
  const majorityVotes = Object.entries(voteCounts)
    .filter(([, count]) => count === maxCount)
    .map(([vote]) => vote);

  // Consensus: all votes are the same (requires 2+ votes)
  if (allVotes.length > 1 && majorityVotes.length === 1 && maxCount === allVotes.length) {
    return 'consensus';
  }

  // Joint majority: multiple values tied for the most votes
  if (majorityVotes.length > 1) {
    return 'joint';
  }

  // Single majority
  return 'majority';
}

/**
 * Gets the consensus vote value if all voters voted the same.
 * Returns null if there's no consensus or fewer than 2 votes.
 */
export function getConsensusVote(participants: Participant[]): string | null {
  const allVotes = participants
    .filter((p) => p.role === 'voter')
    .map((p) => p.vote)
    .filter((v): v is string => v !== null);

  if (allVotes.length < 2) return null;

  const firstVote = allVotes[0];
  if (allVotes.every(v => v === firstVote)) {
    return firstVote;
  }
  return null;
}

interface ParticipantWithHeartbeat {
  lastHeartbeat?: string;
}

/**
 * Checks if a participant is online based on their last heartbeat.
 * Returns false if no heartbeat or heartbeat is older than OFFLINE_THRESHOLD.
 */
export function isParticipantOnline(participant: ParticipantWithHeartbeat, now: number = Date.now()): boolean {
  if (!participant.lastHeartbeat) return false;
  const lastHeartbeat = new Date(participant.lastHeartbeat).getTime();
  return now - lastHeartbeat < OFFLINE_THRESHOLD;
}

interface HistoryEntry {
  id: string;
  vote: string;
}

/**
 * Finds the IDs of history entries that are the last occurrence of their vote value.
 * Used to highlight the most recent entry for each unique estimate.
 */
export function getLastOccurrenceIds(history: HistoryEntry[]): Set<string> {
  const seenVotes = new Set<string>();
  const lastOfVoteIds = new Set<string>();

  for (let i = history.length - 1; i >= 0; i--) {
    const vote = history[i].vote;
    if (!seenVotes.has(vote)) {
      seenVotes.add(vote);
      lastOfVoteIds.add(history[i].id);
    }
  }

  return lastOfVoteIds;
}
