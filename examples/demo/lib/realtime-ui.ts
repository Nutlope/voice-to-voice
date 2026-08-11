export type RealtimePhase =
  | "disconnected"
  | "connecting"
  | "listening"
  | "thinking"
  | "tool"
  | "speaking"
  | "failed";

export type RealtimeTimelineItem =
  | {
      id: string;
      type: "message";
      role: "user" | "assistant";
      text: string;
    }
  | {
      id: string;
      type: "tool";
      name: string;
      status: "running" | "completed" | "failed";
      input?: string;
      output?: string;
    };

type HistoryContent = {
  type?: string;
  text?: string | null;
  transcript?: string | null;
};

export type RealtimeHistoryItem = {
  itemId?: string;
  type?: string;
  role?: string;
  content?: HistoryContent[];
};

export type RealtimeUiState = {
  phase: RealtimePhase;
  userSpeaking: boolean;
  timeline: RealtimeTimelineItem[];
  error: string | null;
};

export type RealtimeUiEvent =
  | { type: "connecting" }
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "speech_started" }
  | { type: "speech_stopped" }
  | { type: "response_started" }
  | { type: "audio_started" }
  | { type: "audio_stopped" }
  | { type: "interrupted" }
  | { type: "failed"; message: string }
  | {
      type: "tool_started";
      id: string;
      name: string;
      input?: string;
    }
  | {
      type: "tool_completed";
      id: string;
      name: string;
      output?: string;
    }
  | { type: "history_updated"; items: RealtimeHistoryItem[] };

export const initialRealtimeUiState: RealtimeUiState = {
  phase: "disconnected",
  userSpeaking: false,
  timeline: [],
  error: null,
};

export const realtimePhaseCopy: Record<
  RealtimePhase,
  { label: string; detail: string }
> = {
  disconnected: {
    label: "Ready to talk",
    detail: "Connect your microphone to start a realtime conversation.",
  },
  connecting: {
    label: "Connecting",
    detail: "Opening a secure realtime session…",
  },
  listening: {
    label: "Listening",
    detail: "Speak naturally. I’ll respond when you finish.",
  },
  thinking: {
    label: "Thinking",
    detail: "Preparing a response…",
  },
  tool: {
    label: "Using a tool",
    detail: "Checking live information before replying…",
  },
  speaking: {
    label: "Replying",
    detail: "Streaming the answer now.",
  },
  failed: {
    label: "Connection failed",
    detail: "End the session and try connecting again.",
  },
};

const MAX_TIMELINE_ITEMS = 18;

export function reduceRealtimeUi(
  state: RealtimeUiState,
  event: RealtimeUiEvent,
): RealtimeUiState {
  switch (event.type) {
    case "connecting":
      return { ...state, phase: "connecting", userSpeaking: false, error: null };
    case "connected":
      return { ...state, phase: "listening", userSpeaking: false, error: null };
    case "disconnected":
      return { ...state, phase: "disconnected", userSpeaking: false };
    case "speech_started":
      return { ...state, phase: "listening", userSpeaking: true };
    case "speech_stopped":
      return { ...state, userSpeaking: false };
    case "response_started":
      return { ...state, phase: "thinking", userSpeaking: false };
    case "audio_started":
      return { ...state, phase: "speaking", userSpeaking: false };
    case "audio_stopped":
    case "interrupted":
      return { ...state, phase: "listening", userSpeaking: false };
    case "failed":
      return { ...state, phase: "failed", userSpeaking: false, error: event.message };
    case "tool_started":
      return {
        ...state,
        phase: "tool",
        timeline: upsertTimelineItem(state.timeline, {
          id: event.id,
          type: "tool",
          name: event.name,
          status: "running",
          ...(event.input ? { input: event.input } : {}),
        }),
      };
    case "tool_completed":
      return {
        ...state,
        phase: "thinking",
        timeline: upsertTimelineItem(state.timeline, {
          id: event.id,
          type: "tool",
          name: event.name,
          status: "completed",
          ...(event.output ? { output: event.output } : {}),
        }),
      };
    case "history_updated":
      return {
        ...state,
        timeline: event.items.reduce((timeline, item) => {
          const message = historyItemToMessage(item);
          return message ? upsertTimelineItem(timeline, message) : timeline;
        }, state.timeline),
      };
  }
}

function historyItemToMessage(
  item: RealtimeHistoryItem,
): Extract<RealtimeTimelineItem, { type: "message" }> | null {
  if (
    item.type !== "message" ||
    (item.role !== "user" && item.role !== "assistant")
  ) {
    return null;
  }

  const text = (item.content ?? [])
    .map((content) => content.transcript ?? content.text ?? "")
    .join(" ")
    .trim();
  if (!text) return null;

  return {
    id: item.itemId ?? `${item.role}-${text}`,
    type: "message",
    role: item.role,
    text,
  };
}

function upsertTimelineItem(
  timeline: RealtimeTimelineItem[],
  item: RealtimeTimelineItem,
) {
  const existing = timeline.findIndex(
    (candidate) => candidate.type === item.type && candidate.id === item.id,
  );
  const next = timeline.slice();
  if (existing >= 0) {
    next[existing] = { ...next[existing], ...item } as RealtimeTimelineItem;
  } else {
    next.push(item);
  }
  return next.slice(-MAX_TIMELINE_ITEMS);
}

export function formatToolName(name: string) {
  if (name === "get_local_time") return "Checking the local time";
  return name.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
