import assert from "node:assert/strict";
import {
  initialRealtimeUiState,
  reduceRealtimeUi,
} from "./realtime-ui";

function testCompleteVoiceTurnAndToolCall() {
    let state = reduceRealtimeUi(initialRealtimeUiState, { type: "connected" });
    assert.equal(state.phase, "listening");

    state = reduceRealtimeUi(state, { type: "response_started" });
    assert.equal(state.phase, "thinking");

    state = reduceRealtimeUi(state, {
      type: "tool_started",
      id: "call-1",
      name: "get_local_time",
      input: '{"timeZone":"Asia/Tokyo"}',
    });
    assert.equal(state.phase, "tool");
    assert.deepEqual(state.timeline.at(-1), {
      id: "call-1",
      type: "tool",
      name: "get_local_time",
      status: "running",
      input: '{"timeZone":"Asia/Tokyo"}',
    });

    state = reduceRealtimeUi(state, {
      type: "tool_completed",
      id: "call-1",
      name: "get_local_time",
      output: "Wednesday, 10:30 AM",
    });
    assert.equal(state.phase, "thinking");
    const completedTool = state.timeline.at(-1);
    assert.equal(completedTool?.type, "tool");
    assert.equal(completedTool?.type === "tool" ? completedTool.status : undefined, "completed");

    state = reduceRealtimeUi(state, { type: "audio_started" });
    assert.equal(state.phase, "speaking");

    state = reduceRealtimeUi(state, {
      type: "history_updated",
      items: [
        {
          itemId: "user-1",
          type: "message",
          role: "user",
          content: [{ type: "input_audio", transcript: "What time is it in Tokyo?" }],
        },
        {
          itemId: "assistant-1",
          type: "message",
          role: "assistant",
          content: [{ type: "output_audio", transcript: "It is 10:30 AM in Tokyo." }],
        },
      ],
    });
    assert.ok(
      state.timeline.some(
        (item) => item.type === "message" && item.role === "user" && item.text === "What time is it in Tokyo?",
      ),
    );
    assert.ok(
      state.timeline.some(
        (item) => item.type === "message" && item.role === "assistant" && item.text === "It is 10:30 AM in Tokyo.",
      ),
    );

    state = reduceRealtimeUi(state, { type: "audio_stopped" });
    assert.equal(state.phase, "listening");
}

function testSpeechDetectionAndInterruption() {
    let state = reduceRealtimeUi(initialRealtimeUiState, { type: "connected" });
    state = reduceRealtimeUi(state, { type: "response_started" });
    state = reduceRealtimeUi(state, { type: "audio_started" });
    state = reduceRealtimeUi(state, { type: "speech_started" });

    assert.equal(state.phase, "listening");
    assert.equal(state.userSpeaking, true);

    state = reduceRealtimeUi(state, { type: "speech_stopped" });
    assert.equal(state.userSpeaking, false);
}

testCompleteVoiceTurnAndToolCall();
testSpeechDetectionAndInterruption();
console.log("Realtime UI lifecycle tests passed.");
