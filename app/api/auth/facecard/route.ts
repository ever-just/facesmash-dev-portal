import { NextRequest, NextResponse } from 'next/server';
import { matchFace } from '@/lib/facesmash-api/client';
import { db } from '@/lib/db/drizzle';
import { users, activityLogs, teamMembers, ActivityType } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { signToken } from '@/lib/auth/session';
import { cookies } from 'next/headers';

const APP_ID = process.env.DEVPORTAL_APP_ID || 'devportal';

// In-memory rate limiter (per IP). NIST: max 5 failed attempts, then 30s backoff.
const failedAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
const MAX_ATTEMPTS = 5;
const BACKOFF_MS = 30_000;

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const entry = failedAttempts.get(ip);
  if (!entry) return { allowed: true };

  if (entry.count >= MAX_ATTEMPTS) {
    const elapsed = Date.now() - entry.lastAttempt;
    if (elapsed < BACKOFF_MS) {
      return { allowed: false, retryAfter: Math.ceil((BACKOFF_MS - elapsed) / 1000) };
    }
    failedAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailure(ip: string) {
  const entry = failedAttempts.get(ip);
  if (entry) {
    entry.count++;
    entry.lastAttempt = Date.now();
  } else {
    failedAttempts.set(ip, { count: 1, lastAttempt: Date.now() });
  }
}

function clearFailures(ip: string) {
  failedAttempts.delete(ip);
}

/**
 * POST /api/auth/facecard
 *
 * Body: { descriptor: number[] }
 *
 * Flow:
 * 1. Client sends face descriptor from SDK analysis
 * 2. Server calls Hono API for pgvector face matching (scoped to app_id)
 * 3. If match found -> looks up user by email and creates session
 * 4. If not found -> returns error
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  // Rate limit check
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Please try again later.', retryAfter: rateCheck.retryAfter },
      { status: 429 }
    );
  }

  let body: { descriptor?: number[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { descriptor } = body;
  if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
    return NextResponse.json({ error: 'Missing or invalid face descriptor.' }, { status: 400 });
  }

  try {
    // Call Hono API for server-side pgvector face matching
    const matchResult = await matchFace(descriptor, APP_ID);

    if (!matchResult.ok || !matchResult.data.match || !matchResult.data.user) {
      recordFailure(ip);
      return NextResponse.json({
        error: 'Face not recognized. Please try again or use password login.',
        similarity: matchResult.data.bestSimilarity || 0,
      }, { status: 401 });
    }

    const email = matchResult.data.user.email;

    // Look up the user in the dev portal database
    const [devPortalUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    if (!devPortalUser) {
      clearFailures(ip);
      return NextResponse.json({
        error: 'No developer account found for this email.',
        faceCardValid: true,
        email,
        action: 'create_account',
      }, { status: 404 });
    }

    // Create session
    clearFailures(ip);

    const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = {
      user: { id: devPortalUser.id },
      expires: expiresInOneDay.toISOString(),
    };
    const encryptedSession = await signToken(session);

    (await cookies()).set('session', encryptedSession, {
      expires: expiresInOneDay,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });

    // Log the sign-in activity
    try {
      const teamMember = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, devPortalUser.id))
        .limit(1);

      if (teamMember[0]) {
        await db.insert(activityLogs).values({
          teamId: teamMember[0].teamId,
          userId: devPortalUser.id,
          action: ActivityType.SIGN_IN,
          ipAddress: ip !== 'unknown' ? ip : null,
        });
      }
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      user: {
        id: devPortalUser.id,
        name: devPortalUser.name,
        email: devPortalUser.email,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('FaceCard auth error:', message);
    recordFailure(ip);
    return NextResponse.json(
      { error: 'Authentication failed. Please try again.' },
      { status: 500 }
    );
  }
}
