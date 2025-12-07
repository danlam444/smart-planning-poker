import { NextRequest, NextResponse } from 'next/server';
import { vote, getSession } from '@/lib/sessionManager';
import { pusher } from '@/lib/pusher-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const { participantId, vote: voteValue } = await request.json();

  if (!participantId || !voteValue) {
    return NextResponse.json({ error: 'ParticipantId and vote are required' }, { status: 400 });
  }

  const success = await vote(sessionId, participantId, voteValue);
  if (!success) {
    return NextResponse.json({ error: 'Failed to vote' }, { status: 400 });
  }

  const session = await getSession(sessionId);

  // Broadcast updated state to all clients
  await pusher.trigger(`session-${sessionId}`, 'session-state', session);

  return NextResponse.json(session);
}
