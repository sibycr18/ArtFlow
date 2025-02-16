from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict
import logging
import json
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get port from environment variable (for Heroku compatibility)
PORT = int(os.getenv("PORT", 8000))

# Create logs directory if it doesn't exist
if not os.path.exists('logs'):
    os.makedirs('logs')

# Configure logging with timestamp in filename
current_time = datetime.now().strftime('%Y%m%d_%H%M%S')
log_file = f'logs/artflow_{current_time}.log'

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()  # Keep console output as well
    ]
)
logger = logging.getLogger(__name__)

logger.info(f"Starting new session. Logging to {log_file}")

app = FastAPI()

# Get allowed origins from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        # Store active connections by project_id and file_id
        self.active_connections: Dict[str, Dict[str, Dict[str, WebSocket]]] = {}
        self.logger = logging.getLogger("ConnectionManager")

    async def connect(self, websocket: WebSocket, project_id: str, file_id: str, user_id: str):
        await websocket.accept()
        
        # Initialize nested dictionaries if they don't exist
        if project_id not in self.active_connections:
            self.active_connections[project_id] = {}
        if file_id not in self.active_connections[project_id]:
            self.active_connections[project_id][file_id] = {}
            
        # Store the connection
        self.active_connections[project_id][file_id][user_id] = websocket
        self.logger.info(f"Client connected. Project: {project_id}, File: {file_id}, User: {user_id}")
        
        # Print all active users
        self.logger.info("Current active users:")
        for p_id, files in self.active_connections.items():
            for f_id, users in files.items():
                self.logger.info(f"Project {p_id}, File {f_id}:")
                for u_id in users.keys():
                    self.logger.info(f"  - User: {u_id}")

    def disconnect(self, project_id: str, file_id: str, user_id: str):
        if project_id in self.active_connections:
            if file_id in self.active_connections[project_id]:
                self.active_connections[project_id][file_id].pop(user_id, None)
                if not self.active_connections[project_id][file_id]:
                    self.active_connections[project_id].pop(file_id)
            if not self.active_connections[project_id]:
                self.active_connections.pop(project_id)
        self.logger.info(f"Client disconnected. Project: {project_id}, File: {file_id}, User: {user_id}")
        
        # Print remaining active users
        self.logger.info("Remaining active users:")
        for p_id, files in self.active_connections.items():
            for f_id, users in files.items():
                self.logger.info(f"Project {p_id}, File {f_id}:")
                for u_id in users.keys():
                    self.logger.info(f"  - User: {u_id}")

    async def broadcast_to_others(self, project_id: str, file_id: str, user_id: str, message: dict):
        """Broadcast message to all users in the same file except the sender"""
        self.logger.debug(f"Broadcasting message. Project: {project_id}, File: {file_id}, From User: {user_id}")
        self.logger.debug(f"Message content: {message}")
        self.logger.debug(f"Active connections: {self.active_connections}")
        
        if project_id in self.active_connections and file_id in self.active_connections[project_id]:
            other_users = [uid for uid in self.active_connections[project_id][file_id].keys() if uid != user_id]
            self.logger.debug(f"Found {len(other_users)} other users to broadcast to: {other_users}")
            
            for other_user_id, websocket in self.active_connections[project_id][file_id].items():
                if other_user_id != user_id:  # Don't send back to the sender
                    try:
                        self.logger.debug(f"Sending to user {other_user_id}")
                        await websocket.send_json(message)
                        self.logger.debug(f"Successfully sent to user {other_user_id}")
                    except Exception as e:
                        self.logger.error(f"Error sending message to user {other_user_id}: {str(e)}")
        else:
            self.logger.warning(f"No active connections found for Project: {project_id}, File: {file_id}")

manager = ConnectionManager()

@app.websocket("/ws/{project_id}/{file_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str, file_id: str, user_id: str):
    try:
        logger.info(f"New WebSocket connection request. Project: {project_id}, File: {file_id}, User: {user_id}")
        await manager.connect(websocket, project_id, file_id, user_id)
        logger.info(f"WebSocket connection established for User: {user_id}")
        
        while True:
            try:
                # Wait for messages
                data = await websocket.receive_json()
                logger.debug(f"Received message from User {user_id}: {data}")
                
                message_type = data.get("type")
                logger.debug(f"Message type: {message_type}")
                
                if message_type == "init":
                    # Send confirmation
                    logger.debug(f"Sending connection confirmation to User {user_id}")
                    await websocket.send_json({
                        "type": "connected",
                        "data": {
                            "project_id": project_id,
                            "file_id": file_id,
                            "user_id": user_id
                        }
                    })
                elif message_type in ["draw", "clear"]:
                    # Broadcast drawing data to others
                    logger.debug(f"Broadcasting {message_type} message from User {user_id}")
                    await manager.broadcast_to_others(project_id, file_id, user_id, data)
                    logger.debug(f"Broadcast complete for {message_type} message")
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": "Error processing message",
                        "error": str(e)
                    }
                })
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        logger.info(f"Cleaning up connection for User {user_id}")
        manager.disconnect(project_id, file_id, user_id)

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="debug") 