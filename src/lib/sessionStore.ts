import { PokerSession, Participant, SessionState } from '@/types/poker';

class SessionStore {
  private sessions: Map<string, PokerSession> = new Map();

  createSession(id: string, name: string): PokerSession {
    const session: PokerSession = {
      id,
      name,
      participants: new Map(),
      revealed: false,
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): PokerSession | undefined {
    return this.sessions.get(id);
  }

  addParticipant(sessionId: string, participant: Participant): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.participants.set(participant.id, participant);
    return true;
  }

  removeParticipant(sessionId: string, participantId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return session.participants.delete(participantId);
  }

  updateVote(sessionId: string, participantId: string, vote: string | null): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    const participant = session.participants.get(participantId);
    if (!participant) return false;
    participant.vote = vote;
    return true;
  }

  revealVotes(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.revealed = true;
    return true;
  }

  resetVotes(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.revealed = false;
    session.participants.forEach((p) => {
      p.vote = null;
    });
    return true;
  }

  getSessionState(sessionId: string): SessionState | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return {
      id: session.id,
      name: session.name,
      participants: Array.from(session.participants.values()),
      revealed: session.revealed,
    };
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }
}

// Singleton instance
export const sessionStore = new SessionStore();
