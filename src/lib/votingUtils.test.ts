import {
  getResultType,
  getConsensusVote,
  isParticipantOnline,
  getLastOccurrenceIds,
  OFFLINE_THRESHOLD,
} from './votingUtils';

describe('getResultType', () => {
  it('returns "none" when no participants', () => {
    expect(getResultType([])).toBe('none');
  });

  it('returns "none" when no votes cast', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: null },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: null },
    ];
    expect(getResultType(participants)).toBe('none');
  });

  it('returns "majority" for single vote', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
    ];
    expect(getResultType(participants)).toBe('majority');
  });

  it('returns "consensus" when all voters vote the same', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: '5' },
      { id: '3', name: 'Charlie', role: 'voter' as const, vote: '5' },
    ];
    expect(getResultType(participants)).toBe('consensus');
  });

  it('returns "majority" when one value has most votes', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: '5' },
      { id: '3', name: 'Charlie', role: 'voter' as const, vote: '8' },
    ];
    expect(getResultType(participants)).toBe('majority');
  });

  it('returns "joint" when multiple values tied for most votes', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: '8' },
    ];
    expect(getResultType(participants)).toBe('joint');
  });

  it('returns "joint" with more complex tie', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: '5' },
      { id: '3', name: 'Charlie', role: 'voter' as const, vote: '8' },
      { id: '4', name: 'Dave', role: 'voter' as const, vote: '8' },
    ];
    expect(getResultType(participants)).toBe('joint');
  });

  it('excludes observers from vote count', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: '5' },
      { id: '3', name: 'Observer', role: 'observer' as const, vote: null },
    ];
    expect(getResultType(participants)).toBe('consensus');
  });

  it('excludes null votes from count', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: '5' },
      { id: '3', name: 'Charlie', role: 'voter' as const, vote: null },
    ];
    expect(getResultType(participants)).toBe('consensus');
  });
});

describe('getConsensusVote', () => {
  it('returns null when no participants', () => {
    expect(getConsensusVote([])).toBeNull();
  });

  it('returns null when fewer than 2 votes', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
    ];
    expect(getConsensusVote(participants)).toBeNull();
  });

  it('returns null when votes differ', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: '8' },
    ];
    expect(getConsensusVote(participants)).toBeNull();
  });

  it('returns the vote value when all votes are the same', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: '5' },
    ];
    expect(getConsensusVote(participants)).toBe('5');
  });

  it('works with non-numeric votes', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: 'L' },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: 'L' },
      { id: '3', name: 'Charlie', role: 'voter' as const, vote: 'L' },
    ];
    expect(getConsensusVote(participants)).toBe('L');
  });

  it('excludes observers from consensus check', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: '5' },
      { id: '3', name: 'Observer', role: 'observer' as const, vote: null },
    ];
    expect(getConsensusVote(participants)).toBe('5');
  });

  it('excludes null votes from consensus check', () => {
    const participants = [
      { id: '1', name: 'Alice', role: 'voter' as const, vote: '5' },
      { id: '2', name: 'Bob', role: 'voter' as const, vote: '5' },
      { id: '3', name: 'Charlie', role: 'voter' as const, vote: null },
    ];
    expect(getConsensusVote(participants)).toBe('5');
  });
});

describe('isParticipantOnline', () => {
  it('returns false when no lastHeartbeat', () => {
    expect(isParticipantOnline({})).toBe(false);
    expect(isParticipantOnline({ lastHeartbeat: undefined })).toBe(false);
  });

  it('returns true when heartbeat is recent', () => {
    const now = Date.now();
    const recentHeartbeat = new Date(now - 1000).toISOString(); // 1 second ago
    expect(isParticipantOnline({ lastHeartbeat: recentHeartbeat }, now)).toBe(true);
  });

  it('returns false when heartbeat is old', () => {
    const now = Date.now();
    const oldHeartbeat = new Date(now - OFFLINE_THRESHOLD - 1000).toISOString(); // Beyond threshold
    expect(isParticipantOnline({ lastHeartbeat: oldHeartbeat }, now)).toBe(false);
  });

  it('returns true when heartbeat is exactly at threshold boundary', () => {
    const now = Date.now();
    const boundaryHeartbeat = new Date(now - OFFLINE_THRESHOLD + 1).toISOString();
    expect(isParticipantOnline({ lastHeartbeat: boundaryHeartbeat }, now)).toBe(true);
  });

  it('returns false when heartbeat is exactly at threshold', () => {
    const now = Date.now();
    const boundaryHeartbeat = new Date(now - OFFLINE_THRESHOLD).toISOString();
    expect(isParticipantOnline({ lastHeartbeat: boundaryHeartbeat }, now)).toBe(false);
  });
});

describe('getLastOccurrenceIds', () => {
  it('returns empty set for empty history', () => {
    const result = getLastOccurrenceIds([]);
    expect(result.size).toBe(0);
  });

  it('returns single id for single entry', () => {
    const history = [{ id: '1', vote: '5' }];
    const result = getLastOccurrenceIds(history);
    expect(result.has('1')).toBe(true);
    expect(result.size).toBe(1);
  });

  it('returns all ids when all votes are unique', () => {
    const history = [
      { id: '1', vote: '5' },
      { id: '2', vote: '8' },
      { id: '3', vote: '3' },
    ];
    const result = getLastOccurrenceIds(history);
    expect(result.has('1')).toBe(true);
    expect(result.has('2')).toBe(true);
    expect(result.has('3')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('returns only last occurrence id for duplicate votes', () => {
    const history = [
      { id: '1', vote: '5' },
      { id: '2', vote: '8' },
      { id: '3', vote: '5' }, // Last occurrence of '5'
    ];
    const result = getLastOccurrenceIds(history);
    expect(result.has('1')).toBe(false); // Not the last '5'
    expect(result.has('2')).toBe(true);  // Only '8'
    expect(result.has('3')).toBe(true);  // Last '5'
    expect(result.size).toBe(2);
  });

  it('handles multiple duplicates correctly', () => {
    const history = [
      { id: '1', vote: '5' },
      { id: '2', vote: '5' },
      { id: '3', vote: '8' },
      { id: '4', vote: '5' }, // Last '5'
      { id: '5', vote: '8' }, // Last '8'
    ];
    const result = getLastOccurrenceIds(history);
    expect(result.has('1')).toBe(false);
    expect(result.has('2')).toBe(false);
    expect(result.has('3')).toBe(false);
    expect(result.has('4')).toBe(true);
    expect(result.has('5')).toBe(true);
    expect(result.size).toBe(2);
  });
});
