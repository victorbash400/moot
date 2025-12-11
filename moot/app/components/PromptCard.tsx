import { FC } from "react";

type PromptCardProps = {
  prompt: string;
  onRefresh?: () => void;
};

export const PromptCard: FC<PromptCardProps> = ({ prompt, onRefresh }) => {
  return (
    <section className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 shadow-sm">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          Active prompt
        </div>
        <button
          onClick={onRefresh}
          className="text-xs font-medium text-[var(--accent-strong)] underline-offset-4 hover:underline"
        >
          New prompt
        </button>
      </div>
      <p className="text-xl leading-relaxed text-[var(--foreground)]">{prompt}</p>
    </section>
  );
};
