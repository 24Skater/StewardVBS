"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@steward-apps/ui";

type Props = {
  categories: Array<{ name: string }>;
};

export default function CheckinControls({ categories }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const category = sp.get("category") ?? "";

  // update the URL (and re-render server) when q or category changes
  function update(next: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    startTransition(() => router.push(`/checkin?${params.toString()}`));
  }

  // small debounce for search typing
  useEffect(() => {
    const t = setTimeout(() => update({ q }), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="block text-sm text-[var(--st-muted)]">Search name</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type to search…"
          autoFocus
          className="mt-1 w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] px-3 py-3 text-lg"
        />
      </div>

      <div>
        <label className="block text-sm text-[var(--st-muted)]">Category</label>
        <select
          className="mt-1 w-48 rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] px-3 py-3"
          defaultValue={category}
          onChange={(e) => update({ category: e.target.value })}
        >
          <option value="">All</option>
          {categories.map((cat) => (
            <option key={cat.name} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <Button
        variant="outline"
        onClick={() => {
          setQ("");
          update({ q: "", category: "" });
        }}
        disabled={pending}
      >
        Reset
      </Button>
    </div>
  );
}
