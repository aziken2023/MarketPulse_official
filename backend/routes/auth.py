from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from passlib.context import CryptContext

router = APIRouter()

# Hashing passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

fake_users_db = {}  # Replace with a real database later

class UserRegister(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

@router.post("/register")
def register(user: UserRegister):
    if user.username in fake_users_db:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = pwd_context.hash(user.password)
    fake_users_db[user.username] = hashed_password
    return {"message": "User registered successfully"}

@router.post("/login")
def login(user: UserLogin):
    if user.username not in fake_users_db:
        raise HTTPException(status_code=400, detail="Invalid username")

    hashed_password = fake_users_db[user.username]
    if not pwd_context.verify(user.password, hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    return {"message": "Login successful"}
