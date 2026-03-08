import { Unkey } from "@unkey/api";
import "server-only";

export const unkey = new Unkey({
  rootKey: process.env.UNKEY_ROOT_KEY!,
});

export const UNKEY_API_ID = process.env.UNKEY_API_ID!;

export type UnkeyKeyMeta = {
  teamId: number;
  userId: number;
  appName: string;
};
