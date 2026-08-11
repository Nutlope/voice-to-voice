import { describe, expect, it } from "vitest";
import { createNextRealtimeHandlers } from "../src/next.js";
import type { RealtimeEngine } from "../src/engine.js";

describe("Next.js realtime handlers", () => {
  const engine = {
    async createClientSecret(body: unknown) {
      return { value: "ek_test", expires_at: 123, session: body };
    },
  } as unknown as RealtimeEngine;

  it("serves both endpoints through one path-aware catch-all route", async () => {
    const handlers = createNextRealtimeHandlers(engine);
    const secret = await handlers.POST(new Request("https://example.com/api/realtime/client_secrets", {
      method: "POST",
      body: JSON.stringify({ session: { voice: "test" } }),
    }));
    expect(secret.status).toBe(200);
    await expect(secret.json()).resolves.toMatchObject({ value: "ek_test" });

    const wrongPost = await handlers.POST(new Request("https://example.com/api/realtime", { method: "POST" }));
    expect(wrongPost.status).toBe(404);

    const wrongGet = await handlers.GET(new Request("https://example.com/api/realtime/client_secrets"));
    expect(wrongGet.status).toBe(404);
  });
});
