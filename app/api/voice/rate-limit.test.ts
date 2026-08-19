import { describe, expect, test } from "bun:test";
import {
  DAILY_CALL_LIMIT,
  DAILY_MINUTES_LIMIT,
  fingerprintFromRequest,
  quotaSnapshot,
} from "./rate-limit";

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/voice", { headers });
}

describe("fingerprintFromRequest", () => {
  test("is stable for the same headers", () => {
    const a = fingerprintFromRequest(
      requestWithHeaders({
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
        "user-agent": "Mozilla/5.0",
        "accept-language": "en-US",
      }),
    );
    const b = fingerprintFromRequest(
      requestWithHeaders({
        "x-forwarded-for": "1.2.3.4, 9.9.9.9",
        "user-agent": "Mozilla/5.0",
        "accept-language": "en-US",
      }),
    );
    expect(a).toBe(b);
    expect(a.startsWith("fp_")).toBe(true);
  });

  test("differs across IPs and user agents", () => {
    const base = {
      "user-agent": "Mozilla/5.0",
      "accept-language": "en-US",
    };
    const a = fingerprintFromRequest(
      requestWithHeaders({ ...base, "x-forwarded-for": "1.1.1.1" }),
    );
    const b = fingerprintFromRequest(
      requestWithHeaders({ ...base, "x-forwarded-for": "2.2.2.2" }),
    );
    const c = fingerprintFromRequest(
      requestWithHeaders({
        ...base,
        "x-forwarded-for": "1.1.1.1",
        "user-agent": "Other",
      }),
    );
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  test("handles missing headers", () => {
    const fp = fingerprintFromRequest(requestWithHeaders({}));
    expect(fp.startsWith("fp_")).toBe(true);
  });
});

describe("quotaSnapshot", () => {
  test("exposes daily limits and remaining budget", () => {
    const snapshot = quotaSnapshot({
      ok: true,
      remainingCalls: 7,
      remainingSeconds: 123,
      resetAt: 1000,
    });
    expect(snapshot.limitCalls).toBe(DAILY_CALL_LIMIT);
    expect(snapshot.limitMinutes).toBe(DAILY_MINUTES_LIMIT);
    expect(snapshot.remainingCalls).toBe(7);
    expect(snapshot.remainingSeconds).toBe(123);
    expect(snapshot.resetAt).toBe(1000);
  });
});
