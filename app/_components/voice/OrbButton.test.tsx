import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VoiceOrbButton } from "./OrbButton";

test("compacts the orb when chat content needs more room", () => {
  const markup = renderToStaticMarkup(
    <VoiceOrbButton phase="listening" activity={0} compact disabled />,
  );

  expect(markup).toContain("voice-orb-button-compact");
});
