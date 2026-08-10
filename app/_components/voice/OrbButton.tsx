import type { VoiceOrbPhase } from "./types";
import { RiemannTukeyVoiceOrb } from "@/app/orbs/RehoboamOrbLab";

export function VoiceOrbButton({
  phase,
  activity,
  compact = false,
  disabled = false,
  onClick,
}: {
  phase: VoiceOrbPhase;
  activity: number;
  compact?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`voice-orb-button ${compact ? "voice-orb-button-compact" : ""}`}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Start voice chat"
      title={disabled ? undefined : "Start voice chat"}
    >
      <RiemannTukeyVoiceOrb phase={phase} activity={activity} />
    </button>
  );
}
