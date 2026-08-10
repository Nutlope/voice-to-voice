import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VoiceBrandHeader } from "./BrandHeader";

test("links to the source repository from the voice header", () => {
  const markup = renderToStaticMarkup(<VoiceBrandHeader />);

  expect(markup).toContain(
    'href="https://github.com/riccardogiorato/voice-to-voice"',
  );
  expect(markup).toContain('target="_blank"');
  expect(markup).toContain('aria-label="View source on GitHub"');
});
