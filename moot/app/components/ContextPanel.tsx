import { FC } from "react";

type ContextPanelProps = {
  placeholder?: string;
};

export const ContextPanel: FC<ContextPanelProps> = ({
  placeholder = "Add facts, posture, relief sought, and constraints.",
}) => {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--foreground)]">Context</p>
        <span className="text-xs text-[var(--muted)]">Visible to both sides</span>
      </div>
      <textarea
        rows={4}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-strong)]"
      />
      <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
        <span className="rounded-full border border-[var(--line)] px-3 py-1">Issue spotting</span>
        <span className="rounded-full border border-[var(--line)] px-3 py-1">Standards of review</span>
        <span className="rounded-full border border-[var(--line)] px-3 py-1">Relief requested</span>
      </div>
    </section>
  );
};
