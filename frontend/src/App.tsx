import { useEffect, useMemo, useState } from "react";
import { api, type MaintenanceWindow, type Patch, type OptimizeResponse, type ScheduledPatch } from "./lib/api";
import WeightSlider from "./components/WeightSlider";
import ScheduleBoard from "./components/ScheduleBoard";
import PatchCard from "./components/PatchCard";
import PatchDrawer from "./components/PatchDrawer";
import ScenarioPresets from "./components/ScenarioPresets";
import { Loader2 } from "lucide-react";

function normalizeWeights(risk: number, cost: number, outage: number) {
  const s = risk + cost + outage;
  if (s <= 0) return { risk: 1/3, cost: 1/3, outage: 1/3 };
  return { risk: risk / s, cost: cost / s, outage: outage / s };
}

export default function App() {
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const patchesById = useMemo(() => Object.fromEntries(patches.map(p => [p.id, p])), [patches]);

  // sliders 0..100
  const [riskW, setRiskW] = useState(60);
  const [costW, setCostW] = useState(20);
  const [outageW, setOutageW] = useState(20);

  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);

  const selectedPatch = selectedPatchId ? patchesById[selectedPatchId] : undefined;
  const scheduledMap = useMemo(() => {
    const m: Record<string, ScheduledPatch> = {};
    for (const s of result?.scheduled ?? []) m[s.patch_id] = s;
    return m;
  }, [result]);

  useEffect(() => {
    (async () => {
      try {
        const [w, p] = await Promise.all([api.getWindows(), api.getPatches()]);
        setWindows(w);
        setPatches(p);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function runOptimize() {
    setOptimizing(true);
    try {
      const weights = normalizeWeights(riskW, costW, outageW);
      const r = await api.optimize(weights);
      setResult(r);
    } finally {
      setOptimizing(false);
    }
  }

  useEffect(() => {
    // auto-run once data loaded
    if (!loading) runOptimize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  function openPatch(pid: string) {
    setSelectedPatchId(pid);
    setDrawerOpen(true);
  }

  const deferred = result?.deferred ?? [];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">Patch Planner</div>
            <div className="text-sm text-zinc-400">
              Multi-objective patch prioritization (risk vs cost vs outage)
            </div>
          </div>

          <button
            onClick={runOptimize}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 hover:bg-zinc-800 inline-flex items-center gap-2"
            disabled={optimizing || loading}
          >
            {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Re-optimize
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center gap-3 text-zinc-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading sample data...
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-5">
            <div>
              <div className="font-semibold">Trade-off sliders</div>
              <div className="text-sm text-zinc-400 mt-1">
                Increase **Risk** to patch aggressively. Increase **Cost** or **Outage** to be conservative.
              </div>
            </div>

            
<div className="mt-4">
  <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Presets</div>
  <ScenarioPresets onPick={(w) => { setRiskW(w.risk); setCostW(w.cost); setOutageW(w.outage); }} />
</div>

<WeightSlider
              label="Risk weight"
              value={riskW}
              onChange={setRiskW}
              hint="Higher = prioritize maximum risk reduction."
            />
            <WeightSlider
              label="Engineering cost weight"
              value={costW}
              onChange={setCostW}
              hint="Higher = prefer cheaper patches and defer expensive ones."
            />
            <WeightSlider
              label="Outage / downtime weight"
              value={outageW}
              onChange={setOutageW}
              hint="Higher = avoid risky changes and long downtime."
            />

            <div className="rounded-xl border border-zinc-800 p-3 text-sm text-zinc-300">
              Normalized weights:{" "}
              <span className="font-semibold">
                {Object.values(normalizeWeights(riskW, costW, outageW)).map(v => v.toFixed(2)).join(" / ")}
              </span>{" "}
              (risk / cost / outage)
            </div>

            {result ? (
              <div className="text-sm text-zinc-300">
                Solver status:{" "}
                <span className="font-semibold">{result.status}</span>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <div className="font-semibold">Recommended patch schedule</div>
                  <div className="text-sm text-zinc-400 mt-1">
                    Assigned to maintenance windows with dependency-aware ordering.
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <ScheduleBoard
                  windows={windows}
                  patchesById={patchesById}
                  scheduled={result?.scheduled ?? []}
                  onOpenPatch={openPatch}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="font-semibold">Deferred backlog (next best)</div>
              <div className="text-sm text-zinc-400 mt-1">
                These were deferred due to budgets, dependencies, or the chosen trade-offs.
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {deferred.map((d) => {
                  const p = patchesById[d.patch_id];
                  if (!p) return null;
                  return (
                    <div key={d.patch_id} className="relative">
                      <div className="absolute right-3 top-3 text-xs text-zinc-400">
                        score {d.weighted_total.toFixed(2)}
                      </div>
                      <PatchCard patch={p} badge="Deferred" onOpen={() => openPatch(p.id)} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PatchDrawer
        open={drawerOpen}
        patch={selectedPatch}
        scheduled={selectedPatchId ? scheduledMap[selectedPatchId] : undefined}
        deferredNotes={selectedPatchId ? result?.deferred_notes?.[selectedPatchId] : undefined}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
