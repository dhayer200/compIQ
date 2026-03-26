from pydantic import BaseModel
from datetime import date
from uuid import UUID


class CompProperty(BaseModel):
    id: UUID | None = None
    address: str
    sale_price: int
    sale_date: date | None = None
    bedrooms: int | None = None
    bathrooms: float | None = None
    sqft: int | None = None
    lot_size: int | None = None
    year_built: int | None = None
    property_type: str | None = None
    distance_miles: float | None = None
    correlation: float | None = None
    adjusted_price: int | None = None
    adjustments: dict[str, int] | None = None


class AdjustmentResult(BaseModel):
    adjustments: dict[str, int]
    adjusted_price: int


class EstimateResult(BaseModel):
    estimated_value: int
    range_low: int
    range_high: int
