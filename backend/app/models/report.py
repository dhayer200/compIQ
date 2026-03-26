from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.property import PropertyData
from app.models.comp import CompProperty, EstimateResult


class RentEstimate(BaseModel):
    rent: int
    range_low: int
    range_high: int


class CashFlowPotential(BaseModel):
    comp_price_low: int
    comp_price_high: int
    median_price: int


class AcquisitionData(BaseModel):
    last_sale_date: str | None = None
    last_sale_price: int | None = None


class AnalysisResponse(BaseModel):
    id: UUID
    subject: PropertyData
    estimate: EstimateResult
    rent: RentEstimate
    days_on_market: int | None = None
    comps: list[CompProperty]
    narrative: str
    cash_flow_potential: CashFlowPotential | None = None
    acquisition: AcquisitionData | None = None
    created_at: datetime | None = None
