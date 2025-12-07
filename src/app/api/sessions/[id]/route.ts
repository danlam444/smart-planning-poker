import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/sessionStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = sessionStore.getSessionState(id);

  if (!state) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json(state);
}
