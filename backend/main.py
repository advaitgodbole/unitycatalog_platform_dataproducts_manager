import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import get_settings
from backend.middleware import AuthMiddleware, ROLE_DISPLAY, _resolve_role
from backend.routers import products, access, catalog, webhooks, admin

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.has_lakebase:
        try:
            from backend.db.migrations import run_migrations
            run_migrations()
        except Exception as e:
            logger.error("Migration failed (non-fatal): %s", e)
    yield


app = FastAPI(
    title=settings.app_title,
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(access.router, prefix="/api/access", tags=["access"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["catalog"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": app.version}


@app.get("/api/me")
async def current_user(request: Request):
    email = getattr(request.state, "user_email", "anonymous@local")
    role = getattr(request.state, "user_role", _resolve_role(email))
    return {
        "email": email,
        "role": role.value,
        "role_display": ROLE_DISPLAY.get(role, role.value),
    }


STATIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
