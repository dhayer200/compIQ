from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.property import PropertyData
from app.models.comp import CompProperty, EstimateResult


class RentEstimate(BaseModel):
    rent: int
    range_low: int
    range_high: int


class AnalysisResponse(BaseModel):
    id: UUID
    subject: PropertyData
    estimate: EstimateResult
    rent: RentEstimate
    days_on_market: int | None = None
    comps: list[CompProperty]
    narrative: str
    created_at: datetime | None = None
