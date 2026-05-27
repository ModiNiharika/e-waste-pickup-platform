from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

VALID_CATEGORIES = ('Mobile', 'Laptop', 'Accessories', 'Large Appliances')

# Shape of data received from the frontend form
class PickupRequestCreate(BaseModel):
    full_name:          str = Field(..., min_length=2, max_length=100)
    phone_number:       str = Field(..., min_length=10, max_length=15)
    address:            str = Field(..., min_length=5)
    category:           Literal['Mobile', 'Laptop', 'Accessories', 'Large Appliances']
    estimated_quantity: int = Field(default=1, gt=0)

# Shape of data sent back after creation or in admin list
class PickupRequestResponse(BaseModel):
    id:                 int
    address:            str
    category:           str
    estimated_quantity: int
    estimated_points:   int
    status:             str
    submitted_at:       Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Tracking endpoint schemas ---

class TrackingRequest(BaseModel):
    id:                 int
    category:           str
    address:            str
    estimated_quantity: int
    estimated_points:   int
    status:             str
    submitted_at:       Optional[datetime] = None

    class Config:
        from_attributes = True

class TrackingUser(BaseModel):
    full_name:    str
    total_points: int

class TrackingResponse(BaseModel):
    user:     TrackingUser
    requests: list[TrackingRequest]
