import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/sessionManager';

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
