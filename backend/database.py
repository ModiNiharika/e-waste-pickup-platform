import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Look for a .env file and load its contents into the computer's memory
load_dotenv()

# 2. Ask the Operating System for the DATABASE_URL. 
# If it can't find it, use the string on the right as a safe backup.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ewaste.db")

# 3. Create the engine and session as usual
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
