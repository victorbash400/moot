import { FC } from "react";

type Citation = {
  title: string;
  cite: string;
  note?: string;
};

type CitationsPanelProps = {
  items: Citation[];
};

export const CitationsPanel: FC<CitationsPanelProps> = ({ items }) => {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--foreground)]">Citations</p>
        <span className="text-xs text-[var(--muted)]">Minimal view</span>
      </div>
      <div className="space-y-3 text-sm text-[var(--foreground)]">
        {items.map((item) => (
          <div key={item.cite} className="rounded-xl border border-[var(--line)] px-3 py-2">
            <p className="font-semibold">{item.title}</p>
            <p className="text-xs text-[var(--muted)]">{item.cite}</p>
            {item.note && <p className="text-xs text-[var(--foreground)]">{item.note}</p>}
          </div>
        ))}
      </div>
    </section>
  );
};
