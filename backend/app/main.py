from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import admin, ai_decisions, auth, cases, clients, dashboards, evidence, imports, integrations, notes, qa_reports, sla, users
from app.core.config import settings
from app.db.session import get_db

app = FastAPI(title="TrustOps API", version=settings.app_version, docs_url="/docs")

origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(clients.router)
app.include_router(users.router)
app.include_router(cases.router)
app.include_router(notes.router)
app.include_router(evidence.router)
app.include_router(imports.router)
app.include_router(integrations.router)
app.include_router(ai_decisions.router)
app.include_router(sla.router)
app.include_router(qa_reports.router)
app.include_router(dashboards.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": "unavailable"},
        )


@app.get("/version")
def version():
    return {
        "name": "TrustOps API",
        "version": settings.app_version,
        "deployment_mode": settings.deployment_mode,
    }
