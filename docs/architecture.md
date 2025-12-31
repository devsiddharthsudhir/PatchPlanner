# Architecture (Patch Planner)

## Components
- **Backend (FastAPI)**: hosts data endpoints and runs the optimizer.
- **Optimizer (PuLP ILP)**: chooses which patches land in which window under budgets + dependencies.
- **Frontend (React)**: lets a stakeholder “steer” the trade-offs and see explanations.

## Data flow
1. UI loads `/api/patches` + `/api/windows`
2. UI submits weights to `/api/optimize`
3. API returns:
   - `scheduled[]` (window + order)
   - `deferred[]` (ranked)
   - per-window summaries

## Why ILP (and not greedy)?
Greedy sorting breaks quickly once you add:
- Dependencies
- Multiple windows with separate budgets
- Different stakeholder goals (risk vs outage vs cost)

ILP gives you a reproducible “best plan given constraints”.
