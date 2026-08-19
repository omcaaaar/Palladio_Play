#!/bin/bash

# Function to clean up background processes on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Done."
    exit 0
}

# Trap SIGINT (Ctrl+C) and call the cleanup function
trap cleanup SIGINT

echo "Cleaning up old processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "==================================="
echo "1. Building Frontend Apps..."
echo "==================================="
cd frontend
npm run build
cd ..

echo "==================================="
echo "2. Starting Backend API (FastAPI)..."
echo "==================================="
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "==================================="
echo "3. Starting Frontend Dev Server..."
echo "==================================="
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "==================================="
echo "4. Starting Ngrok Tunnel..."
echo "==================================="
echo "Your STABLE, permanent link will be: https://genre-kudos-turbojet.ngrok-free.dev"
ngrok http --domain=genre-kudos-turbojet.ngrok-free.dev 8000
