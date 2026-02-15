# import os → used to read environment variables
import os

# load_dotenv → reads .env file
from dotenv import load_dotenv

# create_engine → creates database connection
from sqlalchemy import create_engine

# sessionmaker → used to talk to database
# declarative_base → used to create models
from sqlalchemy.orm import sessionmaker, declarative_base

# load values from .env file
load_dotenv()

# get DATABASE_URL from .env
DATABASE_URL = os.getenv("DATABASE_URL")

# create engine (connection to database)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # needed for SQLite
)

# SessionLocal → used to perform database operations
SessionLocal = sessionmaker(
    autocommit=False,  # we manually commit changes
    autoflush=False,
    bind=engine
)

# Base → parent class for all models
Base = declarative_base()