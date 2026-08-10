import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VoiceStatusPill } from "./StatusPill";

test("renders the status as one shadowless floating line with live mic feedback", () => {
  const markup = renderToStaticMarkup(<VoiceStatusPill label="Listening" micLive />);

  expect(markup).toContain("Listening");
  expect(markup).toContain("Microphone on");
  expect(markup).toContain("voice-live-dot");
  expect(markup).toContain("whitespace-nowrap");
  expect(markup).toContain("absolute inset-0");
  expect(markup).not.toContain("shadow");
  expect(markup).not.toContain("Live");
});
