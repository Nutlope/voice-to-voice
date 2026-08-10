# Together Voice

A real-time, multilingual voice assistant built with Together AI and Next.js.

## Pipeline

1. **Browser audio** — captures and streams microphone audio.
2. **Browser VAD** — TEN VAD detects when the user starts and stops speaking.
3. **Together STT** — Parakeet transcribes speech, with Whisper as the fallback.
4. **Together LLM · transcript repair** — Qwen cleans the final transcript without changing its meaning.
5. **Together LLM · reply** — Nemotron Ultra generates the response, with MiniMax as the fallback.
6. **Together TTS** — Cartesia Sonic turns completed sentences into speech, with Kokoro as the fallback.
7. **Browser playback and barge-in** — plays streamed audio and cancels or pauses the response when the user interrupts.

The Together API key stays on the server. The browser connects only to `/api/voice`.

## Quick start

You need [Bun](https://bun.sh/) and a [Together AI API key](https://api.together.ai/settings/api-keys).

```bash
bun install
```

Create `.env`:

```bash
TOGETHER_API_KEY=your_key_here
```

Start the app:

```bash
bun run dev
```

Local development is useful for UI work. The complete voice flow relies on Vercel WebSocket upgrades, so test live conversations from a deployed environment.

## Default models

| Stage | Primary | Fallback |
| --- | --- | --- |
| Speech-to-text | `nvidia/parakeet-tdt-0.6b-v3` | `openai/whisper-large-v3` |
| Transcript repair | `Qwen/Qwen3.5-9B` | — |
| Reply | `nvidia/nemotron-3-ultra-550b-a55b` | `MiniMaxAI/MiniMax-M2.7` |
| Text-to-speech | `cartesia/sonic-3` | `hexgrad/Kokoro-82M` |

Every default can be overridden with the `TOGETHER_*` environment variables defined in [`app/api/voice/voice-utils.ts`](app/api/voice/voice-utils.ts).

## Build something similar with your coding agent

Copy this prompt into an agent that has access to your project:

```text
Inspect https://github.com/riccardogiorato/voice-to-voice directly before writing code. Use the repository as a working architecture and behavior reference, not just the README.

Trace the complete voice pipeline through the browser hook, WebSocket route, voice session, model configuration, audio utilities, UI components, and tests. Pay particular attention to browser VAD, streaming audio, live transcripts, transcript repair, STT → reply → TTS separation, sentence-level playback, barge-in cancellation, same-language replies, provider fallbacks, same-origin protection, connection cleanup, and the deployed end-to-end latency test.

Then implement a similar production-ready, mobile-first voice-to-voice experience in my current project. Adapt it to the project's existing framework, conventions, package manager, and design system instead of copying files blindly. Keep provider credentials server-side, expose model choices through environment variables, make interruptions and reconnects safe, and include accessible controls and clear error states.

Before coding, explain the architecture you found and the smallest implementation plan. After coding, run the relevant tests and production build, test the real voice flow in a runtime that supports WebSocket upgrades, and clearly distinguish what was code-verified, browser-verified, and live-deployment-verified.
```

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the local development server |
| `bun test` | Run the test suite |
| `bun run build` | Compile and type-check the production app |
| `bun run test:voice -- <url>` | Test a complete voice turn against a deployment |
| `bun run bench:stt` | Compare speech-to-text models |
| `bun run bench:repair` | Compare transcript repair models |
| `bun run bench:reply` | Compare reply models |
| `bun run bench:tts` | Compare text-to-speech models |
| `bun run deploy` | Deploy the app to Vercel production |

## Project map

- [`app/_hooks/useVoiceConversation.ts`](app/_hooks/useVoiceConversation.ts) — browser conversation state, microphone capture, and playback
- [`app/api/voice/route.ts`](app/api/voice/route.ts) — WebSocket upgrade and same-origin protection
- [`app/api/voice/voice-session.ts`](app/api/voice/voice-session.ts) — server-side STT, reply, tools, and TTS orchestration
- [`app/api/voice/voice-utils.ts`](app/api/voice/voice-utils.ts) — models, prompts, timing, and protocol types
- [`app/_components/voice`](app/_components/voice) — voice UI components
- [`scripts`](scripts) — benchmarks and deployed end-to-end checks

Extra development routes:

- `/stt-playground` compares STT models.
- `/orbs` previews the WebGL orb experiments.
- `/design` previews voice UI components.

## Deploy

Add the API key to Vercel, then deploy:

```bash
bunx vercel env add TOGETHER_API_KEY
bun run deploy
```

The voice route uses Vercel's `experimental_upgradeWebSocket()` API and requires Fluid Compute. It allows an eleven-minute function lifetime while the app ends calls after ten minutes for a clean shutdown.

After deployment, verify the full pipeline:

```bash
bun run test:voice -- https://your-app.vercel.app
```

The test reports STT, first-token, first-audio, and total latency. Detailed results are saved under `bench-results/`.
