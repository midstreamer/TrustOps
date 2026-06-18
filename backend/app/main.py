from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import ai_decisions, auth, cases, clients, dashboards, evidence, imports, integrations, notes, qa_reports, sla, users
from app.core.config import settings

app = FastAPI(title="TrustOps API", version="0.1.0", docs_url="/docs")

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
