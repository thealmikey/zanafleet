"""FastAPI application for intent classification service."""

from fastapi import FastAPI

from .handlers import router

app = FastAPI(
    title="Worker",
    description="NLP Intent Classification Service for ZanaFleet",
    version="0.1.0",
)

app.include_router(router)


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy"}
