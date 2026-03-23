"""Stripe checkout + webhook routes for compIQ Pro subscriptions."""

import os

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "")  # Pro $29/mo price
SITE_URL = os.environ.get("SITE_URL", "http://localhost:5173")


def _stripe():
    """Lazy import stripe to avoid crash if not installed."""
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        return stripe
    except ImportError:
        raise HTTPException(500, "stripe package not installed")


class CheckoutRequest(BaseModel):
    email: str | None = None


@router.post("/checkout")
async def create_checkout(req: CheckoutRequest):
    """Create a Stripe Checkout session for Pro subscription."""
    if not STRIPE_SECRET_KEY or not STRIPE_PRICE_ID:
        raise HTTPException(500, "Stripe not configured")

    stripe = _stripe()
    session_params = {
        "mode": "subscription",
        "line_items": [{"price": STRIPE_PRICE_ID, "quantity": 1}],
        "success_url": f"{SITE_URL}/app?upgraded=1",
        "cancel_url": f"{SITE_URL}/#pricing",
    }
    if req.email:
        session_params["customer_email"] = req.email

    session = stripe.checkout.Session.create(**session_params)
    return {"url": session.url}


@router.post("/billing/portal")
async def billing_portal(request: Request):
    """Create a Stripe billing portal session for managing subscription."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(500, "Stripe not configured")

    body = await request.json()
    customer_id = body.get("customer_id")
    if not customer_id:
        raise HTTPException(400, "customer_id required")

    stripe = _stripe()
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{SITE_URL}/app",
    )
    return {"url": session.url}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events (subscription lifecycle)."""
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(500, "Webhook secret not configured")

    stripe = _stripe()
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(400, "Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        # New subscription — could store customer_id, email, etc.
        customer_email = data.get("customer_email", "")
        customer_id = data.get("customer", "")
        print(f"  [stripe] new subscriber: {customer_email} ({customer_id})")

    elif event_type == "customer.subscription.deleted":
        # Subscription cancelled
        customer_id = data.get("customer", "")
        print(f"  [stripe] subscription cancelled: {customer_id}")

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer", "")
        print(f"  [stripe] payment failed: {customer_id}")

    return {"received": True}
