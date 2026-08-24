from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import subprocess
import asyncio

from routers import admin, referee, public, registration

app = FastAPI(title="Palladio Play API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(admin.router)
app.include_router(referee.router)
app.include_router(public.router)
app.include_router(registration.router)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/live-scores")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We don't really expect messages from clients for live scores,
            # but we need to keep the connection open and receive pings/messages.
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/stream")
async def stream_endpoint(websocket: WebSocket, key: str = None):
    await websocket.accept()
    if not key:
        print("No stream key provided")
        await websocket.close(code=1008, reason="Stream key required")
        return

    rtmp_url = f"rtmp://a.rtmp.youtube.com/live2/{key}"
    print("Starting stream to YouTube...")

    ffmpeg_process = subprocess.Popen([
        'ffmpeg',
        '-i', '-', # Read from stdin
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-maxrate', '3000k',
        '-bufsize', '6000k',
        '-pix_fmt', 'yuv420p',
        '-g', '60',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-f', 'flv',
        rtmp_url
    ], stdin=subprocess.PIPE, stderr=subprocess.DEVNULL) # Redirect stderr to devnull to avoid log spam

    try:
        while True:
            data = await websocket.receive_bytes()
            if ffmpeg_process.poll() is None: # If process is still running
                try:
                    ffmpeg_process.stdin.write(data)
                    ffmpeg_process.stdin.flush()
                except BrokenPipeError:
                    break
            else:
                break
    except WebSocketDisconnect:
        print("Client disconnected, stopping stream")
    finally:
        if ffmpeg_process.poll() is None:
            ffmpeg_process.terminate()
            try:
                ffmpeg_process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                ffmpeg_process.kill()

# Helper function to trigger WS broadcast from other routers (e.g. referee.py)
# Note: For simplicity, we can inject the manager into the app state or import it.
# In a larger app, a message queue or event bus might be better.
app.state.ws_manager = manager

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(os.path.join(dist_path, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

@app.get("/{catchall:path}")
def serve_react_app(catchall: str):
    file_path = os.path.join(dist_path, catchall)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    index_path = os.path.join(dist_path, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
        
    return {"message": "Frontend not built yet. Run 'npm run build' in the frontend directory."}
