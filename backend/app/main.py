from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import init_db, close_db, run_migrations
from app.routes.health import router as health_router
from app.routes.analysis import router as analysis_router
from app.routes.stripe import router as stripe_router
from app.routes.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await run_migrations()
    yield
    await close_db()


app = FastAPI(title="compIQ", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(stripe_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
