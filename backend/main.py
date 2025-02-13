from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Set
import json
from handlers.canvas_handler import CanvasHandler
from handlers.document_handler import DocumentHandler
from handlers.image_handler import ImageHandler

app = FastAPI()

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize handlers
canvas_handler = CanvasHandler()
document_handler = DocumentHandler()
image_handler = ImageHandler()

# Connection manager for WebSocket connections
class ConnectionManager:
    def __init__(self):
        # Store active connections by project_id and file_id
        self.active_connections: Dict[str, Dict[str, Dict[str, WebSocket]]] = {}

    async def connect(self, websocket: WebSocket, project_id: str, file_id: str, user_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = {}
        if file_id not in self.active_connections[project_id]:
            self.active_connections[project_id][file_id] = {}
        self.active_connections[project_id][file_id][user_id] = websocket

    def disconnect(self, project_id: str, file_id: str, user_id: str):
        if (project_id in self.active_connections and 
            file_id in self.active_connections[project_id] and 
            user_id in self.active_connections[project_id][file_id]):
            del self.active_connections[project_id][file_id][user_id]

    async def broadcast_to_file(self, project_id: str, file_id: str, message: dict, exclude_user: str = None):
        if project_id in self.active_connections and file_id in self.active_connections[project_id]:
            for user_id, connection in self.active_connections[project_id][file_id].items():
                if user_id != exclude_user:
                    await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{project_id}/{file_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str, file_id: str, user_id: str):
    await manager.connect(websocket, project_id, file_id, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            file_type = data.get("file_type")
            
            # Process the update based on file type
            if file_type == "canvas":
                processed_data = canvas_handler.handle_update(project_id, file_id, data)
            elif file_type == "document":
                processed_data = document_handler.handle_update(project_id, file_id, data)
            elif file_type == "image":
                processed_data = image_handler.handle_update(project_id, file_id, data)
            else:
                processed_data = data
            
            # Broadcast the processed update to all other users in the same file
            await manager.broadcast_to_file(project_id, file_id, processed_data, exclude_user=user_id)
            
    except WebSocketDisconnect:
        manager.disconnect(project_id, file_id, user_id)
        # Notify other users about the disconnection
        await manager.broadcast_to_file(
            project_id,
            file_id,
            {
                "type": "disconnect",
                "user_id": user_id
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 