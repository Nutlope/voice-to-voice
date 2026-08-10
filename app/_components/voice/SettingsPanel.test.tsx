import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VoiceSettingsPanel } from "./SettingsPanel";

test("shows the listen and reply models while keeping voice output separate", () => {
  const markup = renderToStaticMarkup(<VoiceSettingsPanel />);

  expect(markup).toContain("One model listens, another writes the reply.");
  expect(markup).toContain("Listen");
  expect(markup).toContain("Reply");
  expect(markup).toContain("Parakeet / Whisper");
  expect(markup).toContain("Nemotron Ultra / MiniMax M2.7");
  expect(markup).toContain("Sonic 3 / Kokoro");
  expect(markup).not.toContain("Inkling");
  expect(markup).toContain("Debug");
  expect(markup).toContain('aria-expanded="false"');
  expect(markup).not.toContain("Compare speech-to-text");
  expect(markup).not.toContain("Copy session log");
});
