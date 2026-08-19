import {
  fingerprintFromRequest,
  peekVoiceAllowance,
} from "../rate-limit";

export const runtime = "nodejs";

// Read-only quota lookup so the UI can show remaining free minutes before and
// after a call. Unlike the WebSocket route this never consumes a call.
export async function GET(request: Request) {
  const fingerprint = fingerprintFromRequest(request);
  const quota = await peekVoiceAllowance(fingerprint);
  return Response.json(quota, {
    headers: { "cache-control": "no-store" },
  });
}
