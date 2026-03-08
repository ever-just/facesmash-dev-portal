import { NextResponse } from 'next/server';
import { listApiKeys } from '@/lib/keys/actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ keys: [] });
  }

  const keys = await listApiKeys(parseInt(teamId, 10));
  return NextResponse.json({ keys });
}
