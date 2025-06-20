from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
from sqlalchemy import create_engine, Column, Integer, String, desc
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, scoped_session

# Database setup
DATABASE_URL = "sqlite:///./secrets.db"
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
Base = declarative_base()
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))


class SecretModel(Base):
    __tablename__ = "secrets"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    text = Column(String(1000), nullable=False, index=True)


# Create secrets table if it doesn't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SecretStream API",
    description=(
        "An API to anonymously share and view secrets. "
        "Allows submission and retrieval of secret texts "
        "without authentication."
    ),
    version="1.0.0",
    openapi_tags=[
        {
            "name": "secrets",
            "description": "Endpoints for submitting and retrieving anonymous secrets."
        }
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SecretIn(BaseModel):
    """
    Pydantic model for incoming secret submissions.
    """
    text: str = Field(
        ...,
        description="The secret text to be shared anonymously.",
        min_length=1,
        max_length=1000
    )


class SecretOut(BaseModel):
    """
    Pydantic model for secrets returned from the API.
    """
    id: int = Field(
        ...,
        description="An internal ID for the secret (not tied to identity)."
    )
    text: str = Field(
        ...,
        description="The secret text that was shared anonymously."
    )


MAX_SECRETS = 1000   # For efficiency, limit to most recent 1000 secrets


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# PUBLIC_INTERFACE
@app.get("/", tags=["health"])
def health_check():
    """
    Health check route to verify the API is running.
    """
    return {"message": "Healthy"}


# PUBLIC_INTERFACE
@app.post(
    "/secrets",
    response_model=SecretOut,
    summary="Submit a new secret",
    description=(
        "Submits a secret text to be shared anonymously. "
        "No authentication, user, or IP is tracked."
    ),
    tags=["secrets"],
    response_description="The saved secret.",
)
def submit_secret(secret_in: SecretIn, db: Session = Depends(get_db)):
    """
    Receives a secret (text) and adds it to the database. Returns the saved secret with a generated ID.
    """
    # Enforce the recent MAX_SECRETS constraint (remove oldest if over limit)
    count = db.query(SecretModel).count()
    if count >= MAX_SECRETS:
        # Delete the oldest secret(s) if the limit is reached
        oldest_count = count - MAX_SECRETS + 1
        oldest = (
            db.query(SecretModel)
            .order_by(SecretModel.id.asc())
            .limit(oldest_count)
            .all()
        )
        for s in oldest:
            db.delete(s)
        db.commit()

    secret = SecretModel(text=secret_in.text)
    db.add(secret)
    db.commit()
    db.refresh(secret)
    return SecretOut(
        id=secret.id,
        text=secret.text
    )

# PUBLIC_INTERFACE
@app.get(
    "/secrets",
    response_model=List[SecretOut],
    summary="Get recent secrets",
    description=(
        "Returns a list of recently submitted secrets, ordered from newest to oldest. "
        "No authentication required."
    ),
    tags=["secrets"],
    response_description="A list of secrets submitted anonymously.",
)
def get_secrets(limit: int = 20, db: Session = Depends(get_db)):
    """
    Retrieves the most recent N secrets from the database, up to the provided limit
    (default: 20, max: 100).
    """
    if not isinstance(limit, int) or limit < 1:
        raise HTTPException(
            status_code=400,
            detail="Limit must be a positive integer."
        )
    capped_limit = min(limit, 100)
    secrets = (
        db.query(SecretModel)
        .order_by(desc(SecretModel.id))
        .limit(capped_limit)
        .all()
    )
    return [
        SecretOut(
            id=secret.id,
            text=secret.text,
        )
        for secret in secrets
    ]
