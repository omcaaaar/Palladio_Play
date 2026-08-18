#!/bin/bash

# Kill any existing processes on these ports just in case
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "Starting Backend API (FastAPI) on port 8000..."
cd backend
source venv/bin/activate
# Run in background
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "Starting Frontend App (Vite React) on port 5173..."
cd frontend
# Run in foreground
npm run dev

# When frontend stops, kill backend
kill $BACKEND_PID
