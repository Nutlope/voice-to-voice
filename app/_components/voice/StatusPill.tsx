export function VoiceStatusPill({
  label,
  micLive = false,
}: {
  label: string;
  micLive?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-6">
      <p className="flex items-center gap-2 whitespace-nowrap text-[13px] font-medium leading-none text-[#58496c]">
        {micLive ? <span className="voice-live-dot" aria-hidden /> : null}
        {label}
        {micLive ? <span className="sr-only">Microphone on</span> : null}
      </p>
    </div>
  );
}
