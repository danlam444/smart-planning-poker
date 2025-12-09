import { kv } from '@vercel/kv';
import { createClient, RedisClientType } from 'redis';

// Session expiry in seconds (7 days)
const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export interface Participant {
  id: string;
  name: string;
  role: 'estimator' | 'observer';
  vote: string | null;
}

export interface Session {
  id: string;
  name: string;
  participants: Participant[];
  revealed: boolean;
  story: string;
  storyLocked: boolean;
  createdAt: string;
  lastActivity: string;
}

// Use Vercel KV in production, local Redis in development
const isProduction = process.env.NODE_ENV === 'production';
let localRedis: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  if (isProduction) {
    return null; // Use Vercel KV directly
  }

  if (!localRedis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    localRedis = createClient({ url: redisUrl });
    localRedis.on('error', (err) => console.error('Redis Client Error', err));
    await localRedis.connect();
  }
  return localRedis;
}

function sessionKey(id: string): string {
  return `session:${id}`;
}

export async function createSession(id: string, name: string): Promise<Session> {
  const now = new Date().toISOString();
  const session: Session = {
    id,
    name,
    participants: [],
    revealed: false,
    story: '',
    storyLocked: false,
    createdAt: now,
    lastActivity: now,
  };

  const client = await getRedisClient();
  if (client) {
    await client.set(sessionKey(id), JSON.stringify(session), { EX: SESSION_EXPIRY_SECONDS });
  } else {
    await kv.set(sessionKey(id), session, { ex: SESSION_EXPIRY_SECONDS });
  }

  return session;
}

export async function getSession(id: string): Promise<Session | null> {
  const client = await getRedisClient();
  if (client) {
    const data = await client.get(sessionKey(id));
    return data ? JSON.parse(data) : null;
  } else {
    return await kv.get<Session>(sessionKey(id));
  }
}

export async function updateSession(session: Session): Promise<void> {
  session.lastActivity = new Date().toISOString();

  const client = await getRedisClient();
  if (client) {
    await client.set(sessionKey(session.id), JSON.stringify(session), { EX: SESSION_EXPIRY_SECONDS });
  } else {
    await kv.set(sessionKey(session.id), session, { ex: SESSION_EXPIRY_SECONDS });
  }
}

export async function addParticipant(
  sessionId: string,
  participantId: string,
  name: string,
  role: 'estimator' | 'observer' = 'estimator'
): Promise<Participant | null> {
  let session = await getSession(sessionId);

  // Create session if it doesn't exist
  if (!session) {
    session = await createSession(sessionId, 'Planning Session');
  }

  // Check if participant already exists
  const existingIndex = session.participants.findIndex(p => p.id === participantId);
  if (existingIndex >= 0) {
    // Preserve existing vote when rejoining
    const existing = session.participants[existingIndex];
    session.participants[existingIndex] = {
      id: participantId,
      name,
      role,
      vote: existing.vote,  // Keep existing vote
    };
  } else {
    // New participant
    session.participants.push({
      id: participantId,
      name,
      role,
      vote: null,
    });
  }

  const participant = session.participants.find(p => p.id === participantId)!;

  await updateSession(session);
  return participant;
}

export async function getParticipant(sessionId: string, participantId: string): Promise<Participant | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  return session.participants.find(p => p.id === participantId) || null;
}

export async function vote(sessionId: string, participantId: string, voteValue: string | null): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  const participant = session.participants.find(p => p.id === participantId);
  if (!participant || participant.role !== 'estimator') return false;

  participant.vote = voteValue;
  await updateSession(session);
  return true;
}

export async function reveal(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  session.revealed = true;
  await updateSession(session);
  return true;
}

export async function reset(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  session.revealed = false;
  session.participants.forEach(p => {
    if (p.role === 'estimator') {
      p.vote = null;
    }
  });
  await updateSession(session);
  return true;
}

export async function updateStory(sessionId: string, story: string, storyLocked: boolean): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  session.story = story;
  session.storyLocked = storyLocked;
  await updateSession(session);
  return true;
}

export async function deleteSession(id: string): Promise<boolean> {
  const client = await getRedisClient();
  if (client) {
    await client.del(sessionKey(id));
  } else {
    await kv.del(sessionKey(id));
  }
  return true;
}
