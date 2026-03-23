"""Seed the admin account. Run once: python seed_admin.py"""

import asyncio
import bcrypt
from app.db import init_db, close_db, get_pool

ADMIN_EMAIL = "admin@compiq.app"
ADMIN_PASSWORD = "CompIQ2026!"
STRIPE_CUSTOMER = "cus_UCdSHhLNP9tIGT"


async def main():
    await init_db()
    db = await get_pool()

    pw_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()

    existing = await db.fetchval("SELECT 1 FROM users WHERE email = $1", ADMIN_EMAIL)
    if existing:
        await db.execute(
            "UPDATE users SET password_hash = $1, tier = 'pro', stripe_customer = $2 WHERE email = $3",
            pw_hash, STRIPE_CUSTOMER, ADMIN_EMAIL,
        )
        print(f"Updated admin account: {ADMIN_EMAIL}")
    else:
        await db.execute(
            "INSERT INTO users (email, password_hash, tier, stripe_customer) VALUES ($1, $2, 'pro', $3)",
            ADMIN_EMAIL, pw_hash, STRIPE_CUSTOMER,
        )
        print(f"Created admin account: {ADMIN_EMAIL}")

    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
