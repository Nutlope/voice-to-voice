import { describe, expect, it } from "vitest";
import { detectSpeechLanguage } from "../src/language.js";

describe("speech language detection", () => {
  it.each([
    ["Ciao!", "it"],
    ["Che tempo fa a Roma oggi?", "it"],
    ["Vorrei prenotare un tavolo per due persone stasera.", "it"],
    ["Hello!", "en"],
    ["What is the weather in Rome today?", "en"],
    ["Bonjour, comment ça va?", "fr"],
    ["Hola, ¿qué tiempo hace hoy?", "es"],
  ])("detects %s as %s", (text, language) => {
    expect(detectSpeechLanguage(text)).toBe(language);
  });

  it("uses the supplied fallback when a short phrase is ambiguous", () => {
    expect(detectSpeechLanguage("OK", "it")).toBe("it");
  });
});
