import { AlertTriangle, ArrowRight, Bug, DollarSign, Shield, Timer } from "lucide-react";
import type { Patch } from "../lib/api";

type Props = {
  patch: Patch;
  onOpen: () => void;
  badge?: string;
};

export default function PatchCard({ patch, onOpen, badge }: Props) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-zinc-200" />
            <div className="font-semibold truncate">{patch.name}</div>
            {patch.kev && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-200 border border-red-900/40">
                KEV
              </span>
            )}
            {badge && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-700/30 text-zinc-200 border border-zinc-700">
                {badge}
              </span>
            )}
          </div>
          <div className="text-sm text-zinc-300 truncate">
            {patch.asset} • {patch.cve}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-400 mt-1 shrink-0" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <Bug className="h-3.5 w-3.5" />
          CVSS {patch.cvss.toFixed(1)}
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          EPSS {patch.epss_like.toFixed(2)}
        </div>
        <div className="flex items-center gap-2">
          <Timer className="h-3.5 w-3.5" />
          {patch.downtime_minutes}m downtime
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5" />
          {patch.eng_cost.toFixed(1)} cost
        </div>
      </div>
    </button>
  );
}
