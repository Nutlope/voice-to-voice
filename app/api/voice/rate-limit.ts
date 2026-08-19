import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// This Upstash database is shared across multiple apps, so every key this app
// writes is namespaced with a stable app prefix.
const APP_PREFIX = "voice-to-voice";

// Demo guardrails: each visitor gets a small daily allowance.
export const DAILY_CALL_LIMIT = 10;
export const DAILY_MINUTES_LIMIT = 10;
const DAILY_SECONDS_LIMIT = DAILY_MINUTES_LIMIT * 60;

type LimitSuccess = {
  ok: true;
  remainingCalls: number;
  remainingSeconds: number;
  resetAt: number;
};

type LimitDenied = {
  ok: false;
  reason: "calls" | "minutes";
  remainingCalls: number;
  remainingSeconds: number;
  resetAt: number;
};

export type LimitResult = LimitSuccess | LimitDenied;

export type QuotaSnapshot = {
  limitCalls: number;
  limitMinutes: number;
  remainingCalls: number;
  remainingSeconds: number;
  resetAt: number;
};

let redis: Redis | undefined;
let callLimiter: Ratelimit | undefined;

function getRedis(): Redis | undefined {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;
  redis = new Redis({ url, token });
  return redis;
}

function getCallLimiter(): Ratelimit | undefined {
  const client = getRedis();
  if (!client) return undefined;
  if (!callLimiter) {
    callLimiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.fixedWindow(DAILY_CALL_LIMIT, "1 d"),
      prefix: `${APP_PREFIX}:calls`,
      analytics: false,
    });
  }
  return callLimiter;
}

// Fingerprint the visitor from request headers so the daily allowance survives
// new tabs and page reloads without any login. The raw values never leave the
// server; only a salted hash is used as the Redis identifier.
export function fingerprintFromRequest(request: Request): string {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  const ip =
    headers.get("x-real-ip") ?? forwardedFor?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = headers.get("user-agent") ?? "unknown";
  const language = headers.get("accept-language") ?? "unknown";
  const hash = createHash("sha256")
    .update(`${APP_PREFIX}|${ip}|${userAgent}|${language}`)
    .digest("hex");
  return `fp_${hash.slice(0, 32)}`;
}

function secondsKey(identifier: string): string {
  return `${APP_PREFIX}:seconds:${identifier}`;
}

function midnightUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}

// Reserve one call and read the current time budget. Both the call count and
// the used seconds are enforced so a visitor can neither open many calls nor
// stretch one call past the daily allowance.
export async function checkVoiceAllowance(
  identifier: string,
): Promise<LimitResult> {
  const client = getRedis();
  const limiter = getCallLimiter();
  if (!client || !limiter) {
    // Rate limiting is optional in local development without Upstash creds.
    return {
      ok: true,
      remainingCalls: DAILY_CALL_LIMIT,
      remainingSeconds: DAILY_SECONDS_LIMIT,
      resetAt: midnightUtc(),
    };
  }

  const { success, remaining, reset } = await limiter.limit(identifier);
  const { remainingSeconds } = await readRemainingSeconds(client, identifier);

  if (!success) {
    return {
      ok: false,
      reason: "calls",
      remainingCalls: 0,
      remainingSeconds,
      resetAt: reset,
    };
  }
  if (remainingSeconds <= 0) {
    return {
      ok: false,
      reason: "minutes",
      remainingCalls: remaining,
      remainingSeconds: 0,
      resetAt: midnightUtc(),
    };
  }

  return {
    ok: true,
    remainingCalls: remaining,
    remainingSeconds,
    resetAt: midnightUtc(),
  };
}

// Read-only quota lookup for the UI. Never consumes a call.
export async function peekVoiceAllowance(
  identifier: string,
): Promise<QuotaSnapshot> {
  const client = getRedis();
  if (!client) {
    return quotaSnapshot({
      ok: true,
      remainingCalls: DAILY_CALL_LIMIT,
      remainingSeconds: DAILY_SECONDS_LIMIT,
      resetAt: midnightUtc(),
    });
  }
  const { remainingSeconds } = await readRemainingSeconds(client, identifier);
  return quotaSnapshot({
    ok: true,
    // Call-count remaining is only known when a call is consumed; the UI cares
    // about minutes, so report the full daily call budget here.
    remainingCalls: DAILY_CALL_LIMIT,
    remainingSeconds,
    resetAt: midnightUtc(),
  });
}

async function readRemainingSeconds(client: Redis, identifier: string) {
  const usedRaw = await client.get<number | string>(secondsKey(identifier));
  const used = Number(usedRaw ?? 0) || 0;
  return { used, remainingSeconds: Math.max(0, DAILY_SECONDS_LIMIT - used) };
}

// Add consumed call seconds to the visitor's daily bucket. The key expires at
// the next UTC midnight so the allowance resets daily.
export async function recordVoiceUsage(
  identifier: string,
  seconds: number,
): Promise<void> {
  const client = getRedis();
  if (!client || seconds <= 0) return;
  const key = secondsKey(identifier);
  const wholeSeconds = Math.ceil(seconds);
  await client.incrby(key, wholeSeconds);
  const ttlSeconds = Math.max(
    60,
    Math.ceil((midnightUtc() - Date.now()) / 1000),
  );
  await client.expire(key, ttlSeconds);
}

export function quotaSnapshot(result: LimitResult): QuotaSnapshot {
  return {
    limitCalls: DAILY_CALL_LIMIT,
    limitMinutes: DAILY_MINUTES_LIMIT,
    remainingCalls: result.remainingCalls,
    remainingSeconds: result.remainingSeconds,
    resetAt: result.resetAt,
  };
}
