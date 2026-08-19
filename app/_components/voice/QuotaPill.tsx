import type { VoiceQuota } from "@/app/_hooks/useVoiceConversation";

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes <= 0) return `${rest}s`;
  return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
}

export function VoiceQuotaPill({ quota }: { quota: VoiceQuota }) {
  const exhausted = quota.remainingSeconds <= 0;
  return (
    <div
      className="pointer-events-none absolute right-0 top-0 z-20"
      data-testid="voice-quota-pill"
    >
      <p
        className={`rounded-full px-3 py-1.5 text-[12px] font-medium leading-none shadow-[0_0_0_1px_rgba(5,5,5,0.08),0_2px_8px_rgba(5,5,5,0.06)] backdrop-blur-xl ${
          exhausted
            ? "bg-[#fff1ec] text-[#c54718]"
            : "bg-white/80 text-[#58496c]"
        }`}
        title={`${quota.remainingCalls} of ${quota.limitCalls} free calls left today`}
      >
        {exhausted
          ? "Free minutes used up"
          : `${formatRemaining(quota.remainingSeconds)} free left today`}
      </p>
    </div>
  );
}
