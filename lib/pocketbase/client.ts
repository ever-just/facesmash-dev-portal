import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'https://api.facesmash.app';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || '';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '';

let pbInstance: PocketBase | null = null;
let authPromise: Promise<void> | null = null;

/**
 * Returns an authenticated PocketBase admin client.
 * Caches the instance and re-authenticates if the token expires.
 */
export async function getPocketBaseAdmin(): Promise<PocketBase> {
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    throw new Error('PocketBase admin credentials not configured (PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD).');
  }

  if (!pbInstance) {
    pbInstance = new PocketBase(POCKETBASE_URL);
    pbInstance.autoCancellation(false);
  }

  // Re-auth if token is missing or expired
  if (!pbInstance.authStore.isValid) {
    if (!authPromise) {
      authPromise = pbInstance
        .collection('_superusers')
        .authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD)
        .then(() => {
          authPromise = null;
        })
        .catch((err) => {
          authPromise = null;
          pbInstance = null;
          throw err;
        });
    }
    await authPromise;
  }

  return pbInstance!;
}
