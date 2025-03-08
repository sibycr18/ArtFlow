from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
import logging
import json
from datetime import datetime
import os
import time
from dotenv import load_dotenv
from database import (
    add_drawing_history, get_file_history, clear_file_history, 
    create_or_update_user, get_user_by_google_id,
    search_users_by_email, create_project, add_collaborator, 
    remove_collaborator, get_project_collaborators, get_project_by_id,
    create_project_via_rpc, get_user_projects, create_file, get_project_files,
    update_file, delete_file
)
import asyncio
from pydantic import BaseModel
import sys

# Load environment variables
load_dotenv()

# Create logs directory if it doesn't exist
if not os.path.exists('logs'):
    os.makedirs('logs')

# Configure logging with timestamp in filename
current_time = datetime.now().strftime('%Y%m%d_%H%M%S')
log_file = f'logs/artflow_{current_time}.log'

# Configure logging
logging.basicConfig(
    level=logging.WARNING,  # Set default level to WARNING
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

# Only set our application logger to INFO level
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Explicitly set third-party libraries to WARNING or higher
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("hpack").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)
logging.getLogger("fastapi").setLevel(logging.WARNING)

logger.info(f"Starting new session. Logging to {log_file}")

app = FastAPI()

# Add CORS middleware with production configuration
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Local development
    "https://art-flow-neon.vercel.app"  # Production frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "DELETE", "PUT"],
    allow_headers=["*"],
)

class UserData(BaseModel):
    email: str
    name: str
    picture: str
    google_id: str

class ProjectData(BaseModel):
    name: str
    admin_id: str

class CollaboratorData(BaseModel):
    project_id: str
    admin_id: str
    collaborator_id: str

class FileCreate(BaseModel):
    project_id: str
    name: str
    file_type: str
    
class FileUpdate(BaseModel):
    name: Optional[str] = None
    file_type: Optional[str] = None

@app.post("/auth/login")
async def login(user_data: UserData):
    try:
        # Create or update user in database
        db_user = await create_or_update_user({
            'email': user_data.email,
            'name': user_data.name,
            'picture': user_data.picture,
            'google_id': user_data.google_id
        })
        
        if not db_user:
            raise HTTPException(status_code=500, detail="Failed to create/update user")
        
        return {
            'status': 'success',
            'user': db_user
        }
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/search")
async def search_users(email: str):
    try:
        users = await search_users_by_email(email)
        return users
    except Exception as e:
        logger.error(f"User search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects")
async def create_new_project(project_data: ProjectData):
    try:
        # First try the standard approach
        logger.info(f"Attempting to create project: {project_data.name} with admin: {project_data.admin_id}")
        project = await create_project(project_data.name, project_data.admin_id)
        
        # If standard approach fails, try RPC approach
        if not project:
            logger.info(f"Standard project creation failed, trying RPC approach")
            project = await create_project_via_rpc(project_data.name, project_data.admin_id)
        
        if not project:
            raise HTTPException(status_code=500, detail="Failed to create project via both methods")
            
        return project
    except Exception as e:
        logger.error(f"Project creation error: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/collaborators")
async def add_project_collaborator(data: CollaboratorData):
    try:
        success = await add_collaborator(data.project_id, data.admin_id, data.collaborator_id)
        if not success:
            raise HTTPException(status_code=403, detail="Failed to add collaborator. Not authorized or project not found.")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Add collaborator error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/projects/collaborators")
async def remove_project_collaborator(data: CollaboratorData):
    try:
        success = await remove_collaborator(data.project_id, data.admin_id, data.collaborator_id)
        if not success:
            raise HTTPException(status_code=403, detail="Failed to remove collaborator. Not authorized or project not found.")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Remove collaborator error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/collaborators")
async def list_project_collaborators(project_id: str, user_id: str):
    try:
        collaborators = await get_project_collaborators(project_id, user_id)
        return collaborators
    except Exception as e:
        logger.error(f"List collaborators error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}")
