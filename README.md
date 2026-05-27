# Eco-Collect — E-Waste Pickup Platform

A full-stack web application that lets users schedule free doorstep e-waste pickups and earn reward points. Admins manage the complete request lifecycle through a dedicated dashboard.

---

## Features

### User
- **Phone-based login** — no passwords; instant access via 10-digit phone number
- **Schedule pickups** — choose category, quantity, address, preferred date, and time slot
- **Live status tracking** — visual timeline across Pending → Accepted → Pickup Scheduled → Completed
- **Reward points** — estimated at submission, credited on completion
- **Track by phone or ID** — search all your requests or look up one by its request ID
- **Recycling certificate** — printable certificate for every completed pickup
- **Personal dashboard** — total requests, completed count, and points earned at a glance

### Admin
- **Secure admin login** — separate access code, isolated from user sessions
- **Full request list** — search by ID, category, or address; filter by phone number
- **5-stage status workflow** — Accept → Schedule Pickup → Complete; Cancel at any stage; reset Cancelled back to Pending
- **Request detail modal** — customer name, phone, address, category, quantity, pickup date, time slot, and points in one view
- **Stats bar** — live counts for Total, Active, Completed, and Cancelled
- **Status filter tabs** — All | Pending | Accepted | Pickup Scheduled | Completed | Cancelled
- **Export CSV** — one-click download of all request data, opens correctly in Excel and Google Sheets

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, Uvicorn |
| Database | SQLite, SQLAlchemy 2.x, Pydantic v2 |
| Frontend | HTML5, CSS3, Vanilla JavaScript |

No frontend framework — the entire UI is plain HTML/CSS/JS served as static files.

---

## Project Structure

```
e-waste-pickup-platform/
│
├── backend/
│   ├── main.py          # FastAPI app — all 3 API endpoints
│   ├── models.py        # SQLAlchemy ORM models (User, PickupRequest)
│   ├── schemas.py       # Pydantic request/response schemas with validation
│   ├── database.py      # DB engine and session setup
│   ├── requirements.txt
│   └── ewaste.db        # SQLite database (auto-created on first run)
│
└── frontend/
    ├── home.html        # Landing page and user dashboard
    ├── login.html       # Standalone login / signup
    ├── index.html       # Schedule a pickup form
    ├── track.html       # Track requests by phone or ID
    ├── track.js         # Tracking logic, status timeline, certificate
    ├── admin-login.html # Admin access code gate
    ├── admin.html       # Admin dashboard
    ├── auth.js          # Auth helpers, navbar injection, shared API_BASE
    ├── app.js           # Pickup form submission and validation
    └── style.css        # Global styles and design system
```

---

## API Endpoints

### `POST /api/requests`
Submit a new pickup request.

**Request body**
```json
{
  "full_name": "Niharika Modi",
  "phone_number": "9876543210",
  "address": "123 Green Street, Hyderabad",
  "category": "Mobile",
  "estimated_quantity": 2
}
```

Valid categories: `Mobile` · `Laptop` · `Accessories` · `Large Appliances`

**Response `200`**
```json
{
  "id": 42,
  "address": "123 Green Street, Hyderabad",
  "category": "Mobile",
  "estimated_quantity": 2,
  "estimated_points": 400,
  "status": "Pending",
  "submitted_at": "2026-05-27T14:30:00"
}
```

---

### `GET /api/requests/track?phone={phone}`
Fetch all requests for a phone number, along with the user profile and total points.

**Response `200`**
```json
{
  "user": {
    "full_name": "Niharika Modi",
    "total_points": 400
  },
  "requests": [
    {
      "id": 42,
      "category": "Mobile",
      "address": "123 Green Street, Hyderabad",
      "estimated_quantity": 2,
      "estimated_points": 400,
      "status": "Pending",
      "submitted_at": "2026-05-27T14:30:00"
    }
  ]
}
```

Returns `404` if no account exists for the given phone number.

---

### `GET /admin/requests`
Return all pickup requests across all users, ordered newest first.

**Response `200`** — array of request objects (same shape as the `POST` response).

---

## Reward Points

| Category | Points per item |
|---|---|
| Mobile Phones | 200 pts |
| Laptops | 500 pts |
| Accessories | 50 pts |
| Large Appliances | 1,000 pts |

Points are multiplied by quantity — submitting 2 laptops earns **1,000 pts**.

---

## Running Locally

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API starts at `http://127.0.0.1:8000`.  
Interactive Swagger docs: `http://127.0.0.1:8000/docs`  
The SQLite database is created automatically on first run — no setup needed.

### 2. Frontend

The frontend is plain static HTML with no build step required.

**Option A — VS Code Live Server** (recommended)  
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, right-click `frontend/home.html`, and choose **Open with Live Server**.

**Option B — Python file server**
```bash
cd frontend
python -m http.server 5500
```
Open `http://localhost:5500/home.html` in your browser.

> Make sure the backend is running before opening the frontend. The API base URL is set in `frontend/auth.js` and defaults to `http://127.0.0.1:8000`.

### 3. Admin dashboard

Navigate to `admin-login.html` and enter:

```
ECO-ADMIN-2024
```

---

## Demo Credentials

| Role | How to access |
|---|---|
| User | Any 10-digit phone number on the home page. New users are registered automatically. |
| Admin | Open `admin-login.html` and enter access code `ECO-ADMIN-2024`. |

---

## Future Improvements

- **Persistent status updates** — `PATCH /api/requests/{id}/status` endpoint so admin changes survive page refreshes without localStorage
- **JWT admin authentication** — token-based auth instead of a shared static access code
- **SMS / email notifications** — alert users when their request status changes
- **Pagination** — handle large request volumes gracefully in the admin dashboard
- **Analytics view** — charts for request volume, category breakdown, and points distributed over time
- **Multi-admin support** — individual admin accounts with role-based access control
- **Mobile app** — React Native or Flutter client on top of the same FastAPI backend
