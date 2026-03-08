import { NextRequest, NextResponse } from 'next/server';
import { getPocketBaseAdmin } from '@/lib/pocketbase/client';
import { getUser } from '@/lib/db/queries';

const APP_ID = process.env.DEVPORTAL_APP_ID || 'devportal';

/**
 * POST /api/auth/facecard/register
 *
 * Links a FaceCard (PocketBase user_profile) to the signed-in dev portal user.
 * Called after the client-side SDK captures face data and registers it in PocketBase.
 *
 * Body: { profileId: string }
 *
 * Flow:
 * 1. Verify the user is signed in
 * 2. Verify the PocketBase profile exists
 * 3. Update the PocketBase profile's email to match the dev portal user's email
 *    (so /api/auth/facecard login can match them)
 * 4. Set email_verified = true on the profile
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
    const pb = await getPocketBaseAdmin();

    // Check if this email already has a FaceCard linked
    try {
      const existing = await pb.collection('user_profiles').getFirstListItem(
        `email = "${user.email}" && email_verified = true && app_id = "${APP_ID}"`
      );
      if (existing) {
        return NextResponse.json({
          error: 'A FaceCard is already linked to this email. Remove it first in Security settings.',
          existingProfileId: existing.id,
        }, { status: 409 });
      }
    } catch {
      // No existing verified profile — good
    }

    // "new" = create a fresh PocketBase profile linked to this user
    if (profileId === 'new') {
      if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
        return NextResponse.json({ error: 'Missing or invalid face descriptor.' }, { status: 400 });
      }

      try {
        const newProfile = await pb.collection('user_profiles').create({
          full_name: user.name || 'Developer',
          email: user.email,
          face_embedding: descriptor,
          email_verified: true,
          app_id: APP_ID,
        });

        return NextResponse.json({
          success: true,
          message: 'FaceCard created and linked to your account.',
          profileId: newProfile.id,
        });
      } catch (pbError: any) {
        console.error('PocketBase create error:', pbError);
        console.error('PocketBase error data:', pbError?.data);
        console.error('PocketBase error response:', pbError?.response);
        return NextResponse.json({ 
          error: `PocketBase error: ${pbError?.message || 'Unknown error'}`,
          details: pbError?.data || pbError?.response 
        }, { status: 500 });
      }
    }

    // Otherwise, link an existing profile
    let profile: any;
    try {
      profile = await pb.collection('user_profiles').getOne(profileId);
    } catch {
      return NextResponse.json({ error: 'FaceCard profile not found in PocketBase.' }, { status: 404 });
    }

    // Link: update the PocketBase profile email to match the dev portal user
    await pb.collection('user_profiles').update(profileId, {
      email: user.email,
      full_name: user.name || profile.full_name,
      email_verified: true,
      app_id: APP_ID,
    });

    return NextResponse.json({
      success: true,
      message: 'FaceCard linked to your account.',
      profileId,
    });
  } catch (err: any) {
    console.error('FaceCard register error:', err?.message || err);
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
    const pb = await getPocketBaseAdmin();

    try {
      const profile = await pb.collection('user_profiles').getFirstListItem(
        `email = "${user.email}" && app_id = "${APP_ID}"`
      );
      // Unlink by clearing the email_verified flag
      await pb.collection('user_profiles').update(profile.id, {
        email_verified: false,
      });
      return NextResponse.json({ success: true, message: 'FaceCard removed.' });
    } catch {
      return NextResponse.json({ error: 'No FaceCard found to remove.' }, { status: 404 });
    }
  } catch (err: any) {
    console.error('FaceCard delete error:', err?.message || err);
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
    const pb = await getPocketBaseAdmin();

    try {
      const profile = await pb.collection('user_profiles').getFirstListItem(
        `email = "${user.email}" && app_id = "${APP_ID}" && email_verified = true`
      );
      return NextResponse.json({
        hasCard: true,
        profileId: profile.id,
        name: profile.name,
        created: profile.created,
      });
    } catch {
      return NextResponse.json({ hasCard: false });
    }
  } catch (err: any) {
    console.error('FaceCard check error:', err?.message || err);
    return NextResponse.json({ error: 'Failed to check FaceCard status.' }, { status: 500 });
  }
}
