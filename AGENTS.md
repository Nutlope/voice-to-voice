# Voice-to-Voice Repository Guide

## Bun

Use Bun for all package management, scripts, tests, and one-off binaries.

- Use `bun install`, never `npm install`, `pnpm install`, or `yarn`.
- Use `bun run <script>` for package scripts.
- Use `bunx <binary>` instead of `npx`.
- Run `bun test` for the repository test suite.
- Run `bun run build` for the production compile and type-check.

Common commands:

```bash
bun run dev
bun test
bun run build
bun run test:voice -- <deployment-url>
bun run deploy
```

## Architecture

This is a Next.js App Router application for a real-time Together AI voice
assistant. The primary flow is browser microphone -> speech-to-text -> transcript
repair -> reply model and tools -> text-to-speech -> browser playback.

### Browser

- `app/page.tsx` composes the main voice experience.
- `app/_hooks/useVoiceConversation.ts` owns conversation state, microphone
  capture, TEN VAD speech boundaries, the client WebSocket, PCM audio playback,
  and barge-in cancellation.
- `app/_lib/client-audio.ts` contains browser audio, PCM conversion, VAD, and
  playback helpers.
- `app/_components/voice/` contains the presentation components. Keep transport
  and conversation behavior in the hook rather than moving it into the UI.

### Server

- `app/api/voice/route.ts` is the same-origin WebSocket upgrade boundary. It
  creates one `VoiceSession` per connected browser.
- `app/api/voice/voice-session.ts` orchestrates the live session: Together
  realtime STT, transcript repair, reply generation, tools, Together realtime
  TTS, fallbacks, cancellation, and connection cleanup.
- `app/api/voice/reply.ts`, `transcript-repair.ts`, and `tools.ts` own their
  respective model or tool calls.
- `app/api/voice/voice-utils.ts` is the shared home for model configuration,
  prompts, protocol types, transcript rules, and audio conversion helpers.
- Provider credentials stay server-side. The browser talks only to local API
  routes and never directly receives `TOGETHER_API_KEY` or `EXA_API_KEY`.

### Supporting surfaces and verification

- `/stt-playground` compares speech-to-text models through
  `app/api/stt-playground/route.ts`.
- `/orbs` is the WebGL orb laboratory; `/design` is the component gallery.
- Tests are colocated beside the hooks, components, and server modules they
  cover. `scripts/` contains benchmarks and the deployed end-to-end voice check.
- Local development is sufficient for UI work, but the full `/api/voice`
  WebSocket flow must be verified on a Vercel deployment.
