from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

import models
import schemas
from database import engine, SessionLocal

# 1. Instruct the database to create all the tables we designed in models.py
models.Base.metadata.create_all(bind=engine)

# 2. Start the FastAPI application
app = FastAPI(title="E-Waste Platform API")

# 3. Setup CORS (Cross-Origin Resource Sharing)
# This allows our future Frontend to talk to this Backend securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. A helper function to open and close the database connection for every request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 5. Define Point Values based on your PRD
REWARD_POINTS = {
    "Mobile": 200,
    "Laptop": 500,
    "Accessories": 50,
    "Large Appliances": 1000
}

# --- API ENDPOINTS ---

# 6. User Endpoint: Submit a new pickup request
@app.post("/api/requests", response_model=schemas.PickupRequestResponse)
def create_pickup_request(request_data: schemas.PickupRequestCreate, db: Session = Depends(get_db)):
    
    # First, let's see if this user (phone number) already exists in our database
    user = db.query(models.User).filter(models.User.phone_number == request_data.phone_number).first()
    
    # If not, let's create a new User!
    if not user:
        user = models.User(full_name=request_data.full_name, phone_number=request_data.phone_number)
        db.add(user)
        db.commit()
        db.refresh(user) # Update the variable to get the new User ID
        
    # Calculate estimated points (Quantity * Points for that Category)
    points_per_item = REWARD_POINTS.get(request_data.category, 0)
    total_estimated = points_per_item * request_data.estimated_quantity
    
    # Create the actual pickup request linked to the User
    new_request = models.PickupRequest(
        user_id=user.id,
        address=request_data.address,
        category=request_data.category,
        estimated_quantity=request_data.estimated_quantity,
        estimated_points=total_estimated
    )
    
    # Save it to the database
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    # Return the newly saved request back to the user/frontend
    return new_request

# 7. Admin Endpoint: View all requests
@app.get("/admin/requests", response_model=list[schemas.PickupRequestResponse])
def get_all_requests(db: Session = Depends(get_db)):
    requests = db.query(models.PickupRequest).all()
    return requests