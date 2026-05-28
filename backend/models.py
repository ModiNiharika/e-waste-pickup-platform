from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    phone_number = Column(String, unique=True, index=True)
    total_points = Column(Integer, default=0)

    # This creates a link to the user's pickup requests
    requests = relationship("PickupRequest", back_populates="owner")

class PickupRequest(Base):
    __tablename__ = "pickup_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    address = Column(String)
    category = Column(String) # e.g., Mobile, Laptop, Accessories
    estimated_quantity = Column(Integer, default=1)
    estimated_points = Column(Integer, default=0)
    status = Column(String, default="Pending") # Can be Pending, Completed, Cancelled
    preferred_date = Column(String, nullable=True)
    time_slot      = Column(String, nullable=True)
    submitted_at = Column(DateTime, server_default=func.now(), nullable=True)

    # This creates a link back to the user who made the request
    owner = relationship("User", back_populates="requests")
