import Image from "next/image";
import { SettingsToggleButton } from "./SettingsToggleButton";

export function VoiceBrandHeader({
  settingsOpen = false,
  onSettingsClick,
}: {
  settingsOpen?: boolean;
  onSettingsClick?: () => void;
}) {
  return (
    <header className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2.5">
        <Image
          className="h-6 w-[110px] object-contain object-left"
          src="/together-logo.svg"
          alt="Together AI"
          width={110}
          height={24}
          priority
        />
        <span className="h-4 w-px bg-[#050505]/14" aria-hidden />
        <span className="text-sm font-semibold tracking-tight text-[#050505]/78">
          Voice
        </span>
      </div>
      <div className="flex items-center gap-2">
        <a
          className="grid size-10 place-items-center rounded-full bg-white text-[#050505]/70 shadow-[0_0_0_1px_rgba(5,5,5,0.08),0_2px_8px_rgba(5,5,5,0.06)] transition-[box-shadow,scale] duration-150 hover:shadow-[0_0_0_1px_rgba(5,5,5,0.12),0_3px_12px_rgba(5,5,5,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#050505]/70 active:scale-[0.96]"
          href="https://github.com/riccardogiorato/voice-to-voice"
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
          title="View source on GitHub"
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18A11 11 0 0 1 12 6.12c.98 0 1.95.13 2.87.39 2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.71 5.38-5.29 5.67.42.36.79 1.06.79 2.14v3.27c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
          </svg>
        </a>
        <SettingsToggleButton open={settingsOpen} onClick={onSettingsClick} />
      </div>
    </header>
  );
}
