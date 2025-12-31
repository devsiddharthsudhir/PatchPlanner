from app.data import load_sample
from app.optimizer import optimize_schedule
from app.models import OptimizationWeights

def test_optimizer_runs_and_respects_dependencies():
    windows, patches = load_sample()
    res = optimize_schedule(windows, patches, OptimizationWeights(risk=1, cost=0, outage=0))
    assert res.status in ("optimal", "feasible")
    # If p5 scheduled, p2 must be scheduled (dependency)
    scheduled_ids = {s.patch_id for s in res.scheduled}
    if "p5" in scheduled_ids:
        assert "p2" in scheduled_ids

def test_force_exclude_works():
    windows, patches = load_sample()
    res = optimize_schedule(
        windows, patches,
        OptimizationWeights(risk=1, cost=0, outage=0),
        force_exclude=["p1"]
    )
    scheduled_ids = {s.patch_id for s in res.scheduled}
    assert "p1" not in scheduled_ids
