import { FC } from "react";

type TopNavProps = {
  status?: string;
  matter?: string;
};

export const TopNav: FC<TopNavProps> = ({ status = "Voice ready", matter = "Session draft" }) => {
  return (
    <header className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--foreground)] text-sm font-semibold text-[var(--panel)] shadow-sm">
          Moot
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-[var(--foreground)]">Moot Workbench</p>
          <p className="text-xs text-[var(--muted)]">Matter · {matter}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-3 py-1 text-[var(--muted)] backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-strong)]" aria-hidden />
          {status}
        </div>
        <button className="rounded-full border border-[var(--line)] bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent-strong)] hover:text-[var(--accent-strong)]">
          Export notes
        </button>
      </div>
    </header>
  );
};
