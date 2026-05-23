from pydantic import BaseModel, Field

# This is the shape of the data we EXPECT to receive from the Frontend Form
class PickupRequestCreate(BaseModel):
    full_name: str
    phone_number: str =Field(...,min_length=10, max_length=15) #Enforces Length
    address: str
    category: str
    estimated_quantity: int = Field(default=1, gt=0) # Must be greater than 0

# This is the shape of the data we will SENDBACK to the Frontend

class PickupRequestResponse(BaseModel):
    id: int 
    address: str
    category: str
    estimated_points: int
    status: str

    class Config:
        from_attributes = True
        # Allows Pydantic to read data directly from our SQLAlchemy database models
        