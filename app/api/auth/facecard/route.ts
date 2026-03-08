import { NextRequest, NextResponse } from 'next/server';
import { getPocketBaseAdmin } from '@/lib/pocketbase/client';
import { db } from '@/lib/db/drizzle';
import { users, activityLogs, teamMembers, ActivityType } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { signToken } from '@/lib/auth/session';
import { cookies } from 'next/headers';

// Simple euclidean distance calculation for face matching
function calculateSimilarity(desc1: Float32Array, desc2: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  const distance = Math.sqrt(sum);
  return 1 - distance; // Convert distance to similarity (higher = more similar)
}

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
    // Reset after backoff period
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
 * 2. Server fetches all profiles from PocketBase for this app
 * 3. Server matches descriptor against all profiles
 * 4. If match found → looks up user by email and creates session
 * 5. If not found → returns error
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
    // Step 1: Fetch all profiles for this app from PocketBase
    const pb = await getPocketBaseAdmin();
    const profiles = await pb.collection('user_profiles').getFullList({
      filter: `app_id = "${APP_ID}" && email_verified = true`,
    });

    if (profiles.length === 0) {
      recordFailure(ip);
      return NextResponse.json({ error: 'No FaceCard profiles found. Please register first.' }, { status: 404 });
    }

    // Step 2: Match descriptor against all profiles
    let bestMatch: any = null;
    let bestSimilarity = 0;
    const inputDescriptor = new Float32Array(descriptor);
    const MATCH_THRESHOLD = 0.6; // Similarity threshold (higher = stricter)

    for (const profile of profiles) {
      if (!profile.face_embedding || !Array.isArray(profile.face_embedding)) continue;
      
      const storedDescriptor = new Float32Array(profile.face_embedding);
      const similarity = calculateSimilarity(inputDescriptor, storedDescriptor);
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = profile;
      }
    }

    if (!bestMatch || bestSimilarity < MATCH_THRESHOLD) {
      recordFailure(ip);
      return NextResponse.json({ 
        error: 'Face not recognized. Please try again or use password login.',
        similarity: bestSimilarity 
      }, { status: 401 });
    }

    const email = bestMatch.email;

    // Step 3: Look up the user in the dev portal database
    const [devPortalUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    if (!devPortalUser) {
      // User exists in PocketBase (has FaceCard) but not in dev portal
      // Clear failures — the face match was valid, just no account
      clearFailures(ip);
      return NextResponse.json({
        error: 'No developer account found for this email.',
        faceCardValid: true,
        email,
        action: 'create_account',
      }, { status: 404 });
    }

    // Step 4: Create session
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
  } catch (err: any) {
    console.error('FaceCard auth error:', err?.message || err);
    recordFailure(ip);
    return NextResponse.json(
      { error: 'Authentication failed. Please try again.' },
      { status: 500 }
    );
  }
}
