import os
from fastapi import FastAPI, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

import models
import schemas
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)

# Startup migrations — add columns and indexes introduced after initial deploy.
# try/except swallows "already exists" errors so every restart is safe.
with engine.connect() as _conn:
    for _stmt in [
        "ALTER TABLE pickup_requests ADD COLUMN preferred_date TEXT",
        "ALTER TABLE pickup_requests ADD COLUMN time_slot TEXT",
        "CREATE INDEX IF NOT EXISTS idx_pr_user_id ON pickup_requests (user_id)",
        "CREATE INDEX IF NOT EXISTS idx_pr_status  ON pickup_requests (status)",
    ]:
        try:
            _conn.execute(text(_stmt))
            _conn.commit()
        except Exception:
            pass

app = FastAPI(title="E-Waste Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Admin authentication ─────────────────────────────────────────────────────
# Set ADMIN_TOKEN as an environment variable on Render.
# Falls back to the demo code so the app works out-of-the-box locally.
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "ECO-ADMIN-2024")

def verify_admin_token(x_admin_token: str = Header(None)):
    """FastAPI dependency — rejects requests without a valid X-Admin-Token header."""
    if not x_admin_token or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized. Valid X-Admin-Token header required.",
        )

# ─── DB session ───────────────────────────────────────────────────────────────

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
    phone = raw.strip().lstrip("+")
    if len(phone) > 10 and phone.startswith("91"):
        phone = phone[2:]
    if len(phone) == 11 and phone.startswith("0"):
        phone = phone[1:]
    return phone


# ─── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


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
        if request_data.full_name.strip() and user.full_name != request_data.full_name.strip():
            user.full_name = request_data.full_name.strip()
            db.commit()

    points_per_item = REWARD_POINTS.get(request_data.category, 0)
    total_estimated = points_per_item * request_data.estimated_quantity

    new_request = models.PickupRequest(
        user_id=user.id,
        address=request_data.address,
        category=request_data.category,
        estimated_quantity=request_data.estimated_quantity,
        estimated_points=total_estimated,
        preferred_date=request_data.preferred_date,
        time_slot=request_data.time_slot,
        status="Pending",
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

    requests = (
        db.query(models.PickupRequest)
        .filter(models.PickupRequest.user_id == user.id)
        .order_by(models.PickupRequest.id.desc())
        .all()
    )

    # Compute total_points dynamically — the User.total_points column is never
    # updated by any write operation, so reading it would always return 0.
    total_points = sum(
        r.estimated_points for r in requests if r.status == "Completed"
    )

    return schemas.TrackingResponse(
        user=schemas.TrackingUser(
            full_name=user.full_name,
            total_points=total_points,
        ),
        requests=requests,
    )


@app.get("/api/requests/{req_id}", response_model=schemas.PickupRequestResponse)
def get_single_request(req_id: int, db: Session = Depends(get_db)):
    """Return a single request by ID — used by the track-by-ID search."""
    req = db.query(models.PickupRequest).filter(models.PickupRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail=f"Request #{req_id} not found.")
    return req


@app.post("/api/requests/{req_id}/cancel")
def cancel_request(req_id: int, db: Session = Depends(get_db)):
    """User-facing cancel — only allows Pending → Cancelled, no token required."""
    req = db.query(models.PickupRequest).filter(models.PickupRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail=f"Request #{req_id} not found.")
    if req.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail="Only Pending requests can be cancelled by users.",
        )
    req.status = "Cancelled"
    db.commit()
    return {"id": req.id, "status": req.status}


# ─── ADMIN ENDPOINTS (require X-Admin-Token header) ───────────────────────────

@app.patch(
    "/api/requests/{req_id}/status",
    dependencies=[Depends(verify_admin_token)],
)
def update_request_status(
    req_id: int,
    update: schemas.StatusUpdate,
    db: Session = Depends(get_db),
):
    req = db.query(models.PickupRequest).filter(models.PickupRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail=f"Request #{req_id} not found.")
    req.status = update.status
    db.commit()
    return {"id": req.id, "status": req.status}


@app.get(
    "/admin/requests",
    response_model=list[schemas.AdminPickupRequestResponse],
    dependencies=[Depends(verify_admin_token)],
)
def get_all_requests(db: Session = Depends(get_db)):
    requests = (
        db.query(models.PickupRequest)
        .options(joinedload(models.PickupRequest.owner))
        .order_by(models.PickupRequest.id.desc())
        .all()
    )
    return [
        schemas.AdminPickupRequestResponse(
            id=req.id,
            address=req.address,
            category=req.category,
            estimated_quantity=req.estimated_quantity,
            estimated_points=req.estimated_points,
            status=req.status,
            preferred_date=req.preferred_date,
            time_slot=req.time_slot,
            submitted_at=req.submitted_at,
            full_name=req.owner.full_name if req.owner else None,
            phone_number=req.owner.phone_number if req.owner else None,
        )
        for req in requests
    ]
