from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

import networkx as nx
import pulp

from .models import MaintenanceWindow, OptimizationWeights, Patch, PatchScore, ScheduledPatch


# --- scoring -----------------------------------------------------------------

def normalize_weights(w: OptimizationWeights) -> OptimizationWeights:
    """Normalize weights so the sum is 1.0.

    We keep this explicit so the UI can send any positive numbers without worrying
    about normalization client-side.
    """
    total = w.risk + w.cost + w.outage
    if total <= 0:
        return OptimizationWeights(risk=1 / 3, cost=1 / 3, outage=1 / 3)
    return OptimizationWeights(risk=w.risk / total, cost=w.cost / total, outage=w.outage / total)


def risk_reduction(p: Patch) -> float:
    """Risk reduction proxy.

    This intentionally is a *proxy* (demo-friendly). In a real build you'd plug in:
    - EPSS (FIRST)
    - CISA KEV
    - asset exposure (internet-facing), detection coverage, etc.
    """
    sev = p.cvss / 10.0                   # 0..1
    expl = p.epss_like                    # 0..1
    crit = p.asset_criticality / 5.0      # 0..1
    kev_boost = 1.25 if p.kev else 1.0
    return 100.0 * sev * expl * crit * kev_boost


def outage_risk(p: Patch) -> float:
    """Outage/operational pain proxy.

    Higher = more operational risk *if* you ship this patch.
    """
    # change_risk in [0, 1] + downtime in minutes + criticality multiplier
    crit = p.asset_criticality / 5.0
    return (30.0 * p.change_risk + 0.25 * p.downtime_minutes) * (1.0 + crit)


# --- graph helpers ------------------------------------------------------------

def build_dependency_graph(patches: List[Patch]) -> nx.DiGraph:
    """Edge direction: dep -> dependent (B -> A if A depends on B)."""
    g = nx.DiGraph()
    ids = {p.id for p in patches}
    for p in patches:
        g.add_node(p.id)
    for p in patches:
        for dep in p.depends_on:
            if dep in ids:
                g.add_edge(dep, p.id)
    return g


def topo_sort_subset(nodes: List[str], g: nx.DiGraph) -> List[str]:
    """Topological order restricted to a subset of nodes."""
    sub = g.subgraph(nodes).copy()
    try:
        return list(nx.topological_sort(sub))
    except nx.NetworkXUnfeasible:
        # Cycle in declared dependencies. In real life you'd block and surface an error.
        return nodes


# --- optimizer ----------------------------------------------------------------

@dataclass
class OptimizeResult:
    status: str
    weights: OptimizationWeights
    scheduled: List[ScheduledPatch]
    deferred: List[PatchScore]
    window_summaries: Dict[str, Dict[str, float]]
    deferred_notes: Dict[str, List[str]]


