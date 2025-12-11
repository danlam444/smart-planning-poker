import { NextRequest, NextResponse } from 'next/server';
import { updateAvatar, getSession } from '@/lib/sessionManager';
import { pusher } from '@/lib/pusher-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const { participantId, avatar } = await request.json();

  if (!participantId || !avatar) {
    return NextResponse.json({ error: 'participantId and avatar are required' }, { status: 400 });
  }

  const success = await updateAvatar(sessionId, participantId, avatar);
  if (!success) {
    return NextResponse.json({ error: 'Failed to update avatar' }, { status: 400 });
  }

  const session = await getSession(sessionId);

  // Broadcast updated state to all clients
  await pusher.trigger(`session-${sessionId}`, 'session-state', session);

  return NextResponse.json(session);
}
