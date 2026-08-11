import { detectAll } from "tinyld";

const SUPPORTED_SPEECH_LANGUAGES = new Set([
  "ar", "bg", "cs", "da", "de", "el", "en", "es", "fi", "fr", "he", "hi", "hr", "hu", "id", "it",
  "ja", "ko", "nl", "no", "pl", "pt", "ro", "ru", "sk", "sv", "th", "tr", "uk", "vi", "zh",
]);

const SHORT_LANGUAGE_HINTS: Array<[language: string, pattern: RegExp]> = [
  ["it", /\b(?:ciao|buongiorno|buonasera|grazie|sì|vorrei|posso|puoi|come|cosa|quale|quanto|oggi|stasera)\b/iu],
  ["en", /\b(?:hello|hi|thanks|yes|please|what|when|where|which|how|today|tonight)\b/iu],
  ["es", /\b(?:hola|gracias|sí|quiero|puedes|cómo|qué|cuál|hoy|esta noche)\b/iu],
  ["fr", /\b(?:bonjour|salut|merci|oui|voudrais|pouvez|comment|quoi|quel|aujourd'hui|ce soir)\b/iu],
  ["de", /\b(?:hallo|danke|ja|möchte|kannst|wie|was|welche|heute|heute abend)\b/iu],
  ["pt", /\b(?:olá|obrigado|sim|quero|pode|como|qual|hoje|esta noite)\b/iu],
];

export function detectSpeechLanguage(text: string, fallback = "en") {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  for (const [language, pattern] of SHORT_LANGUAGE_HINTS) {
    if (pattern.test(trimmed)) return language;
  }
  const candidate = detectAll(trimmed).find(
    ({ lang, accuracy }) => SUPPORTED_SPEECH_LANGUAGES.has(lang) && accuracy >= 0.02,
  );
  return candidate?.lang ?? fallback;
}
