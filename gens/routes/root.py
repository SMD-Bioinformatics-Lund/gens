"""API root."""


from fastapi import APIRouter
from gens import version


router = APIRouter()


@router.get("/")
async def read_root():
    """Root welcome message."""
    return {
        "message": "Welcome to Gens API",
        "version": version,
    }
