import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VoiceStatusPill } from "./StatusPill";

test("renders the status as one shadowless floating line", () => {
  const markup = renderToStaticMarkup(<VoiceStatusPill label="I’m listening…" />);

  expect(markup).toContain("I’m listening…");
  expect(markup).toContain("whitespace-nowrap");
  expect(markup).toContain("absolute inset-0");
  expect(markup).not.toContain("shadow");
  expect(markup).not.toContain("Live");
});
