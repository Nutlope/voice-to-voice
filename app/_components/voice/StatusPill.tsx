export function VoiceStatusPill({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-6">
      <p className="whitespace-nowrap text-[15px] font-medium leading-none text-[#58496c]">
        {label}
      </p>
    </div>
  );
}
