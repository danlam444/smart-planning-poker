import { NextRequest, NextResponse } from 'next/server';
import { updateStory, getSession } from '@/lib/sessionManager';
import { pusher } from '@/lib/pusher-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const { story, storyLocked } = await request.json();

  if (typeof story !== 'string') {
    return NextResponse.json({ error: 'Story is required' }, { status: 400 });
  }

  const success = await updateStory(sessionId, story, storyLocked ?? false);
  if (!success) {
    return NextResponse.json({ error: 'Failed to update story' }, { status: 400 });
  }

  const session = await getSession(sessionId);

  // Broadcast updated state to all clients
  await pusher.trigger(`session-${sessionId}`, 'session-state', session);

  return NextResponse.json(session);
}
