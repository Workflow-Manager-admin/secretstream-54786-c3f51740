from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
from threading import Lock

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


# In-memory storage for secrets (list of dicts).
SECRETS = []
SECRETS_LOCK = Lock()
MAX_SECRETS = 1000   # For efficiency, limit to most recent 1000 secrets


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
def submit_secret(secret_in: SecretIn):
    """
    Receives a secret (text) and adds it to the in-memory store. Returns the saved secret with a generated ID.
    """
    with SECRETS_LOCK:
        secret_id = len(SECRETS) + 1
        secret = {"id": secret_id, "text": secret_in.text}
        SECRETS.append(secret)
        # Maintain recent MAX_SECRETS only (for memory efficiency)
        if len(SECRETS) > MAX_SECRETS:
            SECRETS.pop(0)

    return secret


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
def get_secrets(limit: int = 20):
    """
    Retrieves the most recent N secrets, up to the provided limit (default: 20, max: 100).
    """
    if not isinstance(limit, int) or limit < 1:
        raise HTTPException(
            status_code=400,
            detail="Limit must be a positive integer."
        )
    capped_limit = min(limit, 100)
    with SECRETS_LOCK:
        # Get the most recent secrets (newest last)
        start_index = max(len(SECRETS) - capped_limit, 0)
        selected = SECRETS[start_index:]
        # Return newest first
        return list(
            reversed(selected)
        )
