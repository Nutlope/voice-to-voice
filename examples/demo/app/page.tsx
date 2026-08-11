"use client";

import {
  OpenAIRealtimeWebSocket,
  RealtimeAgent,
  RealtimeSession,
  tool,
} from "@openai/agents/realtime";
import {
  formatToolName,
  initialRealtimeUiState,
  realtimePhaseCopy,
  reduceRealtimeUi,
  type RealtimeHistoryItem,
  type RealtimeUiEvent,
} from "@/lib/realtime-ui";
import { DEMO_AGENT_INSTRUCTIONS } from "@/lib/agent";
import { DEMO_VOICE } from "@/lib/voice";
import { useCallback, useMemo, useRef, useState } from "react";
import { z } from "zod";

const MIGRATION_LINES = [
  { kind: "context", text: 'import { OpenAIRealtimeWebSocket, RealtimeSession } from "@openai/agents/realtime";' },
  { kind: "spacer", text: "" },
  { kind: "removed", text: "const session = new RealtimeSession(agent);" },
  { kind: "added", text: 'const session = new RealtimeSession(agent, { transport: new OpenAIRealtimeWebSocket({ url: "/api/realtime?model=together-realtime" }) });' },
  { kind: "spacer", text: "" },
  { kind: "removed", text: 'const secret = await fetch(OPENAI_CLIENT_SECRET_ENDPOINT, { method: "POST" });' },
  { kind: "added", text: 'const secret = await fetch("/api/realtime/client_secrets", { method: "POST" });' },
] as const;

const SERVER_SETUP_LINES = [
  { kind: "file", text: "// lib/realtime.ts" },
  { kind: "context", text: 'import { createRealtimeEngine } from "@together/realtime";' },
  { kind: "spacer", text: "" },
  { kind: "context", text: "export const realtimeEngine = createRealtimeEngine({" },
  { kind: "context", text: "  apiKey: process.env.TOGETHER_API_KEY," },
  { kind: "context", text: "  realtimeSecret: process.env.TOGETHER_REALTIME_SECRET," },
  { kind: "context", text: "  models: {" },
  { kind: "context", text: '    stt: "nvidia/parakeet-tdt-0.6b-v3",' },
  { kind: "context", text: '    realtimeStt: "openai/whisper-large-v3",' },
  { kind: "context", text: '    reply: "nvidia/nemotron-3-ultra-550b-a55b",' },
  { kind: "context", text: '    tts: "cartesia/sonic-3",' },
  { kind: "context", text: "  }," },
  { kind: "context", text: "  replyContextWindowTokens: 262_144," },
  { kind: "context", text: "  maxOutputTokens: 128," },
  { kind: "context", text: '  defaultVoice: "nonfiction man",' },
  { kind: "context", text: "});" },
  { kind: "spacer", text: "" },
  { kind: "file", text: "// app/api/realtime/[[...realtime]]/route.ts" },
  { kind: "context", text: 'import { createNextRealtimeHandlers } from "@together/realtime/next";' },
  { kind: "context", text: 'import { realtimeEngine } from "@/lib/realtime";' },
  { kind: "spacer", text: "" },
  { kind: "context", text: 'export const runtime = "nodejs";' },
  { kind: "context", text: 'export const dynamic = "force-dynamic";' },
  { kind: "context", text: "const handlers = createNextRealtimeHandlers(realtimeEngine);" },
  { kind: "context", text: "export const GET = handlers.GET;" },
  { kind: "context", text: "export const POST = handlers.POST;" },
] as const;

