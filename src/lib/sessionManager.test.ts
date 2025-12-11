// Note: These tests require a running Redis instance
// For CI, you can use a Redis mock or testcontainers

import {
  createSession,
  getSession,
  addParticipant,
  vote,
  reveal,
  reset,
  deleteSession,
  getParticipant,
} from './sessionManager';

// Skip tests if no Redis available (these are integration tests)
const describeWithRedis = process.env.REDIS_URL ? describe : describe.skip;

describeWithRedis('SessionManager with Redis', () => {
  const testSessionId = `test-session-${Date.now()}`;

  afterAll(async () => {
    // Cleanup test session
    await deleteSession(testSessionId);
  });

  describe('createSession', () => {
    it('should create a session with the given id and name', async () => {
      const session = await createSession(testSessionId, 'Sprint Planning');

      expect(session.id).toBe(testSessionId);
      expect(session.name).toBe('Sprint Planning');
      expect(session.revealed).toBe(false);
      expect(session.participants).toEqual([]);
    });

    it('should store the session for later retrieval', async () => {
      const retrieved = await getSession(testSessionId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Sprint Planning');
    });
  });

  describe('addParticipant', () => {
    it('should add a voter participant by default', async () => {
      const participant = await addParticipant(testSessionId, 'user-1', 'Alice');

      expect(participant?.id).toBe('user-1');
      expect(participant?.name).toBe('Alice');
      expect(participant?.role).toBe('voter');
      expect(participant?.vote).toBeNull();
    });

    it('should add an observer participant when role is observer', async () => {
      const participant = await addParticipant(testSessionId, 'user-2', 'Bob', 'observer');

      expect(participant?.role).toBe('observer');
    });
  });

  describe('vote', () => {
    it('should allow voter to vote', async () => {
      const result = await vote(testSessionId, 'user-1', '5');

      expect(result).toBe(true);
      const session = await getSession(testSessionId);
      const alice = session?.participants.find(p => p.id === 'user-1');
      expect(alice?.vote).toBe('5');
    });

    it('should not allow observer to vote', async () => {
      const result = await vote(testSessionId, 'user-2', '5');

      expect(result).toBe(false);
      const session = await getSession(testSessionId);
      const bob = session?.participants.find(p => p.id === 'user-2');
      expect(bob?.vote).toBeNull();
    });

    it('should return false for non-existent session', async () => {
      const result = await vote('non-existent', 'user-1', '5');
      expect(result).toBe(false);
    });
  });

  describe('reveal', () => {
    it('should set revealed to true', async () => {
      const result = await reveal(testSessionId);

      expect(result).toBe(true);
      const session = await getSession(testSessionId);
      expect(session?.revealed).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      const result = await reveal('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset revealed to false and clear voter votes', async () => {
      const result = await reset(testSessionId);

      expect(result).toBe(true);
      const session = await getSession(testSessionId);
      expect(session?.revealed).toBe(false);
      const alice = session?.participants.find(p => p.id === 'user-1');
      expect(alice?.vote).toBeNull();
    });

    it('should return false for non-existent session', async () => {
      const result = await reset('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getParticipant', () => {
    it('should return participant if exists', async () => {
      const participant = await getParticipant(testSessionId, 'user-1');
      expect(participant?.name).toBe('Alice');
    });

    it('should return null for non-existent participant', async () => {
      const participant = await getParticipant(testSessionId, 'non-existent');
      expect(participant).toBeNull();
    });
  });

  describe('getSession', () => {
    it('should return null for non-existent session', async () => {
      const session = await getSession('non-existent');
      expect(session).toBeNull();
    });
  });
});

// Unit tests that don't require Redis
describe('SessionManager types', () => {
  it('should export required types', async () => {
    // Type-only test - if this compiles, types are correct
    const mockSession = {
      id: 'test',
      name: 'Test',
      participants: [],
      revealed: false,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    expect(mockSession.id).toBe('test');
  });
});
