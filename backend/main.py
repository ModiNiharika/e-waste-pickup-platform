from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

import models
import schemas
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="E-Waste Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

REWARD_POINTS = {
    "Mobile": 200,
    "Laptop": 500,
    "Accessories": 50,
    "Large Appliances": 1000,
}

def normalize_phone(raw: str) -> str:
    """Strip formatting and country-code prefix, return bare 10-digit number."""
    phone = raw.strip().lstrip("+")
    # Drop +91 / 91 country code prefix
    if len(phone) > 10 and phone.startswith("91"):
        phone = phone[2:]
    # Drop leading STD 0 (e.g. 09876543210)
    if len(phone) == 11 and phone.startswith("0"):
        phone = phone[1:]
    return phone


# --- API ENDPOINTS ---

@app.post("/api/requests", response_model=schemas.PickupRequestResponse)
def create_pickup_request(
    request_data: schemas.PickupRequestCreate,
    db: Session = Depends(get_db),
):
    clean_phone = normalize_phone(request_data.phone_number)

    user = db.query(models.User).filter(models.User.phone_number == clean_phone).first()
    if not user:
        user = models.User(
            full_name=request_data.full_name.strip(),
            phone_number=clean_phone,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Keep the stored name up-to-date if the user re-submits with a new name
        if request_data.full_name.strip() and user.full_name != request_data.full_name.strip():
            user.full_name = request_data.full_name.strip()
            db.commit()

    points_per_item  = REWARD_POINTS.get(request_data.category, 0)
    total_estimated  = points_per_item * request_data.estimated_quantity

    new_request = models.PickupRequest(
        user_id=user.id,
        address=request_data.address,
        category=request_data.category,
        estimated_quantity=request_data.estimated_quantity,
        estimated_points=total_estimated,
        status="Pending",  # explicit — never rely on column default for safety
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return new_request


@app.get("/api/requests/track", response_model=schemas.TrackingResponse)
def track_requests(
    phone: str = Query(..., min_length=10),
    db: Session = Depends(get_db),
):
    normalized = normalize_phone(phone)

    user = (
        db.query(models.User)
        .filter(models.User.phone_number == normalized)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"No account found for phone number '{normalized}'.",
        )

    # Return requests newest first
    requests = (
        db.query(models.PickupRequest)
        .filter(models.PickupRequest.user_id == user.id)
        .order_by(models.PickupRequest.id.desc())
        .all()
    )
    return {"user": user, "requests": requests}


@app.get("/admin/requests", response_model=list[schemas.PickupRequestResponse])
def get_all_requests(db: Session = Depends(get_db)):
    return (
        db.query(models.PickupRequest)
        .order_by(models.PickupRequest.id.desc())
        .all()
    )
