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

export type VotingScale = 'fibonacci' | 'tshirt';

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

export const SCALE_ORDER: VotingScale[] = ['fibonacci', 'tshirt'];

// Legacy export for backward compatibility
export const CARD_VALUES = VOTING_SCALES.fibonacci.values;
