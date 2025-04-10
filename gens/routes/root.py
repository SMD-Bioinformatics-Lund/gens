"""API root."""


from fastapi import APIRouter
from gens import version


API_BASE_URL = "/api"


router = APIRouter(prefix=API_BASE_URL)


@router.get("/")
async def read_root():
    """Root welcome message."""
    return {
        "message": "Welcome to Gens API",
        "version": version,
    }
