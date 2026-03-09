/**
 * FaceSmash API Client (server-side) — replaces PocketBase admin client.
 *
 * Used by dev portal API routes to communicate with the Hono API.
 * Authenticates via X-API-Key header (Unkey-issued keys).
 */

const FACESMASH_API_URL =
  process.env.FACESMASH_API_URL || 'https://api.facesmash.app';

// The dev portal uses its own internal API key to call the Hono devportal endpoints.
// This is separate from developer-issued Unkey keys.
const FACESMASH_API_KEY = process.env.FACESMASH_INTERNAL_API_KEY || '';

interface ApiResponse<T = unknown> {
  data: T;
  ok: boolean;
  status: number;
}

async function request<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; apiKey?: string } = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, apiKey } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey || FACESMASH_API_KEY,
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(`${FACESMASH_API_URL}${path}`, fetchOptions);
  let data: T;

  try {
    data = (await res.json()) as T;
  } catch {
    data = {} as T;
  }

  return { data, ok: res.ok, status: res.status };
}

// ─── Dev Portal endpoints (require API key) ───

export async function matchFace(
  descriptor: number[],
  appId: string,
  apiKey?: string
) {
  return request<{
    match: boolean;
    user?: { id: number; email: string; name: string | null; similarity: number };
    bestSimilarity?: number;
  }>('/api/devportal/match', {
    method: 'POST',
    body: { descriptor, appId },
    apiKey,
  });
}

export async function registerFaceCard(params: {
  email: string;
  fullName?: string;
  descriptor: number[];
  qualityScore?: number;
  appId: string;
  apiKey?: string;
}) {
  const { apiKey, ...body } = params;
  return request<{
    success: boolean;
    profileId: number;
    created?: boolean;
    updated?: boolean;
    error?: string;
    matchedEmail?: string;
  }>('/api/devportal/register', {
    method: 'POST',
    body,
    apiKey,
  });
}

export async function unlinkFaceCard(
  email: string,
  appId: string,
  apiKey?: string
) {
  return request<{ success: boolean }>('/api/devportal/register', {
    method: 'DELETE',
    body: { email, appId },
    apiKey,
  });
}

export async function checkFaceCardStatus(
  email: string,
  appId: string,
  apiKey?: string
) {
  const params = new URLSearchParams({ email, appId });
  return request<{
    registered: boolean;
    verified?: boolean;
    profileId?: number;
    createdAt?: string;
  }>(`/api/devportal/register?${params.toString()}`, {
    method: 'GET',
    apiKey,
  });
}

export async function listUsers(params: {
  appId: string;
  search?: string;
  page?: number;
  perPage?: number;
  apiKey?: string;
}) {
  const { apiKey, ...queryParams } = params;
  const searchParams = new URLSearchParams();
  searchParams.set('appId', queryParams.appId);
  if (queryParams.search) searchParams.set('search', queryParams.search);
  if (queryParams.page) searchParams.set('page', String(queryParams.page));
  if (queryParams.perPage) searchParams.set('perPage', String(queryParams.perPage));

  return request<{
    items: Array<{
      id: number;
      email: string;
      fullName: string | null;
      emailVerified: boolean;
      loginCount: number;
      successfulLogins: number;
      lastLogin: string | null;
      createdAt: string;
    }>;
    totalItems: number;
    page: number;
    perPage: number;
  }>(`/api/devportal/users?${searchParams.toString()}`, {
    method: 'GET',
    apiKey,
  });
}
