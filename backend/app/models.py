from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal


class MaintenanceWindow(BaseModel):
    id: str
    title: str
    start_iso: str
    end_iso: str
    downtime_budget_minutes: int = Field(..., ge=0)
    eng_cost_budget: float = Field(..., ge=0)


class Patch(BaseModel):
    id: str
    name: str
    asset: str
    asset_criticality: int = Field(..., ge=1, le=5)

    # security + exploitability signals
    cve: str
    cvss: float = Field(..., ge=0, le=10)
    epss_like: float = Field(..., ge=0, le=1)  # probability of exploitation
    kev: bool = False  # known exploited vulnerability

    # ops signals
    downtime_minutes: int = Field(..., ge=0)
    eng_cost: float = Field(..., ge=0)
    change_risk: float = Field(..., ge=0, le=1)  # chance the patch causes incident/outage

    # dependencies (patch ids that must be done before this one)
    depends_on: List[str] = Field(default_factory=list)


class OptimizationWeights(BaseModel):
    risk: float = Field(..., ge=0)
    cost: float = Field(..., ge=0)
    outage: float = Field(..., ge=0)


class OptimizationRequest(BaseModel):
    weights: OptimizationWeights
    max_windows: Optional[int] = None
    force_include: List[str] = Field(default_factory=list)  # patch IDs
    force_exclude: List[str] = Field(default_factory=list)  # patch IDs


class PatchScore(BaseModel):
    patch_id: str
    risk_reduction: float
    eng_cost: float
    outage_risk: float
    weighted_total: float


class ScheduledPatch(BaseModel):
    patch_id: str
    window_id: str
    order_in_window: int
    score: PatchScore
    why: List[str]


class OptimizationResponse(BaseModel):
    status: Literal["optimal", "feasible", "infeasible"]
    weights_normalized: OptimizationWeights
    scheduled: List[ScheduledPatch]
    deferred: List[PatchScore]
    window_summaries: Dict[str, Dict[str, float]]  # totals per window

    deferred_notes: Dict[str, List[str]] = Field(default_factory=dict)  # patch_id -> short notes
