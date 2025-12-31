import type { MaintenanceWindow, Patch, ScheduledPatch } from "../lib/api";
import PatchCard from "./PatchCard";

type Props = {
  windows: MaintenanceWindow[];
  patchesById: Record<string, Patch>;
  scheduled: ScheduledPatch[];
  onOpenPatch: (patchId: string) => void;
};

export default function ScheduleBoard({ windows, patchesById, scheduled, onOpenPatch }: Props) {
  const byWindow: Record<string, ScheduledPatch[]> = {};
  for (const s of scheduled) {
    byWindow[s.window_id] = byWindow[s.window_id] ?? [];
    byWindow[s.window_id].push(s);
  }
  for (const w of windows) {
    byWindow[w.id] = (byWindow[w.id] ?? []).sort((a, b) => a.order_in_window - b.order_in_window);
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {windows.map((w) => (
        <div key={w.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="font-semibold">{w.title}</div>
          <div className="text-xs text-zinc-400 mt-1">
            Budget: {w.downtime_budget_minutes}m downtime • {w.eng_cost_budget.toFixed(1)} cost
          </div>

          <div className="mt-3 space-y-3">
            {byWindow[w.id].length ? (
              byWindow[w.id].map((s) => {
                const p = patchesById[s.patch_id];
                if (!p) return null;
                return (
                  <div key={s.patch_id} className="relative">
                    <div className="absolute -left-2 -top-2 text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700">
                      #{s.order_in_window}
                    </div>
                    <PatchCard patch={p} badge="Scheduled" onOpen={() => onOpenPatch(p.id)} />
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-zinc-400 border border-dashed border-zinc-800 rounded-xl p-3">
                No patches scheduled in this window.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
