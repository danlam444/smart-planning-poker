import { NextRequest, NextResponse } from 'next/server';
import { reset, getSession } from '@/lib/sessionManager';
import { pusher } from '@/lib/pusher-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const success = await reset(sessionId);
  if (!success) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const session = await getSession(sessionId);

  // Broadcast updated state to all clients
  await pusher.trigger(`session-${sessionId}`, 'session-state', session);

  return NextResponse.json(session);
}
