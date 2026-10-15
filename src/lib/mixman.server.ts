import { getCookie, useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

const SESSION_NAME = "prime-mixman-session";

interface MixmanSession {
  unlocked?: boolean;
}

function cfg() {
  const secret = process.env["MIXMAN_SESSION_SECRET"];
  if (!secret || secret.length < 32) throw new Error("Secure Mix Man session is not configured.");
  return {
    password: secret,
    name: SESSION_NAME,
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

function tsEq(a: string, b: string) {
  const ah = createHash("sha256").update(a, "utf8").digest();
  const bh = createHash("sha256").update(b, "utf8").digest();
  return ah.length === bh.length && timingSafeEqual(ah, bh);
}

export function verifyMixmanPassword(input: string) {
  const password = process.env["MIXMAN_PASSWORD"] || process.env["ADMIN_PASSWORD"];
  return !!password && tsEq(String(input ?? ""), password);
}

export async function createMixmanSession() {
  return useSession<MixmanSession>(cfg());
}

export async function requireMixmanUnlocked() {
  const s = await createMixmanSession();
  if (!s.data?.unlocked) throw new Error("mixman_locked");
  return s;
}


export async function isMixmanUnlocked() {
  if (!getCookie(SESSION_NAME)) return false;
  try {
    const s = await createMixmanSession();
    return !!s.data?.unlocked;
  } catch {
    return false;
  }
}
