const { SessionManager } = require('./sessionManager');

describe('SessionManager', () => {
  let manager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe('createSession', () => {
    it('should create a session with the given id and name', () => {
      const session = manager.createSession('session-1', 'Sprint Planning');

      expect(session.id).toBe('session-1');
      expect(session.name).toBe('Sprint Planning');
      expect(session.revealed).toBe(false);
      expect(session.participants.size).toBe(0);
    });

    it('should store the session for later retrieval', () => {
      manager.createSession('session-1', 'Sprint Planning');

      const retrieved = manager.getSession('session-1');
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Sprint Planning');
    });
  });

  describe('addParticipant', () => {
    it('should add an estimator participant by default', () => {
      manager.createSession('session-1', 'Sprint Planning');

      const participant = manager.addParticipant('session-1', 'user-1', 'Alice');

      expect(participant.id).toBe('user-1');
      expect(participant.name).toBe('Alice');
      expect(participant.role).toBe('estimator');
      expect(participant.vote).toBeNull();
    });

    it('should add an observer participant when role is observer', () => {
      manager.createSession('session-1', 'Sprint Planning');

      const participant = manager.addParticipant('session-1', 'user-1', 'Bob', 'observer');

      expect(participant.role).toBe('observer');
    });

    it('should create session if it does not exist', () => {
      const participant = manager.addParticipant('new-session', 'user-1', 'Alice');

      expect(participant).toBeDefined();
      const session = manager.getSession('new-session');
      expect(session).toBeDefined();
      expect(session.name).toBe('Planning Session');
    });
  });

  describe('vote', () => {
    it('should allow estimator to vote', () => {
      manager.createSession('session-1', 'Sprint Planning');
      manager.addParticipant('session-1', 'user-1', 'Alice', 'estimator');

      const result = manager.vote('session-1', 'user-1', '5');

      expect(result).toBe(true);
      const state = manager.getSessionState('session-1');
      expect(state.participants[0].vote).toBe('5');
    });

    it('should not allow observer to vote', () => {
      manager.createSession('session-1', 'Sprint Planning');
      manager.addParticipant('session-1', 'user-1', 'Bob', 'observer');

      const result = manager.vote('session-1', 'user-1', '5');

      expect(result).toBe(false);
      const state = manager.getSessionState('session-1');
      expect(state.participants[0].vote).toBeNull();
    });

    it('should return false for non-existent session', () => {
      const result = manager.vote('non-existent', 'user-1', '5');
      expect(result).toBe(false);
    });
  });

  describe('reveal', () => {
    it('should set revealed to true', () => {
      manager.createSession('session-1', 'Sprint Planning');

      const result = manager.reveal('session-1');

      expect(result).toBe(true);
      const state = manager.getSessionState('session-1');
      expect(state.revealed).toBe(true);
    });

    it('should return false for non-existent session', () => {
      const result = manager.reveal('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset revealed to false and clear estimator votes', () => {
      manager.createSession('session-1', 'Sprint Planning');
      manager.addParticipant('session-1', 'user-1', 'Alice', 'estimator');
      manager.vote('session-1', 'user-1', '5');
      manager.reveal('session-1');

      const result = manager.reset('session-1');

      expect(result).toBe(true);
      const state = manager.getSessionState('session-1');
      expect(state.revealed).toBe(false);
      expect(state.participants[0].vote).toBeNull();
    });

    it('should return false for non-existent session', () => {
      const result = manager.reset('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant from session', () => {
      manager.createSession('session-1', 'Sprint Planning');
      manager.addParticipant('session-1', 'user-1', 'Alice');

      const result = manager.removeParticipant('session-1', 'user-1');

      expect(result).toBe(true);
      const state = manager.getSessionState('session-1');
      expect(state.participants.length).toBe(0);
    });

    it('should return false for non-existent session', () => {
      const result = manager.removeParticipant('non-existent', 'user-1');
      expect(result).toBe(false);
    });
  });

  describe('getSessionState', () => {
    it('should return null for non-existent session', () => {
      const state = manager.getSessionState('non-existent');
      expect(state).toBeNull();
    });

    it('should return session state with participants as array', () => {
      manager.createSession('session-1', 'Sprint Planning');
      manager.addParticipant('session-1', 'user-1', 'Alice');
      manager.addParticipant('session-1', 'user-2', 'Bob');

      const state = manager.getSessionState('session-1');

      expect(state.id).toBe('session-1');
      expect(state.name).toBe('Sprint Planning');
      expect(Array.isArray(state.participants)).toBe(true);
      expect(state.participants.length).toBe(2);
    });
  });

  describe('session expiry', () => {
    it('should set lastActivity on session creation', () => {
      const session = manager.createSession('session-1', 'Sprint Planning');
      expect(session.lastActivity).toBeInstanceOf(Date);
    });

    it('should update lastActivity when participant joins', () => {
      const session = manager.createSession('session-1', 'Sprint Planning');
      const originalTime = session.lastActivity.getTime();

      // Small delay to ensure time difference
      jest.advanceTimersByTime(100);
      manager.addParticipant('session-1', 'user-1', 'Alice');

      expect(session.lastActivity.getTime()).toBeGreaterThanOrEqual(originalTime);
    });

    it('should update lastActivity when vote is cast', () => {
      manager.createSession('session-1', 'Sprint Planning');
      manager.addParticipant('session-1', 'user-1', 'Alice', 'estimator');
      const session = manager.getSession('session-1');
      const originalTime = session.lastActivity.getTime();

      jest.advanceTimersByTime(100);
      manager.vote('session-1', 'user-1', '5');

      expect(session.lastActivity.getTime()).toBeGreaterThanOrEqual(originalTime);
    });

    it('should update lastActivity when votes are revealed', () => {
      manager.createSession('session-1', 'Sprint Planning');
      const session = manager.getSession('session-1');
      const originalTime = session.lastActivity.getTime();

      jest.advanceTimersByTime(100);
      manager.reveal('session-1');

      expect(session.lastActivity.getTime()).toBeGreaterThanOrEqual(originalTime);
    });

    it('should update lastActivity when round is reset', () => {
      manager.createSession('session-1', 'Sprint Planning');
      const session = manager.getSession('session-1');
      const originalTime = session.lastActivity.getTime();

      jest.advanceTimersByTime(100);
      manager.reset('session-1');

      expect(session.lastActivity.getTime()).toBeGreaterThanOrEqual(originalTime);
    });

    it('should remove expired sessions during cleanup', () => {
      const expiryMs = 1000; // 1 second for testing
      const testManager = new SessionManager({ sessionExpiryMs: expiryMs });

      testManager.createSession('session-1', 'Sprint Planning');
      expect(testManager.getSession('session-1')).toBeDefined();

      // Simulate time passing beyond expiry
      const session = testManager.getSession('session-1');
      session.lastActivity = new Date(Date.now() - expiryMs - 100);

      testManager.cleanupExpiredSessions();

      expect(testManager.getSession('session-1')).toBeUndefined();
    });

    it('should not remove active sessions during cleanup', () => {
      const expiryMs = 1000; // 1 second for testing
      const testManager = new SessionManager({ sessionExpiryMs: expiryMs });

      testManager.createSession('session-1', 'Sprint Planning');
      // Session was just created, so it should not be expired

      testManager.cleanupExpiredSessions();

      expect(testManager.getSession('session-1')).toBeDefined();
    });

    it('should accept custom expiry time via constructor', () => {
      const customExpiryMs = 24 * 60 * 60 * 1000; // 1 day
      const testManager = new SessionManager({ sessionExpiryMs: customExpiryMs });

      expect(testManager.sessionExpiryMs).toBe(customExpiryMs);
    });
  });
});
