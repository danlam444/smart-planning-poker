import { NextRequest, NextResponse } from 'next/server';
import { pusher } from '@/lib/pusher-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const { participantName } = await request.json();

  // Broadcast bell event to all clients
  await pusher.trigger(`session-${sessionId}`, 'bell', {
    from: participantName,
    timestamp: Date.now(),
  });

  return NextResponse.json({ success: true });
}
