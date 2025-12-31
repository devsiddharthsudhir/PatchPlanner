# Optimizer Notes

## Objective
We solve a weighted sum:
- maximize risk-reduction
- minimize engineering cost
- minimize outage impact

Weights come from UI sliders and are normalized.

## Constraints
- Each patch scheduled at most once.
- Per-window downtime and cost budgets.
- Dependency selection: if A depends on B then A can’t be scheduled unless B is scheduled.
- Dependency ordering: A cannot be scheduled earlier than B.

## “Why” explanations
Explanations are intentionally opinionated and short:
- Signals: KEV, high exploit-likelihood, high criticality
- Constraints: dependency unlocks, budgets fit
- Deferred reasons: budget pressure, outage weight, missing prerequisites