def optimize_schedule(
    windows: List[MaintenanceWindow],
    patches: List[Patch],
    weights: OptimizationWeights,
    force_include: List[str] | None = None,
    force_exclude: List[str] | None = None,
) -> OptimizeResult:
    """Solve the patch planning problem as an ILP.

    Decision:
    - assign each patch to at most one maintenance window (or defer it)

    Constraints:
    - per-window downtime/cost budgets
    - dependency selection + ordering

    Objective:
    - maximize risk reduction
    - minimize eng cost and outage impact (weighted by UI)
    """
    force_include = force_include or []
    force_exclude = force_exclude or []

    w = normalize_weights(weights)

    patch_by_id = {p.id: p for p in patches}
    P = [p.id for p in patches]
    W = [w_.id for w_ in windows]
    idx = {wid: i for i, wid in enumerate(W)}

    dep_graph = build_dependency_graph(patches)

    # Variables
    x: Dict[str, Dict[str, pulp.LpVariable]] = {
        pid: {wid: pulp.LpVariable(f"x_{pid}_{wid}", cat="Binary") for wid in W}
        for pid in P
    }
    y: Dict[str, pulp.LpVariable] = {pid: pulp.LpVariable(f"y_{pid}", cat="Binary") for pid in P}

    model = pulp.LpProblem("patch_planner", pulp.LpMaximize)

    # Each patch is either assigned to exactly one window or not scheduled.
    for pid in P:
        model += pulp.lpSum(x[pid][wid] for wid in W) == y[pid], f"assign_once_{pid}"

    # Window budgets
    win_by_id = {w_.id: w_ for w_ in windows}
    for wid in W:
        model += (
            pulp.lpSum(patch_by_id[pid].downtime_minutes * x[pid][wid] for pid in P)
            <= win_by_id[wid].downtime_budget_minutes
        ), f"downtime_budget_{wid}"

        model += (
            pulp.lpSum(patch_by_id[pid].eng_cost * x[pid][wid] for pid in P)
            <= win_by_id[wid].eng_cost_budget
        ), f"cost_budget_{wid}"

    # Dependencies:
    # - selection: can't schedule A unless B is scheduled
    # - ordering: window(A) must be >= window(B)
    for a in patches:
        for b in a.depends_on:
            if b not in patch_by_id:
                continue
            model += y[a.id] <= y[b], f"dep_select_{a.id}_on_{b}"
            model += (
                pulp.lpSum(idx[wid] * x[a.id][wid] for wid in W)
                >= pulp.lpSum(idx[wid] * x[b][wid] for wid in W)
            ), f"dep_order_{a.id}_after_{b}"

    # Force include / exclude (handy for demos and "must patch now" scenarios)
    for pid in force_include:
        if pid in y:
            model += y[pid] == 1, f"force_include_{pid}"
    for pid in force_exclude:
        if pid in y:
            model += y[pid] == 0, f"force_exclude_{pid}"

    # Objective
    risk_term = pulp.lpSum(risk_reduction(patch_by_id[pid]) * y[pid] for pid in P)
    cost_term = pulp.lpSum(patch_by_id[pid].eng_cost * y[pid] for pid in P)
    outage_term = pulp.lpSum(outage_risk(patch_by_id[pid]) * y[pid] for pid in P)

    model += (w.risk * risk_term) - (w.cost * cost_term) - (w.outage * outage_term)

    solver = pulp.PULP_CBC_CMD(msg=False)
    model.solve(solver)

    status_str = pulp.LpStatus.get(model.status, "unknown")
    if status_str == "Optimal":
        status_out = "optimal"
    elif status_str in ("Feasible",):
        status_out = "feasible"
    else:
        status_out = "infeasible"

    # Extract solution values
    y_val = {pid: int(pulp.value(y[pid]) >= 0.5) for pid in P}
    x_val = {pid: {wid: int(pulp.value(x[pid][wid]) >= 0.5) for wid in W} for pid in P}

    def patch_score(pid: str) -> PatchScore:
        p = patch_by_id[pid]
        rr = risk_reduction(p)
        c = p.eng_cost
        o = outage_risk(p)
        weighted = (w.risk * rr) - (w.cost * c) - (w.outage * o)
        return PatchScore(patch_id=pid, risk_reduction=rr, eng_cost=c, outage_risk=o, weighted_total=weighted)

    # Group scheduled patches by window
    scheduled_by_window: Dict[str, List[str]] = {wid: [] for wid in W}
    deferred: List[PatchScore] = []
    for pid in P:
        if y_val[pid] == 1:
            assigned = [wid for wid in W if x_val[pid][wid] == 1]
            if assigned:
                scheduled_by_window[assigned[0]].append(pid)
        else:
            deferred.append(patch_score(pid))

    # Order inside window (topo)
    ordered_in_window = {wid: topo_sort_subset(pids, dep_graph) for wid, pids in scheduled_by_window.items()}

    # Explanations
    scheduled_items: List[ScheduledPatch] = []
    window_summaries: Dict[str, Dict[str, float]] = {}
    deferred_notes: Dict[str, List[str]] = {}

    # Precompute used budgets
    used_downtime = {wid: sum(patch_by_id[pid].downtime_minutes for pid in ordered_in_window[wid]) for wid in W}
    used_cost = {wid: sum(patch_by_id[pid].eng_cost for pid in ordered_in_window[wid]) for wid in W}

    for wid in W:
        total_rr = 0.0
        total_cost = 0.0
        total_outage = 0.0
        total_dt = 0.0

        for order, pid in enumerate(ordered_in_window[wid], start=1):
            p = patch_by_id[pid]
            sc = patch_score(pid)

            why: List[str] = []

            # signal-based story
            if p.kev:
                why.append("Known/assumed exploited (KEV-style boost).")
            if p.epss_like >= 0.50:
                why.append(f"High exploit-likelihood (epss_like={p.epss_like:.2f}).")
            if p.asset_criticality >= 4:
                why.append(f"High business criticality (criticality={p.asset_criticality}/5).")

            # constraint story (dependencies)
            deps = [d for d in p.depends_on if d in patch_by_id]
            if deps:
                why.append("Requires prerequisites: " + ", ".join(deps))

            dependents = list(dep_graph.successors(pid))
            if dependents:
                why.append("Enables follow-up patches: " + ", ".join(dependents))

            # budget fit / operational note
            why.append(
                f"Fits window budgets: {used_downtime[wid]}/{win_by_id[wid].downtime_budget_minutes} min downtime, "
                f"{used_cost[wid]:.1f}/{win_by_id[wid].eng_cost_budget:.1f} eng cost."
            )

            scheduled_items.append(
                ScheduledPatch(
                    patch_id=pid,
                    window_id=wid,
                    order_in_window=order,
                    score=sc,
                    why=why,
                )
            )

            total_rr += sc.risk_reduction
            total_cost += sc.eng_cost
            total_outage += sc.outage_risk
            total_dt += p.downtime_minutes

        window_summaries[wid] = {
            "risk_reduction_total": total_rr,
            "eng_cost_total": total_cost,
            "outage_risk_total": total_outage,
            "downtime_minutes_total": total_dt,
        }

    # Deferred notes (short, pragmatic reasons)
    # Note: we don't try to "explain the ILP" — we explain the most likely human reason.
    max_dt = max((w_.downtime_budget_minutes for w_ in windows), default=0)
    max_cost = max((w_.eng_cost_budget for w_ in windows), default=0)

    for sc in deferred:
        pid = sc.patch_id
        p = patch_by_id[pid]
        notes: List[str] = []

        if pid in force_exclude:
            notes.append("Manually excluded.")
        missing_prereq = [d for d in p.depends_on if d in patch_by_id and y_val.get(d, 0) == 0]
        if missing_prereq:
            notes.append("Missing prerequisites: " + ", ".join(missing_prereq))

        if p.downtime_minutes > max_dt:
            notes.append(f"Downtime ({p.downtime_minutes} min) exceeds every window budget.")
        if p.eng_cost > max_cost:
            notes.append(f"Cost ({p.eng_cost}) exceeds every window budget.")

        # Weight-driven hints
        if not notes:
            if w.outage >= 0.45 and outage_risk(p) >= 35:
                notes.append("Deferred because outage impact is heavily weighted right now.")
            elif w.cost >= 0.45 and p.eng_cost >= 4:
                notes.append("Deferred because engineering cost is heavily weighted right now.")
            else:
                notes.append("Lower composite priority under current weights + budgets.")

        deferred_notes[pid] = notes

    deferred.sort(key=lambda s: s.weighted_total, reverse=True)

    return OptimizeResult(
        status=status_out,
        weights=w,
        scheduled=scheduled_items,
        deferred=deferred,
        window_summaries=window_summaries,
        deferred_notes=deferred_notes,
    )
