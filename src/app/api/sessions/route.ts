import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sessionStore } from '@/lib/sessionStore';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Session name is required' }, { status: 400 });
  }

  const id = uuidv4();
  sessionStore.createSession(id, name);

  return NextResponse.json({ id, name });
}
