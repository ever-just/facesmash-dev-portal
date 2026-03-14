import { getActivityLogs } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const logs = await getActivityLogs();
    return NextResponse.json(logs);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
