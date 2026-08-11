import { createRealtimeEngine } from "@together/realtime";
import { DEMO_VOICE } from "./voice";

export const realtimeEngine = createRealtimeEngine({
  ...(process.env.TOGETHER_API_KEY ? { apiKey: process.env.TOGETHER_API_KEY } : {}),
  ...(process.env.TOGETHER_REALTIME_SECRET
    ? { realtimeSecret: process.env.TOGETHER_REALTIME_SECRET }
    : {}),
  models: {
    stt: "nvidia/parakeet-tdt-0.6b-v3",
    realtimeStt: "openai/whisper-large-v3",
    reply: "nvidia/nemotron-3-ultra-550b-a55b",
    tts: "cartesia/sonic-3",
  },
  replyContextWindowTokens: 262_144,
  maxOutputTokens: 128,
  defaultVoice: DEMO_VOICE,
  debug: process.env.TOGETHER_REALTIME_DEBUG === "1",
});
