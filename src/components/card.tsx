type Props = {
  title: string;
  value: string | number;
  hint?: string;
};

export default function Card({ title, value, hint }: Props) {
  return (
    <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)] p-4 shadow-sm">
      <div className="text-sm text-[var(--st-muted)]">{title}</div>
      <div className="mt-1 text-3xl font-semibold text-[var(--st-fg)]">{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--st-muted)]">{hint}</div>}
    </div>
  );
}
