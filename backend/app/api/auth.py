import logging

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse
from app.services.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# OpenAPI request-body declaration for /login so the docs advertise both the
# OAuth2 form body (used by Swagger UI's Authorize dialog) and the JSON body
# (used by programmatic clients).
_login_request_body = {
    "content": {
        "application/json": {
            "schema": {
                "type": "object",
                "properties": {
                    "username": {"type": "string", "description": "Username or email"},
                    "password": {"type": "string", "description": "Plain-text password"},
                },
                "required": ["username", "password"],
            }
        },
        "application/x-www-form-urlencoded": {
            "schema": {
                "type": "object",
                "properties": {
                    "username": {"type": "string", "description": "Username or email"},
                    "password": {"type": "string", "description": "Plain-text password"},
                },
                "required": ["username", "password"],
            }
        },
    },
    "required": True,
}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(request: UserRegister, db: Session = Depends(get_db)) -> User:
    """Register a new user account."""
    # Check for duplicate username
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already registered",
        )

    # Check for duplicate email
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create user
    user = User(
        username=request.username,
        email=request.email,
        hashed_password=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"User registered: {user.username}")
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    openapi_extra={"requestBody": _login_request_body},
)
async def login(
    request: Request,
    db: Session = Depends(get_db),
    username: str | None = Form(default=None),
    password: str | None = Form(default=None),
) -> TokenResponse:
    """Authenticate a user and return a JWT access token.

    Accepts credentials either as a JSON body (``{"username", "password"}``)
    or as ``application/x-www-form-urlencoded`` fields, so Swagger UI's
    OAuth2 (password flow) Authorize dialog works out of the box.
    """
    # Optional JSON body (application/json)
    json_username: str | None = None
    json_password: str | None = None
    if request.headers.get("content-type", "").startswith("application/json"):
        try:
            body = await request.json()
        except Exception:
            body = None
        if isinstance(body, dict):
            json_username = body.get("username")
            json_password = body.get("password")

    # Form fields take precedence, JSON body as fallback
    final_username = username if username is not None else json_username
    final_password = password if password is not None else json_password

    if not final_username or not final_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="username and password are required (JSON body or form fields)",
        )

    login_data = UserLogin(username=final_username, password=final_password)

    # Find user by username or email
    user = db.query(User).filter(
        (User.username == login_data.username) | (User.email == login_data.username)
    ).first()

    if user is None or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    # Create token
    access_token = create_access_token(data={"sub": user.username})
    logger.info(f"User logged in: {user.username}")

    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    """Return the currently authenticated user's profile."""
    return current_user
