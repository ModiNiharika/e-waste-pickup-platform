# ♻️ Eco-Collect: E-Waste Pickup & Reward Platform

A modern, full-stack web application designed to encourage responsible electronic waste disposal through an easy-to-use pickup scheduling system and an instant reward estimation engine.

## 🌟 Features

- **Effortless Scheduling**: Users can request a doorstep e-waste pickup in under 2 minutes.
- **Instant Reward Estimation**: A dynamic backend calculation engine estimates reward points based on the category and quantity of e-waste.
- **Admin API**: Secure backend endpoints to view and manage all incoming pickup requests.
- **Premium UI/UX**: A responsive, mobile-first frontend utilizing Glassmorphism design, vibrant green accents, and smooth micro-animations.
- **Robust Error Handling**: Pydantic data validation intercepts bad data, translating backend logic into user-friendly frontend messages.

## 💻 Tech Stack

- **Frontend**: HTML5, CSS3 (Vanilla, Glassmorphism), Vanilla JavaScript, Fetch API
- **Backend**: Python, FastAPI, Uvicorn
- **Database**: SQLite, SQLAlchemy (ORM)
- **Security**: `python-dotenv` for environment variables and secrets management

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites
- Python 3.8+ installed
- Git

### Installation

1. **Clone the repository** (if you have uploaded it to GitHub):
   ```bash
   git clone https://github.com/yourusername/e-waste-pickup-platform.git
   cd e-waste-pickup-platform
   ```

2. **Set up the Virtual Environment**:
   Isolate the project dependencies by creating a virtual environment.
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Backend Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Set up Environment Variables**:
   Create a `.env` file in the `backend` directory and add your local database URL:
   ```env
   DATABASE_URL=sqlite:///./ewaste.db
   ```

### Running the Application

1. **Start the Backend Server**:
   Ensure you are in the `backend` directory with your virtual environment activated, then run:
   ```bash
   uvicorn main:app --reload
   ```
   *The server will start on `http://127.0.0.1:8000`*

2. **Run the Frontend**:
   No server is required for the frontend! Simply double-click the `frontend/index.html` file to open it in your web browser.

3. **Explore the API (Swagger UI)**:
   FastAPI automatically generates interactive API documentation. Navigate to `http://127.0.0.1:8000/docs` in your browser to test the database endpoints directly.

## 🔮 Future Roadmap (Phase 2)
- Build a Recycler Dashboard for third-party verified collectors to claim pickups.
- Implement secure data-wiping certifications for corporate clients.
- Add real-time GPS tracking for pickup trucks.
