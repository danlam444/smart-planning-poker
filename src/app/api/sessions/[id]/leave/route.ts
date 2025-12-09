import { NextRequest, NextResponse } from 'next/server';
import { removeParticipant, getSession } from '@/lib/sessionManager';
import { pusher } from '@/lib/pusher-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const { participantId } = await request.json();

  if (!participantId) {
    return NextResponse.json({ error: 'ParticipantId is required' }, { status: 400 });
  }

  const success = await removeParticipant(sessionId, participantId);
  if (!success) {
    return NextResponse.json({ error: 'Failed to leave session' }, { status: 400 });
  }

  const session = await getSession(sessionId);

  // Broadcast updated state to all clients
  await pusher.trigger(`session-${sessionId}`, 'session-state', session);

  return NextResponse.json({ success: true });
}
