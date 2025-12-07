// Session manager - extracted from server.js for testability

const DEFAULT_SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

class SessionManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.sessionExpiryMs = options.sessionExpiryMs ?? DEFAULT_SESSION_EXPIRY_MS;
    this.cleanupIntervalMs = options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS;
    this.cleanupTimer = null;
  }

  startCleanup() {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), this.cleanupIntervalMs);
  }

  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > this.sessionExpiryMs) {
        this.sessions.delete(id);
      }
    }
  }

  touchSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  createSession(id, name) {
    const now = new Date();
    const session = {
      id,
      name,
      participants: new Map(),
      revealed: false,
      createdAt: now,
      lastActivity: now,
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id) {
    return this.sessions.get(id);
  }

  getSessionState(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return {
      id: session.id,
      name: session.name,
      participants: Array.from(session.participants.values()),
      revealed: session.revealed,
    };
  }

  addParticipant(sessionId, participantId, name, role) {
    let session = this.sessions.get(sessionId);

    // Create session if it doesn't exist (for direct URL access)
    if (!session) {
      session = this.createSession(sessionId, 'Planning Session');
    }

    const participantRole = role === 'observer' ? 'observer' : 'estimator';
    session.participants.set(participantId, {
      id: participantId,
      name,
      role: participantRole,
      vote: null,
    });

    session.lastActivity = new Date();
    return session.participants.get(participantId);
  }

  removeParticipant(sessionId, participantId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return session.participants.delete(participantId);
  }

  getParticipant(sessionId, participantId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return session.participants.get(participantId) || null;
  }

  updateParticipantSocketId(sessionId, participantId, newSocketId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const participant = session.participants.get(participantId);
    if (!participant) return false;

    // Update the participant's socket mapping if needed
    // The participant keeps the same ID but may have a new socket connection
    return true;
  }

  vote(sessionId, participantId, vote) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const participant = session.participants.get(participantId);
    // Only estimators can vote
    if (participant && participant.role === 'estimator') {
      participant.vote = vote;
      session.lastActivity = new Date();
      return true;
    }
    return false;
  }

  reveal(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.revealed = true;
    session.lastActivity = new Date();
    return true;
  }

  reset(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.revealed = false;
    // Only reset votes for estimators
    session.participants.forEach((p) => {
      if (p.role === 'estimator') {
        p.vote = null;
      }
    });
    session.lastActivity = new Date();
    return true;
  }

  deleteSession(id) {
    return this.sessions.delete(id);
  }
}

module.exports = { SessionManager };
