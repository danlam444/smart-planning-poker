/**
 * Unit tests for sessionManager.
 * Uses mocks for Redis/KV to test business logic without external dependencies.
 */

// Mock the redis client before importing sessionManager
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

import {
  createSession,
  getSession,
  updateSession,
  addParticipant,
  getParticipant,
  vote,
  reveal,
  reset,
  updateStory,
  updateAvatar,
  updateHeartbeat,
  removeParticipant,
  deleteSession,
  Session,
  Participant,
} from './sessionManager';

describe('sessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: simulate development environment (uses local Redis)
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
  });

  describe('createSession', () => {
    it('creates a session with correct initial values', async () => {
      const session = await createSession('test-123', 'Sprint Planning');

      expect(session.id).toBe('test-123');
      expect(session.name).toBe('Sprint Planning');
      expect(session.participants).toEqual([]);
      expect(session.revealed).toBe(false);
      expect(session.story).toBe('');
      expect(session.storyLocked).toBe(false);
      expect(session.createdAt).toBeDefined();
      expect(session.lastActivity).toBeDefined();
    });

    it('stores session in Redis with expiry', async () => {
      await createSession('test-123', 'Sprint Planning');

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'session:test-123',
        expect.any(String),
        { EX: 7 * 24 * 60 * 60 }
      );
    });
  });

  describe('getSession', () => {
    it('returns null when session does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const session = await getSession('non-existent');

      expect(session).toBeNull();
    });

    it('returns parsed session when it exists', async () => {
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const session = await getSession('test-123');

      expect(session).toEqual(mockSession);
    });
  });

  describe('updateSession', () => {
    it('updates lastActivity timestamp', async () => {
      const session: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };

      await updateSession(session);

      expect(mockRedisClient.set).toHaveBeenCalled();
      const savedData = JSON.parse(mockRedisClient.set.mock.calls[0][1]);
      expect(new Date(savedData.lastActivity).getTime()).toBeGreaterThan(
        new Date('2024-01-01T00:00:00Z').getTime()
      );
    });
  });

  describe('addParticipant', () => {
    it('creates session if it does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const participant = await addParticipant('new-session', 'user-1', 'Alice');

      expect(participant?.name).toBe('Alice');
      // Should have called set twice: once for createSession, once for updateSession
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it('adds new participant with default role and avatar', async () => {
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const participant = await addParticipant('test-123', 'user-1', 'Alice');

      expect(participant?.id).toBe('user-1');
      expect(participant?.name).toBe('Alice');
      expect(participant?.role).toBe('voter');
      expect(participant?.vote).toBeNull();
      expect(participant?.avatar).toBe('chicken');
      expect(participant?.lastHeartbeat).toBeDefined();
    });

    it('adds observer participant when role is specified', async () => {
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const participant = await addParticipant('test-123', 'user-2', 'Bob', 'observer');

      expect(participant?.role).toBe('observer');
    });

    it('adds participant with custom avatar', async () => {
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const participant = await addParticipant('test-123', 'user-1', 'Alice', 'voter', 'panda');

      expect(participant?.avatar).toBe('panda');
    });

    it('preserves existing vote and avatar when rejoining', async () => {
      const existingParticipant: Participant = {
        id: 'user-1',
        name: 'Alice',
        role: 'voter',
        vote: '5',
        avatar: 'dog',
        lastHeartbeat: '2024-01-01T00:00:00Z',
      };
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [existingParticipant],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const participant = await addParticipant('test-123', 'user-1', 'Alice Updated', 'voter', 'cat');

      expect(participant?.name).toBe('Alice Updated');
      expect(participant?.vote).toBe('5'); // Preserved
      expect(participant?.avatar).toBe('dog'); // Preserved (existing takes priority)
    });

    it('uses provided avatar if existing avatar is empty', async () => {
      const existingParticipant: Participant = {
        id: 'user-1',
        name: 'Alice',
        role: 'voter',
        vote: null,
        avatar: '',
        lastHeartbeat: '2024-01-01T00:00:00Z',
      };
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [existingParticipant],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const participant = await addParticipant('test-123', 'user-1', 'Alice', 'voter', 'panda');

      expect(participant?.avatar).toBe('panda');
    });
  });

  describe('getParticipant', () => {
    it('returns null when session does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const participant = await getParticipant('non-existent', 'user-1');

      expect(participant).toBeNull();
    });

    it('returns null when participant does not exist', async () => {
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const participant = await getParticipant('test-123', 'non-existent');

      expect(participant).toBeNull();
    });

    it('returns participant when it exists', async () => {
      const existingParticipant: Participant = {
        id: 'user-1',
        name: 'Alice',
        role: 'voter',
        vote: '5',
        avatar: 'chicken',
      };
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [existingParticipant],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const participant = await getParticipant('test-123', 'user-1');

      expect(participant).toEqual(existingParticipant);
    });
  });

  describe('vote', () => {
    it('returns false when session does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await vote('non-existent', 'user-1', '5');

      expect(result).toBe(false);
    });

    it('returns false when participant does not exist', async () => {
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await vote('test-123', 'non-existent', '5');

      expect(result).toBe(false);
    });

    it('returns false when participant is an observer', async () => {
      const observer: Participant = {
        id: 'user-1',
        name: 'Observer',
        role: 'observer',
        vote: null,
        avatar: 'chicken',
      };
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [observer],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await vote('test-123', 'user-1', '5');

      expect(result).toBe(false);
    });

    it('allows voter to vote and returns true', async () => {
      const voter: Participant = {
        id: 'user-1',
        name: 'Voter',
        role: 'voter',
        vote: null,
        avatar: 'chicken',
      };
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [voter],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await vote('test-123', 'user-1', '8');

      expect(result).toBe(true);
      const savedData = JSON.parse(mockRedisClient.set.mock.calls[0][1]);
      expect(savedData.participants[0].vote).toBe('8');
    });

    it('allows voter to clear vote with null', async () => {
      const voter: Participant = {
        id: 'user-1',
        name: 'Voter',
        role: 'voter',
        vote: '5',
        avatar: 'chicken',
      };
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [voter],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await vote('test-123', 'user-1', null);

      expect(result).toBe(true);
      const savedData = JSON.parse(mockRedisClient.set.mock.calls[0][1]);
      expect(savedData.participants[0].vote).toBeNull();
    });
  });

  describe('reveal', () => {
    it('returns false when session does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await reveal('non-existent');

      expect(result).toBe(false);
    });

    it('sets revealed to true and returns true', async () => {
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await reveal('test-123');

      expect(result).toBe(true);
      const savedData = JSON.parse(mockRedisClient.set.mock.calls[0][1]);
      expect(savedData.revealed).toBe(true);
    });
  });

  describe('reset', () => {
    it('returns false when session does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await reset('non-existent');

      expect(result).toBe(false);
    });

    it('resets revealed, story, storyLocked, and voter votes', async () => {
      const voter: Participant = {
        id: 'user-1',
        name: 'Voter',
        role: 'voter',
        vote: '5',
        avatar: 'chicken',
      };
      const observer: Participant = {
        id: 'user-2',
        name: 'Observer',
        role: 'observer',
        vote: null,
        avatar: 'dog',
      };
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [voter, observer],
        revealed: true,
        story: 'Some story',
        storyLocked: true,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await reset('test-123');

      expect(result).toBe(true);
      const savedData = JSON.parse(mockRedisClient.set.mock.calls[0][1]);
      expect(savedData.revealed).toBe(false);
      expect(savedData.story).toBe('');
      expect(savedData.storyLocked).toBe(false);
      expect(savedData.participants[0].vote).toBeNull(); // Voter vote cleared
      expect(savedData.participants[1].vote).toBeNull(); // Observer unchanged (was null)
    });
  });

  describe('updateStory', () => {
    it('returns false when session does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await updateStory('non-existent', 'Story', true);

      expect(result).toBe(false);
    });

    it('updates story and storyLocked', async () => {
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await updateStory('test-123', 'User Login Feature', true);

      expect(result).toBe(true);
      const savedData = JSON.parse(mockRedisClient.set.mock.calls[0][1]);
      expect(savedData.story).toBe('User Login Feature');
      expect(savedData.storyLocked).toBe(true);
    });
  });

  describe('updateAvatar', () => {
    it('returns false when session does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await updateAvatar('non-existent', 'user-1', 'panda');

      expect(result).toBe(false);
    });

    it('returns false when participant does not exist', async () => {
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await updateAvatar('test-123', 'non-existent', 'panda');

      expect(result).toBe(false);
    });

    it('updates participant avatar', async () => {
      const participant: Participant = {
        id: 'user-1',
        name: 'Alice',
        role: 'voter',
        vote: null,
        avatar: 'chicken',
      };
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [participant],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await updateAvatar('test-123', 'user-1', 'panda');

      expect(result).toBe(true);
      const savedData = JSON.parse(mockRedisClient.set.mock.calls[0][1]);
      expect(savedData.participants[0].avatar).toBe('panda');
    });
  });

  describe('updateHeartbeat', () => {
    it('returns false when session does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await updateHeartbeat('non-existent', 'user-1');

      expect(result).toBe(false);
    });

    it('returns false when participant does not exist', async () => {
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await updateHeartbeat('test-123', 'non-existent');

      expect(result).toBe(false);
    });

    it('updates participant lastHeartbeat', async () => {
      const participant: Participant = {
        id: 'user-1',
        name: 'Alice',
        role: 'voter',
        vote: null,
        avatar: 'chicken',
        lastHeartbeat: '2024-01-01T00:00:00Z',
      };
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [participant],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await updateHeartbeat('test-123', 'user-1');

      expect(result).toBe(true);
      const savedData = JSON.parse(mockRedisClient.set.mock.calls[0][1]);
      expect(new Date(savedData.participants[0].lastHeartbeat).getTime()).toBeGreaterThan(
        new Date('2024-01-01T00:00:00Z').getTime()
      );
    });
  });

  describe('removeParticipant', () => {
    it('returns false when session does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await removeParticipant('non-existent', 'user-1');

      expect(result).toBe(false);
    });

    it('returns false when participant does not exist', async () => {
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await removeParticipant('test-123', 'non-existent');

      expect(result).toBe(false);
    });

    it('removes participant from session', async () => {
      const participant1: Participant = {
        id: 'user-1',
        name: 'Alice',
        role: 'voter',
        vote: null,
        avatar: 'chicken',
      };
      const participant2: Participant = {
        id: 'user-2',
        name: 'Bob',
        role: 'voter',
        vote: null,
        avatar: 'dog',
      };
      const mockSession: Session = {
        id: 'test-123',
        name: 'Test',
        participants: [participant1, participant2],
        revealed: false,
        story: '',
        storyLocked: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T00:00:00Z',
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await removeParticipant('test-123', 'user-1');

      expect(result).toBe(true);
      const savedData = JSON.parse(mockRedisClient.set.mock.calls[0][1]);
      expect(savedData.participants).toHaveLength(1);
      expect(savedData.participants[0].id).toBe('user-2');
    });
  });

  describe('deleteSession', () => {
    it('deletes session from Redis', async () => {
      const result = await deleteSession('test-123');

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith('session:test-123');
    });
  });
});
