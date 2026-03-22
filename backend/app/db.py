import asyncpg
from pathlib import Path
from app.config import settings

pool: asyncpg.Pool | None = None


async def init_db() -> asyncpg.Pool:
    global pool
    pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)
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
            async with db.acquire() as conn:
                async with conn.transaction():
                    await conn.execute(sql)
                    await conn.execute(
                        "INSERT INTO _migrations (name) VALUES ($1)", sql_file.name
                    )
            print(f"Applied migration: {sql_file.name}")
