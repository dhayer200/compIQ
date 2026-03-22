from pydantic import BaseModel
from datetime import date
from uuid import UUID


class PropertyInput(BaseModel):
    address: str
    bedrooms: int | None = None
    bathrooms: float | None = None
    sqft: int | None = None
    lot_size: int | None = None
    year_built: int | None = None


class PropertyData(BaseModel):
    id: UUID | None = None
    address: str
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    county: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    property_type: str | None = None
    bedrooms: int | None = None
    bathrooms: float | None = None
    sqft: int | None = None
    lot_size: int | None = None
    year_built: int | None = None
    last_sale_date: date | None = None
    last_sale_price: int | None = None
