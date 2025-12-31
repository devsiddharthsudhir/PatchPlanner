# Patch Planner — Patch Prioritization as Multi‑Objective Optimization (Risk vs Outage vs Cost)

A full‑stack "patch planner" that turns real security + ops signals into an **optimal patch schedule**, not “patch everything”.
It uses:
- **Exploit-likelihood** signals (EPSS-like probability, KEV-like boost)
- **Dependency graphs** (package / patch ordering constraints)
- **Maintenance windows** (downtime budgets, cost budgets)
- **Multi-objective optimization** (risk reduction vs outage risk vs engineering cost)

## Screenshot-level Features
- **Trade-off sliders**: Risk ↔ Cost ↔ Downtime/Outage
- **Prioritized backlog**: what to patch now vs later
- **Schedule board**: patches assigned to each maintenance window
- **“Why this patch first?”** explanations: objective contributions + constraints + dependencies

---

## Repo structure

```
patch-planner/
  backend/        # FastAPI + ILP optimizer (PuLP)
  frontend/       # React + Vite + Tailwind UI
  docker-compose.yml
```

---

## Quickstart (local dev)

### 0) Prereqs
- Node.js **20+**
- Python **3.10+** (3.11 recommended)

### 1) Backend
```bash
cd backend
python -m venv .venv
# Windows:
# .venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

### 2) Frontend
```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

> The frontend defaults to `VITE_API_URL=http://localhost:8000`.  
> You can override with a `.env` file (see `.env.example`).

---

## Docker (optional)
```bash
docker compose up --build
```
Frontend: `http://localhost:5173`  
Backend: `http://localhost:8000`

---

## Optimization model (high-level)

We model each patch `p` and each maintenance window `w`.

Decision variables:
- `x[p,w] ∈ {0,1}`: patch `p` scheduled in window `w`
- `y[p] ∈ {0,1}`: patch `p` scheduled at all (0 = deferred)

Constraints:
- Each patch scheduled in at most one window: `Σ_w x[p,w] = y[p]`
- Window downtime budget: `Σ_p downtime[p] * x[p,w] ≤ downtime_budget[w]`
- Window engineering budget: `Σ_p cost[p] * x[p,w] ≤ cost_budget[w]`
- Dependencies: if `a` depends on `b` then:
  - `y[a] ≤ y[b]` (can't schedule a without b)
  - `window(a) ≥ window(b)` (ordering over time)

Objective (weighted sum):
- Maximize: `RiskReduction(p)`  
- Minimize: `EngineeringCost(p)` and `OutageRisk(p)`

The UI sliders map to weights `{risk, cost, outage}`.

---

## Where to plug in real-world signals
- Replace `epss_like` with live EPSS, and `kev` with CISA KEV membership
- Import vulnerability scanner output (e.g., Nessus, OpenVAS, Trivy)
- Import SBOM dependencies (CycloneDX / SPDX) into the patch dependency graph
- Add change failure probability from ops history / SLOs (outage model)

---

## Tests
Backend has basic tests:
```bash
cd backend
pytest -q
```

---

## License
MIT

## Design notes (why it feels “real” in ops)
- This is intentionally **not** “patch everything”. It makes the trade-offs explicit and explainable:
  - You can be risk-first during an active exploitation wave
  - You can be outage-first during peak business periods
  - You can be cost-first when engineering capacity is constrained
- The optimizer returns both a **plan** and the **story** behind the plan (signals + constraints).

## Configuration
### Backend
Create `backend/.env` (optional):
```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
LOG_LEVEL=INFO
```

### Frontend
Create `frontend/.env` (optional):
```env
VITE_API_BASE_URL=http://localhost:8000
```

## Docs
- `docs/architecture.md`
- `docs/optimizer-notes.md`
- `docs/demo-script.md`

## Roadmap ideas (good for admissions / portfolio)
- Ingest real feeds: EPSS (FIRST), KEV (CISA), scanner outputs (Trivy/Nessus)
- Add “what-if” comparisons: plan A vs plan B delta
- Add dependency DAG visualization
- Add export: CSV + change-ticket draft

## Safety note
This is a **planning assistant**. In real environments you still need change approvals, testing, and rollback plans.
