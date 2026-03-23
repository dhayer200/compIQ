"""Auth routes — login, register, token verification."""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.db import get_pool

router = APIRouter(prefix="/auth")

JWT_SECRET = os.environ.get("JWT_SECRET", "compiq-dev-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 72


# ── helpers ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str, email: str, tier: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "tier": tier,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


# ── request / response models ────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    email: str
    tier: str


# ── routes ───────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    db = await get_pool()
    row = await db.fetchrow("SELECT id, email, password_hash, tier FROM users WHERE email = $1", req.email.lower().strip())

    if not row or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(401, detail="Invalid email or password.")

    token = create_token(str(row["id"]), row["email"], row["tier"])
    return TokenResponse(token=token, email=row["email"], tier=row["tier"])


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    if len(req.password) < 6:
        raise HTTPException(400, detail="Password must be at least 6 characters.")

    db = await get_pool()
    existing = await db.fetchval("SELECT 1 FROM users WHERE email = $1", req.email.lower().strip())
    if existing:
        raise HTTPException(409, detail="Account already exists.")

    row = await db.fetchrow(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, tier",
        req.email.lower().strip(),
        hash_password(req.password),
    )
    token = create_token(str(row["id"]), row["email"], row["tier"])
    return TokenResponse(token=token, email=row["email"], tier=row["tier"])


@router.get("/me")
async def get_me(request: Request):
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    payload = decode_token(auth[7:])
    db = await get_pool()
    row = await db.fetchrow("SELECT id, email, tier, stripe_customer FROM users WHERE id::text = $1", payload["sub"])
    if not row:
        raise HTTPException(401, "User not found")
    return {"id": str(row["id"]), "email": row["email"], "tier": row["tier"], "stripe_customer": row["stripe_customer"]}