async def get_project(project_id: str, user_id: str):
    try:
        project = await get_project_by_id(project_id, user_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found or access denied")
        return project
    except Exception as e:
        logger.error(f"Get project error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects")
async def get_projects(user_id: str):
    try:
        logger.info(f"Fetching projects for user: {user_id}")
        projects = await get_user_projects(user_id)
        return projects
    except Exception as e:
        logger.error(f"Get user projects error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, Dict[str, WebSocket]]] = {}
        self.drawing_history: Dict[str, Dict[str, List[dict]]] = {}
        self.logger = logging.getLogger("ConnectionManager")
        # Add a buffer for batch processing
        self._message_buffer: Dict[str, List[tuple]] = {}
        self._last_broadcast_time: Dict[str, float] = {}
        self.BATCH_INTERVAL = 0.016  # ~60fps, matching frontend throttle

    async def _process_message_buffer(self, project_id: str, file_id: str):
        """Process buffered messages in batches"""
        current_time = time.time()
        buffer_key = f"{project_id}:{file_id}"
        
        if buffer_key not in self._message_buffer:
            return
            
        if (buffer_key not in self._last_broadcast_time or 
            current_time - self._last_broadcast_time[buffer_key] >= self.BATCH_INTERVAL):
            
            messages = self._message_buffer[buffer_key]
            if not messages:
                return
                
            # Group messages by user
            user_messages: Dict[str, List[tuple]] = {}
            for user_id, message in messages:
                if user_id not in user_messages:
                    user_messages[user_id] = []
                user_messages[user_id].append(message)
            
            # Broadcast messages for each user
            for user_id, user_msgs in user_messages.items():
                if len(user_msgs) > 1:
                    # Batch multiple messages
                    batch_message = {
                        "type": "draw_batch",
                        "data": [msg["data"] for msg in user_msgs if msg["type"] == "draw"]
                    }
                    await self._broadcast_to_others_immediate(project_id, file_id, user_id, batch_message)
                else:
                    # Single message, send as is
                    await self._broadcast_to_others_immediate(project_id, file_id, user_id, user_msgs[0])
            
            # Clear the buffer
            self._message_buffer[buffer_key] = []
            self._last_broadcast_time[buffer_key] = current_time

    async def _broadcast_to_others_immediate(self, project_id: str, file_id: str, user_id: str, message: dict):
        """Immediate broadcast without buffering"""
        if project_id in self.active_connections and file_id in self.active_connections[project_id]:
            for other_user_id, websocket in self.active_connections[project_id][file_id].items():
                if other_user_id != user_id:
                    try:
                        await websocket.send_json(message)
                    except Exception as e:
                        self.logger.error(f"Error sending message to user {other_user_id}: {str(e)}")

    async def broadcast_to_others(self, project_id: str, file_id: str, user_id: str, message: dict):
        """Buffer messages for batch processing"""
        buffer_key = f"{project_id}:{file_id}"
        
        if message["type"] == "draw":
            # Buffer draw messages
            if buffer_key not in self._message_buffer:
                self._message_buffer[buffer_key] = []
            self._message_buffer[buffer_key].append((user_id, message))
            
            # Process buffer immediately
            await self._process_message_buffer(project_id, file_id)
        else:
            # Non-draw messages are sent immediately
            if message["type"] == "clear":
                await self.clear_history(project_id, file_id)
            await self._broadcast_to_others_immediate(project_id, file_id, user_id, message)

    async def connect(self, websocket: WebSocket, project_id: str, file_id: str, user_id: str):
        await websocket.accept()
        
        # Initialize connections
        if project_id not in self.active_connections:
            self.active_connections[project_id] = {}
        if file_id not in self.active_connections[project_id]:
            self.active_connections[project_id][file_id] = {}
            
        # Store the connection
        self.active_connections[project_id][file_id][user_id] = websocket
        
        # Get history from database and send to new user
        history_entries = await get_file_history(project_id, file_id)
        if history_entries:
            await websocket.send_json({
                "type": "history_sync",
                "data": {
                    "fileId": file_id,
                    "entries": history_entries
                }
            })
        
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

    def get_history_stats(self):
        """Get current history statistics"""
        stats = {
            "total_projects": len(self.drawing_history),
            "projects": {}
        }
        for project_id, files in self.drawing_history.items():
            stats["projects"][project_id] = {
                "total_files": len(files),
                "files": {}
            }
            for file_id, entries in files.items():
                stats["projects"][project_id]["files"][file_id] = len(entries)
        return stats

    def add_to_history(self, project_id: str, file_id: str, user_id: str, drawing_data: dict):
        """Add a drawing entry to the history"""
        self.logger.info(f"=== Adding to History ===")
        self.logger.info(f"Project: {project_id}, File: {file_id}, User: {user_id}")
        
        # Add to in-memory history
        if project_id not in self.drawing_history:
            self.drawing_history[project_id] = {}
        if file_id not in self.drawing_history[project_id]:
            self.drawing_history[project_id][file_id] = []
            
        history_entry = {
            "userId": user_id,
            "timestamp": drawing_data.get("timestamp", datetime.now().timestamp() * 1000),
            "data": drawing_data
        }
        
        self.drawing_history[project_id][file_id].append(history_entry)
        
        # Add to database
        asyncio.create_task(add_drawing_history(
            project_id,
            file_id,
            user_id,
            drawing_data,
            history_entry["timestamp"]
        ))
        
        # Log verification
        current_count = len(self.drawing_history[project_id][file_id])
        self.logger.info(f"=== History Update Verification ===")
        self.logger.info(f"Current entry count for {project_id}/{file_id}: {current_count}")
        self.logger.info(f"Latest entry: {json.dumps(history_entry, indent=2)}")

    async def clear_history(self, project_id: str, file_id: str):
        """Clear the drawing history for a specific file"""
        if project_id in self.drawing_history and file_id in self.drawing_history[project_id]:
            self.drawing_history[project_id][file_id] = []
            # Clear database history
            await clear_file_history(project_id, file_id)
            self.logger.info(f"Cleared history for Project: {project_id}, File: {file_id}")

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
                elif message_type == "draw":
                    # Log the drawing data structure
                    logger.info("\n=== Received Drawing Data ===")
                    logger.info(f"From User: {user_id}")
                    logger.info(f"Project: {project_id}, File: {file_id}")
                    logger.info(f"Full message structure: {json.dumps(data, indent=2)}")
                    
                    # Verify the data structure
                    drawing_data = data.get('data')
                    logger.info(f"\nDrawing data extracted: {json.dumps(drawing_data, indent=2)}")
                    
                    if not drawing_data:
                        logger.error("No drawing data found in message")
                        continue
                    
                    # Broadcast drawing data to others first
                    logger.info("\nBroadcasting draw message...")
                    await manager.broadcast_to_others(project_id, file_id, user_id, data)
                    
                    # Then store in history
                    manager.add_to_history(project_id, file_id, user_id, drawing_data)
                    
                    # Verify history after storage
                    project_history = manager.drawing_history.get(project_id, {})
                    file_history = project_history.get(file_id, [])
                    logger.info(f"History entries after storage: {len(file_history)}")
                    
                elif message_type == "clear":
                    logger.debug(f"Broadcasting clear message from User {user_id}")
                    await manager.broadcast_to_others(project_id, file_id, user_id, data)
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

# Debug endpoints
@app.get("/debug/list")
async def list_available_history():
    """List all available projects and files"""
    result = []
    for project_id, files in manager.drawing_history.items():
        project_info = {
            "project_id": project_id,
            "files": []
        }
        for file_id, entries in files.items():
            project_info["files"].append({
                "file_id": file_id,
                "entry_count": len(entries)
            })
        result.append(project_info)
    
    return {
        "available_data": result,
        "message": "Use these IDs with /debug/history/{project_id}/{file_id} to view specific history"
    }

@app.get("/debug/history")
async def get_all_history():
    """Get all drawing history data across all projects and files"""
    logger.info("=== Accessing All History ===")
    stats = manager.get_history_stats()
    logger.info(f"Current history stats: {json.dumps(stats, indent=2)}")
    
    return {
        "history": manager.drawing_history,
        "stats": stats,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/debug/history/{project_id}")
async def get_project_history(project_id: str):
    """Get drawing history for a specific project"""
    return manager.drawing_history.get(project_id, {})

@app.get("/debug/history/{project_id}/{file_id}")
async def get_file_history(project_id: str, file_id: str):
    """Get drawing history for a specific file"""
    logger.info(f"=== Accessing File History ===")
    logger.info(f"Requested - Project: {project_id}, File: {file_id}")
    
    # Check if the project exists
    if project_id not in manager.drawing_history:
        available_projects = list(manager.drawing_history.keys())
        return {
            "error": "Project not found",
            "requested_project": project_id,
            "available_projects": available_projects,
            "message": f"Project '{project_id}' not found. Available projects: {available_projects}"
        }
    
    # Check if the file exists in the project
    if file_id not in manager.drawing_history[project_id]:
        available_files = list(manager.drawing_history[project_id].keys())
        return {
            "error": "File not found",
            "requested_project": project_id,
            "requested_file": file_id,
            "available_files_in_project": available_files,
            "message": f"File '{file_id}' not found in project '{project_id}'. Available files: {available_files}"
        }
    
    file_history = manager.drawing_history[project_id][file_id]
    
    response_data = {
        "file_id": file_id,
        "project_id": project_id,
        "entry_count": len(file_history),
        "entries": file_history,
        "timestamp": datetime.now().isoformat()
    }
    
    logger.info(f"Found {len(file_history)} entries")
    if file_history:
        logger.info(f"First entry: {json.dumps(file_history[0], indent=2)}")
        logger.info(f"Last entry: {json.dumps(file_history[-1], indent=2)}")
    
    return response_data

@app.get("/debug/connections")
async def get_active_connections():
    """Get information about active connections"""
    connections_info = {}
    for project_id, files in manager.active_connections.items():
        connections_info[project_id] = {}
        for file_id, users in files.items():
            connections_info[project_id][file_id] = list(users.keys())
    return connections_info

@app.post("/files")
async def create_file_endpoint(file_data: FileCreate, user_id: Optional[str] = None):
    try:
        file = await create_file(
            project_id=file_data.project_id,
            name=file_data.name,
            file_type=file_data.file_type,
            user_id=user_id if user_id else "00000000-0000-0000-0000-000000000000"
        )
        return file
    except Exception as e:
        logger.error(f"Create file error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files")
async def get_files(project_id: str):
    try:
        files = await get_project_files(project_id)
        return files
    except Exception as e:
        logger.error(f"Get files error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/files/{file_id}")
async def update_file_endpoint(file_id: str, file_data: FileUpdate):
    try:
        updated_file = await update_file(
            file_id=file_id,
            updates=file_data.dict(exclude_unset=True)
        )
        return updated_file
    except Exception as e:
        logger.error(f"Update file error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/files/{file_id}")
async def delete_file_endpoint(file_id: str):
    try:
        success = await delete_file(file_id)
        if not success:
            raise HTTPException(status_code=404, detail="File not found")
        return {"message": "File deleted successfully"}
    except Exception as e:
        logger.error(f"Delete file error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug") 