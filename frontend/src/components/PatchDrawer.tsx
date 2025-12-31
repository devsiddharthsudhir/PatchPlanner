import { X } from "lucide-react";
import type { Patch, ScheduledPatch } from "../lib/api";

type Props = {
  open: boolean;
  patch?: Patch;
  scheduled?: ScheduledPatch;
  deferredNotes?: string[];
  onClose: () => void;
};

export default function PatchDrawer({ open, patch, scheduled, deferredNotes, onClose }: Props) {
  if (!open || !patch) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg border-l border-zinc-800 bg-zinc-950 p-5 overflow-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{patch.name}</div>
            <div className="text-sm text-zinc-300">{patch.asset} • {patch.cve}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-800 p-2 hover:bg-zinc-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-zinc-800 p-3">
            <div className="text-zinc-400 text-xs">CVSS</div>
            <div className="font-semibold">{patch.cvss.toFixed(1)}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 p-3">
            <div className="text-zinc-400 text-xs">Exploit likelihood</div>
            <div className="font-semibold">{patch.epss_like.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 p-3">
            <div className="text-zinc-400 text-xs">Downtime</div>
            <div className="font-semibold">{patch.downtime_minutes} min</div>
          </div>
          <div className="rounded-xl border border-zinc-800 p-3">
            <div className="text-zinc-400 text-xs">Eng. cost</div>
            <div className="font-semibold">{patch.eng_cost.toFixed(1)}</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800 p-3">
          <div className="text-zinc-400 text-xs">Dependencies</div>
          <div className="mt-1 text-sm">
            {patch.depends_on.length ? patch.depends_on.join(", ") : "None"}
          </div>
        </div>

        {scheduled ? (
          <>
            <div className="mt-4 rounded-xl border border-zinc-800 p-3">
              <div className="text-zinc-400 text-xs">Objective contribution</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>Risk reduction: <span className="font-semibold">{scheduled.score.risk_reduction.toFixed(1)}</span></div>
                <div>Outage risk: <span className="font-semibold">{scheduled.score.outage_risk.toFixed(1)}</span></div>
                <div>Cost: <span className="font-semibold">{scheduled.score.eng_cost.toFixed(1)}</span></div>
                <div>Weighted total: <span className="font-semibold">{scheduled.score.weighted_total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 p-3">
              <div className="text-zinc-400 text-xs">Why this patch first?</div>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-zinc-200">
                {scheduled.why.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </>

) : (
  <div className="mt-4 rounded-xl border border-zinc-800 p-3 text-sm text-zinc-300">
    This patch is currently <span className="font-semibold">deferred</span> under the chosen trade-offs and window budgets.
    {deferredNotes?.length ? (
      <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-zinc-200">
        {deferredNotes.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
    ) : null}
  </div>
)}
      </div>
    </div>
  );
}
