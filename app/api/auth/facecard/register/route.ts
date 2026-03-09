import { NextRequest, NextResponse } from 'next/server';
import { registerFaceCard, unlinkFaceCard, checkFaceCardStatus } from '@/lib/facesmash-api/client';
import { getUser } from '@/lib/db/queries';

const APP_ID = process.env.DEVPORTAL_APP_ID || 'devportal';

/**
 * POST /api/auth/facecard/register
 *
 * Registers a FaceCard for the signed-in dev portal user via the Hono API.
 * The Hono API handles duplicate face/email checks, profile creation,
 * template management, and pgvector indexing.
 *
 * Body: { profileId: string, descriptor?: number[], qualityScore?: number }
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let body: { profileId?: string; descriptor?: number[]; qualityScore?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { profileId, descriptor, qualityScore } = body;
  if (!profileId) {
    return NextResponse.json({ error: 'Missing profileId.' }, { status: 400 });
  }

  try {
    // Check if this email already has a FaceCard linked
    const statusCheck = await checkFaceCardStatus(user.email, APP_ID);
    if (statusCheck.ok && statusCheck.data.registered && statusCheck.data.verified) {
      return NextResponse.json({
        error: 'A FaceCard is already linked to this email. Remove it first in Security settings.',
        existingProfileId: statusCheck.data.profileId,
      }, { status: 409 });
    }

    // "new" = create a fresh profile linked to this user
    if (profileId === 'new') {
      if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
        return NextResponse.json({ error: 'Missing or invalid face descriptor.' }, { status: 400 });
      }

      const result = await registerFaceCard({
        email: user.email,
        fullName: user.name || 'Developer',
        descriptor,
        qualityScore: qualityScore || 0.5,
        appId: APP_ID,
      });

      if (!result.ok) {
        const errData = result.data;
        return NextResponse.json({
          error: errData.error || 'Failed to register FaceCard.',
          matchedEmail: errData.matchedEmail,
        }, { status: result.status });
      }

      return NextResponse.json({
        success: true,
        message: 'FaceCard created and linked to your account.',
        profileId: result.data.profileId,
      });
    }

    // Otherwise, re-register with existing descriptor data
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
      return NextResponse.json({ error: 'Missing face descriptor for linking.' }, { status: 400 });
    }

    const result = await registerFaceCard({
      email: user.email,
      fullName: user.name || undefined,
      descriptor,
      qualityScore: qualityScore || 0.5,
      appId: APP_ID,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.data.error || 'Failed to link FaceCard.' },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'FaceCard linked to your account.',
      profileId: result.data.profileId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('FaceCard register error:', message);
    return NextResponse.json(
      { error: 'Failed to link FaceCard. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/facecard/register
 *
 * Unlinks the current user's FaceCard from their dev portal account.
 */
export async function DELETE() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const result = await unlinkFaceCard(user.email, APP_ID);

    if (!result.ok) {
      return NextResponse.json(
        { error: 'No FaceCard found to remove.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'FaceCard removed.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('FaceCard delete error:', message);
    return NextResponse.json({ error: 'Failed to remove FaceCard.' }, { status: 500 });
  }
}

/**
 * GET /api/auth/facecard/register
 *
 * Check if the current user has a FaceCard linked.
 */
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const result = await checkFaceCardStatus(user.email, APP_ID);

    if (!result.ok) {
      return NextResponse.json({ hasCard: false });
    }

    if (result.data.registered && result.data.verified) {
      return NextResponse.json({
        hasCard: true,
        profileId: result.data.profileId,
        created: result.data.createdAt,
      });
    }

    return NextResponse.json({ hasCard: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('FaceCard check error:', message);
    return NextResponse.json({ error: 'Failed to check FaceCard status.' }, { status: 500 });
  }
}
