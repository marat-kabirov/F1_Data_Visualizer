# F1 Race Analyzer API
Pet-project for tracking Formula 1 sessions using FastAPI and OpenF1 API.

## Features
* **In-memory caching**: Data is pre-loaded on startup for instant search.
* **Pydantic Validation**: Strict data typing for race information.
* **FastAPI Backend**: Modern and fast Python web-framework.

## How to run
1. Install requirements: `pip install fastapi uvicorn requests`
2. Run server: `python -m uvicorn main:app --reload`