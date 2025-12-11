import { FC } from "react";

export const Instructions: FC = () => {
  const steps = [
    "State the issue in one sentence",
    "Deliver argument for your side",
    "Cite controlling authority",
    "Voice objections or counterpoints",
    "Conclude with requested relief",
  ];

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--foreground)]">Flow</p>
        <span className="text-xs text-[var(--muted)]">Hands-free friendly</span>
      </div>
      <ol className="space-y-2 text-sm text-[var(--foreground)]">
        {steps.map((step, idx) => (
          <li key={step} className="flex items-start gap-3">
            <span className="mt-[2px] h-5 w-5 rounded-full bg-[var(--line)] text-center text-xs font-semibold text-[var(--muted)]">
              {idx + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};
