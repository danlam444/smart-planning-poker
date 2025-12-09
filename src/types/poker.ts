export type ParticipantRole = 'estimator' | 'observer';

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  vote: string | null;
}

export interface PokerSession {
  id: string;
  name: string;
  participants: Map<string, Participant>;
  revealed: boolean;
  createdAt: Date;
}

export interface SessionState {
  id: string;
  name: string;
  participants: Participant[];
  revealed: boolean;
  story: string;
  storyLocked: boolean;
}

export const CARD_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];
