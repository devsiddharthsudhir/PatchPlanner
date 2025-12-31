from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .data import load_sample
from .models import OptimizationRequest, OptimizationResponse
from .optimizer import optimize_schedule
from .settings import settings

log = logging.getLogger("patch_planner")

app = FastAPI(title="Patch Planner API", version="0.2.0")

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))

# CORS for local/dev. If you need '*' in production, set it at the reverse proxy.
allow_origins = settings.cors_origins
allow_credentials = False if "*" in allow_origins else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

_windows, _patches = load_sample()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/version")
def version():
    return {"version": app.version}


@app.get("/api/windows")
def list_windows():
    return _windows


@app.get("/api/patches")
def list_patches():
    return _patches


@app.post("/api/optimize", response_model=OptimizationResponse)
def optimize(req: OptimizationRequest):
    result = optimize_schedule(
        windows=_windows,
        patches=_patches,
        weights=req.weights,
        force_include=req.force_include,
        force_exclude=req.force_exclude,
    )
    return OptimizationResponse(
        status=result.status,
        weights_normalized=result.weights,
        scheduled=result.scheduled,
        deferred=result.deferred,
        window_summaries=result.window_summaries,
        deferred_notes=getattr(result, 'deferred_notes', {}),
    )
