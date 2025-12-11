import { FC } from "react";

type SessionConfigProps = {
  onStart?: () => void;
};

const options = {
  session: ["Oral Argument", "Moot Court", "Witness Prep"],
  side: ["Appellant", "Appellee"],
  cadence: ["Measured", "Conversational", "Rapid"],
};

export const SessionConfig: FC<SessionConfigProps> = ({ onStart }) => {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Session setup</p>
          <p className="text-xs text-[var(--muted)]">Define the run before you start recording.</p>
        </div>
        <button
          onClick={onStart}
          className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
        >
          Start debate
        </button>
      </div>
      <div className="flex flex-col gap-6">
        {Object.entries(options).map(([label, values]) => (
          <div key={label} className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => (
                <button
                  key={value}
                  className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent-strong)] hover:text-[var(--accent-strong)]"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
