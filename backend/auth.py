# passlib → for password hashing
from passlib.context import CryptContext

# jose → for JWT tokens
from jose import jwt, JWTError

# used for expiry time
from datetime import datetime, timedelta

import os
from dotenv import load_dotenv

load_dotenv()

# secret key (must be in .env)
SECRET_KEY = os.getenv("SECRET_KEY")

# algorithm used for JWT encryption
ALGORITHM = "HS256"

# token expiry time
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# bcrypt hashing setup
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# -----------------------------
# Hash Password
# -----------------------------
def hash_password(password: str):
    # converts plain password into secure hash
    return pwd_context.hash(password)


# -----------------------------
# Verify Password
# -----------------------------
def verify_password(plain_password, hashed_password):
    # compares plain password with hashed one
    return pwd_context.verify(plain_password, hashed_password)


# -----------------------------
# Create Access Token
# -----------------------------
def create_access_token(data: dict):

    # copy data
    to_encode = data.copy()

    # add expiry time
    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    # add expiry inside token
    to_encode.update({"exp": expire})

    # create JWT
    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


# -----------------------------
# Decode Token
# -----------------------------
def decode_token(token: str):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        return None