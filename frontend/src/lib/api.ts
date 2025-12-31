export type MaintenanceWindow = {
  id: string;
  title: string;
  start_iso: string;
  end_iso: string;
  downtime_budget_minutes: number;
  eng_cost_budget: number;
};

export type Patch = {
  id: string;
  name: string;
  asset: string;
  asset_criticality: number;
  cve: string;
  cvss: number;
  epss_like: number;
  kev: boolean;
  downtime_minutes: number;
  eng_cost: number;
  change_risk: number;
  depends_on: string[];
};

export type Weights = { risk: number; cost: number; outage: number };

export type PatchScore = {
  patch_id: string;
  risk_reduction: number;
  eng_cost: number;
  outage_risk: number;
  weighted_total: number;
};

export type ScheduledPatch = {
  patch_id: string;
  window_id: string;
  order_in_window: number;
  score: PatchScore;
  why: string[];
};

export type OptimizeResponse = {
  status: "optimal" | "feasible" | "infeasible";
  weights_normalized: Weights;
  scheduled: ScheduledPatch[];
  deferred: PatchScore[];
  window_summaries: Record<string, Record<string, number>>;
  deferred_notes?: Record<string, string[]>;
};

const API_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getWindows: () => http<MaintenanceWindow[]>("/api/windows"),
  getPatches: () => http<Patch[]>("/api/patches"),
  optimize: (weights: Weights, force_include: string[] = [], force_exclude: string[] = []) =>
    http<OptimizeResponse>("/api/optimize", {
      method: "POST",
      body: JSON.stringify({ weights, force_include, force_exclude })
    })
};
