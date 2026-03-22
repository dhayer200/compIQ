import ssl as _ssl
import asyncpg
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from app.config import settings

pool: asyncpg.Pool | None = None


def _clean_database_url(url: str) -> str:
    """Strip channel_binding and sslmode from URL — we handle SSL via kwarg."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    params.pop("channel_binding", None)
    params.pop("sslmode", None)
    clean_query = urlencode(params, doseq=True)
    return urlunparse(parsed._replace(query=clean_query))


async def init_db() -> asyncpg.Pool:
    global pool
    raw_url = settings.database_url
    if not raw_url:
        raise RuntimeError("DATABASE_URL is not set")

    db_url = _clean_database_url(raw_url)
    parsed = urlparse(db_url)
    print(f"Connecting to database host: {parsed.hostname}")

    # Create permissive SSL context for Neon
    ssl_ctx = _ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = _ssl.CERT_NONE

    pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10, ssl=ssl_ctx)
    print("Database pool initialized")
    return pool


async def close_db():
    global pool
    if pool:
        await pool.close()
        pool = None


async def get_pool() -> asyncpg.Pool:
    if pool is None:
        raise RuntimeError("Database pool not initialized")
    return pool


async def run_migrations():
    """Run all SQL migration files in order."""
    migrations_dir = Path(__file__).parent / "migrations"
    db = await get_pool()

    await db.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            name TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ DEFAULT now()
        )
    """)

    applied = {r["name"] for r in await db.fetch("SELECT name FROM _migrations")}

    for sql_file in sorted(migrations_dir.glob("*.sql")):
        if sql_file.name not in applied:
            sql = sql_file.read_text()
            # Split on semicolons — asyncpg can't run multi-statement SQL
            statements = [s.strip() for s in sql.split(";") if s.strip()]
            async with db.acquire() as conn:
                async with conn.transaction():
                    for stmt in statements:
                        await conn.execute(stmt)
                    await conn.execute(
                        "INSERT INTO _migrations (name) VALUES ($1)", sql_file.name
                    )
            print(f"Applied migration: {sql_file.name}")