export default function Home() {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const captureRef = useRef<Awaited<ReturnType<typeof startCapture>> | null>(null);
  const playbackRef = useRef<PcmPlayback | null>(null);
  const agent = useMemo(() => new RealtimeAgent({
    name: "Together Voice",
    instructions: DEMO_AGENT_INSTRUCTIONS,
    tools: [tool({
      name: "get_local_time",
      description: "Get the current local time in a requested IANA time zone.",
      parameters: z.object({ timeZone: z.string() }),
      async execute({ timeZone }) {
        sessionRef.current?.transport.sendEvent({
          type: "session.update",
          session: { tool_choice: "none" },
        });
        await new Promise((resolve) => window.setTimeout(resolve, 150));
        return new Intl.DateTimeFormat("en", {
          timeZone,
          dateStyle: "full",
          timeStyle: "long",
        }).format(new Date());
      },
    })],
  }), []);
  const [ui, setUi] = useState(initialRealtimeUiState);
  const [muted, setMuted] = useState(false);
  const [protocolEvents, setProtocolEvents] = useState<string[]>([]);

  const dispatchUi = useCallback((event: RealtimeUiEvent) => {
    setUi((current) => reduceRealtimeUi(current, event));
  }, []);

  const connect = useCallback(async () => {
    if (sessionRef.current) return;
    const smokeMode = new URLSearchParams(window.location.search).get("smoke");
    dispatchUi({ type: "connecting" });
    setProtocolEvents([]);
    const secretResponse = await fetch("/api/realtime/client_secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 120 },
        session: {
          type: "realtime",
          model: "together-realtime",
          audio: {
            input: { turn_detection: { type: "server_vad", create_response: false, interrupt_response: true } },
            output: { voice: DEMO_VOICE },
          },
        },
      }),
    });
    if (!secretResponse.ok) throw new Error(await secretResponse.text());
    const secret = (await secretResponse.json()) as { value: string };
    const transport = new OpenAIRealtimeWebSocket({
      url: "/api/realtime?model=together-realtime",
    });
    let sessionUpdatedCount = 0;
    let resolveToolsReady: (() => void) | null = null;
    const toolsReady = new Promise<void>((resolve) => {
      resolveToolsReady = resolve;
    });
    const session = new RealtimeSession(agent, {
      transport,
      model: "together-realtime" as never,
      tracingDisabled: true,
      config: {
        toolChoice: "none",
        audio: {
          input: {
            format: "pcm16",
            transcription: null,
            turnDetection: { type: "server_vad", createResponse: false, interruptResponse: true },
          },
          output: { format: "pcm16", voice: DEMO_VOICE },
        },
      },
    });
    session.transport.on("*", (event) => {
      const type = (event as { type?: string }).type;
      if (!type) return;
      setProtocolEvents((current) => [...current.slice(-19), type]);
      if (type === "session.updated") {
        sessionUpdatedCount += 1;
        if (sessionUpdatedCount >= 2) resolveToolsReady?.();
      }
      if (
        type === "response.function_call_arguments.done"
      ) {
        session.transport.sendEvent({
          type: "session.update",
          session: { tool_choice: "none" },
        });
      }
      if (type === "conversation.item.input_audio_transcription.completed" && smokeMode !== "turn") {
        const transcript = String((event as { transcript?: unknown }).transcript ?? "");
        session.transport.sendEvent({
          type: "session.update",
          session: { tool_choice: explicitlyRequestsLocalTime(transcript) ? "required" : "none" },
        });
        session.transport.sendEvent({ type: "response.create" });
      }
      if (type === "input_audio_buffer.speech_started") {
        dispatchUi({ type: "speech_started" });
      } else if (type === "input_audio_buffer.speech_stopped") {
        dispatchUi({ type: "speech_stopped" });
      }
    });
    session.on("agent_start", () => dispatchUi({ type: "response_started" }));
    session.on("audio_start", () => dispatchUi({ type: "audio_started" }));
    session.on("audio_stopped", () => dispatchUi({ type: "audio_stopped" }));
    session.on("audio_interrupted", () => dispatchUi({ type: "interrupted" }));
    session.on("history_updated", (history) => {
      dispatchUi({
        type: "history_updated",
        items: history as RealtimeHistoryItem[],
      });
    });
    session.on("agent_tool_start", (_context, _agent, toolDefinition, details) => {
      const call = details.toolCall as { callId?: string; id?: string; arguments?: string };
      dispatchUi({
        type: "tool_started",
        id: call.callId ?? call.id ?? `${toolDefinition.name}-${Date.now()}`,
        name: toolDefinition.name,
        ...(call.arguments ? { input: call.arguments } : {}),
      });
    });
    session.on("agent_tool_end", (_context, _agent, toolDefinition, result, details) => {
      const call = details.toolCall as { callId?: string; id?: string };
      dispatchUi({
        type: "tool_completed",
        id: call.callId ?? call.id ?? toolDefinition.name,
        name: toolDefinition.name,
        output: result,
      });
    });
    playbackRef.current = new PcmPlayback();
    session.on("audio", (event) => playbackRef.current?.push(event.data));
    session.on("error", (event) => {
      dispatchUi({ type: "failed", message: describeError(event.error) });
    });
    await session.connect({ apiKey: secret.value });
    sessionRef.current = session;
    if (smokeMode === "1" || smokeMode === "turn") {
      dispatchUi({ type: "connected" });
      if (smokeMode === "turn") {
        await Promise.race([toolsReady, delay(2_000)]);
        setProtocolEvents((current) => [...current.slice(-19), "smoke.turn.sent"]);
        session.transport.sendEvent({
          type: "session.update",
          session: { tool_choice: "required" },
        });
        session.transport.sendEvent({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "What time is it in Tokyo?" }],
          },
        });
        session.transport.sendEvent({ type: "response.create" });
      }
      return;
    }
    try {
      captureRef.current = await startCapture((audio) => {
        if (!muted) session.sendAudio(audio);
      });
      dispatchUi({ type: "connected" });
    } catch (error) {
      session.close();
      sessionRef.current = null;
      playbackRef.current?.close();
      playbackRef.current = null;
      throw error;
    }
  }, [dispatchUi, muted]);

  const disconnect = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    playbackRef.current?.close();
    playbackRef.current = null;
    sessionRef.current?.close();
    sessionRef.current = null;
    dispatchUi({ type: "disconnected" });
  }, [dispatchUi]);

  const phaseCopy = muted && sessionRef.current
    ? { label: "Muted", detail: "Your microphone is paused." }
    : realtimePhaseCopy[ui.phase];
  const isConnected = Boolean(sessionRef.current);
  const isConnecting = ui.phase === "connecting";

  return (
    <main>
      <section className="demo-column">
        <section className="hero">
        <div className="eyebrow">
          <img className="together-logo" src="/together-logo.svg" alt="Together AI" />
          <span>Realtime voice demo</span>
        </div>
        <h1>Run your OpenAI voice agent on Together.</h1>
        <p className="lede">Keep <code>@openai/agents/realtime</code>, your agent, and every tool. Swap the transport and client-secret endpoint.</p>
        <section
          className={`live-state phase-${ui.phase}${ui.userSpeaking ? " user-speaking" : ""}`}
          aria-live="polite"
          aria-label="Voice session status"
        >
          <div className="voice-orb" aria-hidden="true"><span /></div>
          <div>
            <strong>{phaseCopy.label}</strong>
            <p>{phaseCopy.detail}</p>
          </div>
        </section>
        <div className="controls">
          {!isConnected ? (
            <button className="control-button primary" disabled={isConnecting} onClick={() => void connect().catch((error) => dispatchUi({ type: "failed", message: describeError(error) }))}>
              <AudioWaveIcon />
              <span>{isConnecting ? "Connecting…" : "Connect"}</span>
            </button>
          ) : (
            <button className="control-button primary live" onClick={disconnect}>
              <StopIcon />
              <span>Disconnect</span>
            </button>
          )}
          <button
            className={`control-button mute-control${muted ? " is-muted" : ""}`}
            onClick={() => setMuted((value) => !value)}
            disabled={!sessionRef.current}
            aria-pressed={muted}
          >
            {muted ? <MicrophoneLevelIcon /> : <MutedIcon />}
            <span>{muted ? "Unmute" : "Mute"}</span>
          </button>
        </div>
        </section>
        <aside>
        <div className={`status phase-${ui.phase}`}><span className="dot" />{phaseCopy.label}</div>
        <h2>Conversation</h2>
        <div className="conversation" aria-live="polite">
          {ui.timeline.length === 0 ? (
            <p className="empty-conversation">Your speech, replies, and tool calls will appear here.</p>
          ) : ui.timeline.map((item) => item.type === "message" ? (
            <div className={`message ${item.role}`} key={`${item.type}-${item.id}`}>
              <span>{item.role === "user" ? "You" : "Together"}</span>
              <p>{item.text}</p>
            </div>
          ) : (
            <div className={`tool-activity ${item.status}`} key={`${item.type}-${item.id}`}>
              <span className="tool-icon" aria-hidden="true">↗</span>
              <div>
                <strong>{formatToolName(item.name)}</strong>
                <p>{item.status === "running" ? "Tool is running…" : "Tool completed"}</p>
              </div>
              <span className="tool-status" aria-label={item.status} />
            </div>
          ))}
        </div>
        {ui.error ? <p className="session-error">{ui.error}</p> : null}
        <p className="hint">Try: “What time is it in Tokyo?” When a tool runs, it appears here before the spoken reply.</p>
        <details className="protocol-details">
          <summary>Technical event log</summary>
          <div className="log">
            {protocolEvents.length === 0 ? <p>No events yet.</p> : protocolEvents.map((event, index) => <code key={`${event}-${index}`}>{event}</code>)}
          </div>
        </details>
        </aside>
      </section>
      <section className="code-column" aria-label="Integration code">
        <div className="code-column-heading">
          <span>Integration</span>
          <h2>Use your existing OpenAI agent.</h2>
          <p>Point the client at Together, then configure the server-side realtime pipeline.</p>
        </div>
        <section className="code-change" aria-labelledby="code-change-title">
          <div className="code-change-header">
            <div>
              <span className="code-kicker">2-line client migration</span>
              <strong id="code-change-title">Point two calls at Together</strong>
            </div>
            <span className="language-badge">TypeScript</span>
          </div>
          <pre aria-label="TypeScript migration diff"><code>{MIGRATION_LINES.map((line, index) => (
            <span className={`code-line ${line.kind}`} aria-hidden={line.kind === "spacer" || undefined} key={`${line.kind}-${index}`}>
              <span className="diff-mark">{line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " "}</span>
              <span>{line.text}</span>
            </span>
          ))}</code></pre>
        </section>
        <section className="code-change server-setup" aria-labelledby="server-setup-title">
          <div className="code-change-header">
            <div>
              <span className="code-kicker">Required server setup</span>
              <strong id="server-setup-title">Configure models and expose one catch-all route</strong>
            </div>
            <span className="language-badge">Next.js</span>
          </div>
          <pre aria-label="Together realtime server setup"><code>{SERVER_SETUP_LINES.map((line, index) => (
            <span className={`code-line ${line.kind}`} aria-hidden={line.kind === "spacer" || undefined} key={`${line.kind}-${index}`}>
              <span className="diff-mark"> </span>
              <span>{line.text}</span>
            </span>
          ))}</code></pre>
        </section>
      </section>
    </main>
  );
}

function AudioWaveIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 8v4M6.25 5v10M10 2.5v15M13.75 6v8M17.5 8.5v3" /></svg>;
}

function MicrophoneLevelIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="2" width="6" height="10" rx="3" /><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v3M7 18h6" /></svg>;
}

function MutedIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 7V5a3 3 0 0 1 5.7-1.3M13 8v1.5a3 3 0 0 1-.4 1.5M4.5 9.5a5.5 5.5 0 0 0 8.7 4.5M10 15v3M7 18h6M3 3l14 14" /></svg>;
}

function StopIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="5" width="10" height="10" rx="1.5" /></svg>;
}

function describeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "The realtime session failed.";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function explicitlyRequestsLocalTime(transcript: string) {
  return /\b(?:what time|current time|local time|che ore|che ora|quelle heure|qué hora|que horas|wie spät|wie viel uhr)\b/iu.test(transcript);
}

async function startCapture(onAudio: (audio: ArrayBuffer) => void) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const context = new AudioContext({ latencyHint: "interactive" });
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(2048, 1, 1);
  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const ratio = context.sampleRate / 24000;
    const output = new Int16Array(Math.floor(input.length / ratio));
    for (let index = 0; index < output.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, input[Math.floor(index * ratio)] ?? 0));
      output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    onAudio(output.buffer);
  };
  source.connect(processor);
  processor.connect(context.destination);
  return {
    stop() {
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    },
  };
}

class PcmPlayback {
  private readonly context = new AudioContext({ sampleRate: 24000, latencyHint: "interactive" });
  private cursor = 0;

  push(data: ArrayBuffer) {
    const pcm = new Int16Array(data);
    const buffer = this.context.createBuffer(1, pcm.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < pcm.length; index += 1) channel[index] = (pcm[index] ?? 0) / 32768;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    this.cursor = Math.max(this.cursor, this.context.currentTime);
    source.start(this.cursor);
    this.cursor += buffer.duration;
  }

  close() {
    void this.context.close();
  }
}
