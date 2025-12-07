import { NextRequest, NextResponse } from 'next/server';
import { addParticipant, getSession } from '@/lib/sessionManager';
import { pusher } from '@/lib/pusher-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const { participantId, name, role } = await request.json();

  if (!name || !participantId) {
    return NextResponse.json({ error: 'Name and participantId are required' }, { status: 400 });
  }

  await addParticipant(sessionId, participantId, name, role || 'estimator');
  const session = await getSession(sessionId);

  // Broadcast updated state to all clients
  await pusher.trigger(`session-${sessionId}`, 'session-state', session);

  return NextResponse.json(session);
}
