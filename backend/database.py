import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

database_url = os.getenv("DATABASE_URL", "sqlite:///./ewaste.db")

# Render's PostgreSQL connection strings use the legacy "postgres://" scheme.
# SQLAlchemy 2.x requires "postgresql://" — rewrite it transparently here.
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

is_sqlite = database_url.startswith("sqlite")

# check_same_thread is a SQLite-only argument — passing it to psycopg2 raises TypeError.
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    database_url,
    connect_args=connect_args,
    pool_pre_ping=True,   # Ping before using a pooled connection; reconnects if dropped.
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
