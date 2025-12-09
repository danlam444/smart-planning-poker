import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession } from '@/lib/sessionManager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    name: session.name,
    participants: session.participants,
    revealed: session.revealed,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Session name is required' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await createSession(id, name);

  return NextResponse.json({ id, name });
}
