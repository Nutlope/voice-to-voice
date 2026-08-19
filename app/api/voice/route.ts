import { experimental_upgradeWebSocket } from "@vercel/functions";
import { VoiceSession } from "./voice-session";
import { userContextFromRequest } from "./user-context";
import { isAllowedOrigin } from "./voice-utils";
import {
  checkVoiceAllowance,
  fingerprintFromRequest,
  quotaSnapshot,
} from "./rate-limit";

export const runtime = "nodejs";
export const maxDuration = 660;
const VOICE_SOCKET_MAX_PAYLOAD_BYTES = 1024 * 1024;

export async function GET(request: Request) {
  if (!isAllowedOrigin(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  const userContext = userContextFromRequest(request);
  const fingerprint = fingerprintFromRequest(request);
  const allowance = await checkVoiceAllowance(fingerprint);

  if (!allowance.ok) {
    const message =
      allowance.reason === "calls"
        ? "Daily call limit reached. Come back tomorrow for more free calls."
        : "Daily free minutes used up. Come back tomorrow for more free calls.";
    return Response.json(
      { error: message, quota: quotaSnapshot(allowance) },
      { status: 429 },
    );
  }

  return experimental_upgradeWebSocket(
    (client) => {
      const session = new VoiceSession(client, userContext, {
        fingerprint,
        remainingSeconds: allowance.remainingSeconds,
        quota: quotaSnapshot(allowance),
      });
      session.start();
    },
    { maxPayload: VOICE_SOCKET_MAX_PAYLOAD_BYTES },
  );
}
