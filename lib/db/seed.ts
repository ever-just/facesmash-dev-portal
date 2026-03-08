import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { hashPassword } from '@/lib/auth/session';

async function seed() {
  const email = 'facesmash@everjust.com';
  const password = 'FSmash_Portal2026!';
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values([
      {
        email: email,
        name: 'FaceSmash Admin',
        passwordHash: passwordHash,
        role: "owner",
      },
    ])
    .returning();

  console.log('Admin user created:', user.email);

  const [team] = await db
    .insert(teams)
    .values({
      name: 'FaceSmash',
      planName: 'Free',
    })
    .returning();

  console.log('Team created:', team.name);

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: 'owner',
  });

  console.log('Team member linked.');
  // Stripe products already created via API (Free, Pro, Enterprise)
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
