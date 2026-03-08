"use server";

import { z } from "zod";
import { unkey, UNKEY_API_ID, type UnkeyKeyMeta } from "@/lib/unkey";
import { validatedActionWithUser } from "@/lib/auth/middleware";
import { getUserWithTeam } from "@/lib/db/queries";

// ─── Create API Key ──────────────────────────────────────────────
const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  prefix: z.string().optional().default("fsk"),
  expiresInDays: z.number().optional(),
});

export const createApiKey = validatedActionWithUser(
  createKeySchema,
  async (data, _, user) => {
    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return { error: "You must be part of a team to create API keys." };
    }

    const expires = data.expiresInDays
      ? Date.now() + data.expiresInDays * 86400000
      : undefined;

    try {
      const result = await unkey.keys.createKey({
        apiId: UNKEY_API_ID,
        prefix: data.prefix || "fsk",
        name: data.name,
        meta: {
          teamId: userWithTeam.teamId,
          userId: user.id,
          appName: data.name,
        },
        expires: expires,
        ratelimits: [
          {
            name: "requests",
            limit: 100,
            duration: 60000, // 100 req/min default
          },
        ],
      });

      return {
        success: "API key created successfully.",
        key: result.data.key,
        keyId: result.data.keyId,
      };
    } catch (err: any) {
      return { error: err?.message || "Failed to create API key." };
    }
  }
);

// ─── List API Keys ───────────────────────────────────────────────
export async function listApiKeys(teamId: number) {
  try {
    const result = await unkey.apis.listKeys({
      apiId: UNKEY_API_ID,
      limit: 100,
    });

    // Filter keys that belong to this team
    const keys = Array.isArray(result.data) ? result.data : [];
    return keys.filter((key: any) => {
      const meta = key.meta as UnkeyKeyMeta | undefined;
      return meta?.teamId === teamId;
    });
  } catch (err) {
    console.error("[unkey] Failed to list keys:", err);
    return [];
  }
}

// ─── Revoke API Key ──────────────────────────────────────────────
const revokeKeySchema = z.object({
  keyId: z.string().min(1),
});

export const revokeApiKey = validatedActionWithUser(
  revokeKeySchema,
  async (data, _, user) => {
    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return { error: "You must be part of a team." };
    }

    try {
      // Verify the key belongs to this team before revoking
      const keyInfo = await unkey.keys.getKey({ keyId: data.keyId });

      const meta = keyInfo.data?.meta as UnkeyKeyMeta | undefined;
      if (meta?.teamId !== userWithTeam.teamId) {
        return { error: "API key does not belong to your team." };
      }

      await unkey.keys.deleteKey({ keyId: data.keyId });

      return { success: "API key revoked successfully." };
    } catch (err: any) {
      return { error: err?.message || "Failed to revoke API key." };
    }
  }
);

// ─── Get Key Verifications (usage) ───────────────────────────────
export async function getKeyVerifications(keyId: string) {
  try {
    const result = await unkey.keys.getKey({ keyId });
    return result.data;
  } catch {
    return null;
  }
}
