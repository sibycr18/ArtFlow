from fastapi import FastAPI, WebSocket, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional, Union, Any
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
    update_file, delete_file, add_project_message, get_project_messages,
    delete_project
)
import asyncio
from pydantic import BaseModel
import sys
import redis

# Load environment variables
load_dotenv()

# Initialize Redis client if enabled
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "false").lower() == "true"
redis_client = None

# Global variables
redis_event_buffer = {}
last_redis_flush_time = time.time()
REDIS_FLUSH_INTERVAL = 5  # Flush buffer to Redis every 5 seconds

# Document connections
document_connections = {}  # Key: "project_id:file_id", Value: {user_id: websocket}

if REDIS_ENABLED:
    try:
        REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
        REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
        REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
        
        # Create Redis connection
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            ssl=True if "upstash.io" in REDIS_HOST else False,  # Use SSL for Upstash
            decode_responses=True  # Match persistence service settings
        )
        
        # Test connection
        redis_client.ping()
        logging.info(f"Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
    except Exception as e:
        logging.error(f"Failed to connect to Redis: {str(e)}")
        REDIS_ENABLED = False
        redis_client = None

# Helper function to add an event to the buffer
def add_to_redis_buffer(event):
    """Add event to buffer for batched processing"""
    project_id = event["project_id"]
    file_id = event["file_id"]
    
    # Initialize buffer structure if needed
    if project_id not in redis_event_buffer:
        redis_event_buffer[project_id] = {}
    if file_id not in redis_event_buffer[project_id]:
        redis_event_buffer[project_id][file_id] = []
    
    # Add to buffer
    redis_event_buffer[project_id][file_id].append(event)
    logger.debug(f"Added {event['event_type']} event to buffer for {project_id}/{file_id}")

# Helper function to flush the buffer to Redis
async def flush_redis_buffer():
    """Push all buffered events to Redis and clear the buffer"""
    global last_redis_flush_time
    
    if not REDIS_ENABLED or redis_client is None:
        # Clear buffer if Redis is not available to prevent memory growth
        redis_event_buffer.clear()
        return
    
    try:
        total_events = 0
        batch_count = 0
        
        # Process buffer project by project, file by file
        for project_id, files in redis_event_buffer.items():
            for file_id, events in files.items():
                if not events:
                    continue
                
                batch_count += 1
                events_count = len(events)
                total_events += events_count
                
                if events_count == 1:
                    # Single event - no need for batching
                    event_json = json.dumps(events[0])
                    redis_client.lpush('drawing_events_queue', event_json)
                    logger.debug(f"Flushed single event for {project_id}/{file_id}")
                else:
                    # Multiple events - create a batch
                    batch = {
                        "project_id": project_id,
                        "file_id": file_id,
                        "event_type": "batch",
                        "events": events,
                        "count": events_count,
                        "timestamp": time.time() * 1000
                    }
                    batch_json = json.dumps(batch)
                    redis_client.lpush('drawing_events_queue', batch_json)
                    logger.info(f"Flushed batch of {events_count} events for {project_id}/{file_id}")
        
        # Clear buffer after successful flush
        redis_event_buffer.clear()
        
        # Trim queue occasionally
        if total_events > 0:
            redis_client.ltrim('drawing_events_queue', 0, 4999)  # Keep last 5000 events
            
        if batch_count > 0:
            logger.info(f"Redis buffer flush complete: {total_events} events in {batch_count} batches")
            
        last_redis_flush_time = time.time()
            
    except Exception as e:
        logger.error(f"Error flushing Redis buffer: {str(e)}")
        # Don't clear buffer on error to retry on next flush

# Helper function that checks if it's time to flush and triggers flush if needed
async def check_and_flush_redis_buffer():
    """Check if it's time to flush the buffer and do so if needed"""
    current_time = time.time()
    if (current_time - last_redis_flush_time) >= REDIS_FLUSH_INTERVAL:
        await flush_redis_buffer()

# Helper function to handle adding event to Redis (now using buffer)
async def push_to_redis_queue(event):
    """
    Add event to buffer for batched processing to Redis.
    This implementation batches events but does not block the caller.
    """
    if not REDIS_ENABLED:
        return
        
    try:
        # Special case for clear events - flush immediately
        if event['event_type'] == 'clear':
            # First flush existing buffer for this project/file
            await flush_redis_buffer()
            
            # Then send the clear event directly
            event_json = json.dumps(event)
            redis_client.lpush('drawing_events_queue', event_json)
            logger.info(f"Sent clear event directly to Redis for {event['project_id']}/{event['file_id']}")
            return
        
        # For drawing events, add to buffer
        add_to_redis_buffer(event)
        
        # Check if it's time to flush the buffer
        await check_and_flush_redis_buffer()
            
    except Exception as e:
        logger.error(f"Error in Redis queue operation: {str(e)}")

# Create logs directory if it doesn't exist
if not os.path.exists('logs'):
    os.makedirs('logs')

# Use a consistent log file name instead of one with timestamp
log_file = 'logs/artflow.log'

# Configure logging
logging.basicConfig(
    level=logging.WARNING,  # Set default level to WARNING
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, mode='a'),  # Use append mode
        logging.StreamHandler(sys.stdout)
    ]
)

# Log startup with a clear separator for new sessions
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Explicitly set third-party libraries to WARNING or higher
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("hpack").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)
logging.getLogger("fastapi").setLevel(logging.WARNING)

logger.info("="*50)
logger.info(f"Starting new session at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
logger.info("="*50)

app = FastAPI()

# Add CORS middleware with production configuration
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Local development
    "http://localhost:5174",
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

class ProjectMessageData(BaseModel):
    project_id: str
    user_id: str
    content: str

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
        # Removed batch processing code

    async def _broadcast_to_others_immediate(self, project_id: str, file_id: str, user_id: str, message: dict):
        """
        Immediate broadcast without buffering - optimized for minimal latency
        This is the critical real-time path and should be as fast as possible
        """
        # Quick check if we have anyone to send to
        if project_id not in self.active_connections or file_id not in self.active_connections[project_id]:
            return
        
        # Get a direct reference to avoid dict lookups in the loop
        connections = self.active_connections[project_id][file_id]
        
        # Track disconnected clients to clean up after broadcasting
        disconnected_clients = []
        
        # Create a list of send tasks
        send_tasks = []
        send_targets = {}
        
        # Gather all send operations without awaiting them yet
        for other_user_id, websocket in connections.items():
            if other_user_id != user_id:
                # Add the send task to our list without awaiting
                task = websocket.send_json(message)
                send_tasks.append(task)
                send_targets[task] = other_user_id
        
        # Now execute all sends concurrently with proper error handling
        if send_tasks:
            results = await asyncio.gather(*send_tasks, return_exceptions=True)
            
            # Process results to identify disconnected clients
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    task = send_tasks[i]
                    failed_user_id = send_targets[task]
                    self.logger.warning(f"Failed to send to user {failed_user_id}: {str(result)}")
                    disconnected_clients.append((project_id, file_id, failed_user_id))
        
        # Clean up disconnected clients
        for p_id, f_id, failed_user_id in disconnected_clients:
            self.logger.info(f"Removing disconnected client: {failed_user_id}")
            self.disconnect(p_id, f_id, failed_user_id)

    async def broadcast_to_others(self, project_id: str, file_id: str, user_id: str, message: dict):
        """Send messages immediately without batching"""
        # All messages are sent immediately without any buffering or batching
        if message["type"] == "clear":
            # Keep clear history functionality
            await self.clear_history(project_id, file_id)
        # Use direct broadcasting for maximum performance
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
        
        # Disable history loading from database
        # history_entries = await get_file_history(project_id, file_id)
        # if history_entries:
        #     await websocket.send_json({
        #         "type": "history_sync",
        #         "data": {
        #             "fileId": file_id,
        #             "entries": history_entries
        #         }
        #     })
        
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
        
        # Disable database storage
        # asyncio.create_task(add_drawing_history(
        #     project_id,
        #     file_id,
        #     user_id,
        #     drawing_data,
        #     history_entry["timestamp"]
        # ))
        
        # Disable verification logging to reduce overhead
        # current_count = len(self.drawing_history[project_id][file_id])
        # self.logger.info(f"=== History Update Verification ===")
        # self.logger.info(f"Current entry count for {project_id}/{file_id}: {current_count}")
        # self.logger.info(f"Latest entry: {json.dumps(history_entry, indent=2)}")

    async def clear_history(self, project_id: str, file_id: str):
        """Clear the drawing history for a specific file"""
        if project_id in self.drawing_history and file_id in self.drawing_history[project_id]:
            self.drawing_history[project_id][file_id] = []
            # Disable database clear operation
            # await clear_file_history(project_id, file_id)
            self.logger.info(f"Cleared history for Project: {project_id}, File: {file_id}")

manager = ConnectionManager()

@app.websocket("/ws/{project_id}/{file_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str, file_id: str, user_id: str):
    try:
        logger.info(f"New WebSocket connection request. Project: {project_id}, File: {file_id}, User: {user_id}")
        await manager.connect(websocket, project_id, file_id, user_id)
        logger.info(f"WebSocket connection established for User: {user_id}")
        
        # Initialize flush timer
        last_buffer_check = time.time()
        
        while True:
            try:
                # Wait for messages with a timeout to allow periodic buffer flushing
                try:
                    data = await asyncio.wait_for(websocket.receive_json(), timeout=1.0)
                    # Process the message normally
                    logger.debug(f"Received {data.get('type')} message from User {user_id}")
                    
                    message_type = data.get("type")
                    
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
                        # CRITICAL PATH: Broadcast drawing data to others FIRST
                        # This ensures minimal latency for real-time updates
                        logger.debug(f"Broadcasting draw from User: {user_id}")
                        await manager.broadcast_to_others(project_id, file_id, user_id, data)
                        
                        # NON-CRITICAL PATH: Persistence operations 
                        # Now buffered for batch processing
                        if REDIS_ENABLED:
                            drawing_data = data.get('data')
                            if drawing_data:
                                event = {
                                    "project_id": project_id,
                                    "file_id": file_id,
                                    "user_id": user_id,
                                    "data": drawing_data,
                                    "timestamp": drawing_data.get("timestamp", time.time() * 1000),
                                    "event_type": "draw"
                                }
                                # Add to buffer without awaiting
                                asyncio.create_task(push_to_redis_queue(event))
                        
                    elif message_type == "clear":
                        # CRITICAL PATH: Broadcast clear message FIRST
                        logger.debug(f"Broadcasting clear message from User {user_id}")
                        await manager.broadcast_to_others(project_id, file_id, user_id, data)
                        
                        # NON-CRITICAL PATH: Send clear event to Redis immediately
                        if REDIS_ENABLED:
                            event = {
                                "project_id": project_id,
                                "file_id": file_id,
                                "user_id": user_id,
                                "event_type": "clear",
                                "timestamp": time.time() * 1000
                            }
                            # Clear events don't get buffered - they're sent right away
                            asyncio.create_task(push_to_redis_queue(event))
                    else:
                        logger.warning(f"Unknown message type: {message_type}")
                    
                except asyncio.TimeoutError:
                    # No message received, check if we need to flush the buffer
                    current_time = time.time()
                    if (current_time - last_buffer_check) >= 1.0:  # Check every second
                        asyncio.create_task(check_and_flush_redis_buffer())
                        last_buffer_check = current_time
                
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                try:
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "message": "Error processing message",
                            "error": str(e)
                        }
                    })
                except:
                    # If we can't send an error, the connection is probably closed
                    break
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        logger.info(f"Cleaning up connection for User {user_id}")
        manager.disconnect(project_id, file_id, user_id)
        
        # Ensure buffer is flushed when client disconnects
        asyncio.create_task(flush_redis_buffer())

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

@app.post("/projects/messages")
async def add_message_to_project(data: ProjectMessageData):
    try:
        logger.info(f"Received message request: {data}")
        
        # Explicitly log parameters for clarity
        logger.info(f"Adding message: project_id={data.project_id}, user_id={data.user_id}, content={data.content[:20]}...")
        
        result = await add_project_message(data.project_id, data.user_id, data.content)
        if "error" in result:
            logger.error(f"Error adding message: {result['error']}")
            raise HTTPException(status_code=403, detail=result["error"])
            
        logger.info(f"Message added successfully, returning: {result}")
        return result
    except Exception as e:
        logger.error(f"Add project message error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/messages")
async def get_project_message_history(
    project_id: str, 
    user_id: str, 
    limit: int = Query(50, ge=1, le=100)
):
    try:
        logger.info(f"Fetching messages: project_id={project_id}, user_id={user_id}, limit={limit}")
        
        messages = await get_project_messages(project_id, user_id, limit)
        
        logger.info(f"Retrieved {len(messages)} messages")
        # Log a sample message if available
        if messages:
            logger.info(f"Sample message: {messages[0]}")
            
        return messages
    except Exception as e:
        logger.error(f"Get project messages error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/projects/{project_id}")
async def delete_project_endpoint(project_id: str, admin_id: str):
    try:
        success = await delete_project(project_id, admin_id)
        if not success:
            raise HTTPException(status_code=403, detail="Failed to delete project. Not authorized or project not found.")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Delete project error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Define the text operation model
class TextOperation(BaseModel):
    type: str  # 'insert', 'delete', 'format', 'clear'
    data: Dict[str, Any]

# Document WebSocket connection manager
class DocumentConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, Dict[str, WebSocket]]] = {}
        self.document_history: Dict[str, Dict[str, List[dict]]] = {}
        self.logger = logging.getLogger("DocumentConnectionManager")

    async def broadcast_to_others(self, project_id: str, file_id: str, user_id: str, message: dict):
        """Send message to all connected clients except the sender"""
        if (project_id in self.active_connections and 
            file_id in self.active_connections[project_id]):
            
            # Get a direct reference to avoid dict lookups in the loop
            connections = self.active_connections[project_id][file_id]
            
            # Create a list of send tasks
            send_tasks = []
            
            # Gather all send operations without awaiting them yet
            for other_user_id, websocket in connections.items():
                if other_user_id != user_id:
                    # Add the send task to our list without awaiting
                    send_tasks.append(websocket.send_json(message))
            
            # Now execute all sends concurrently
            if send_tasks:
                # Use gather for maximum performance, with return_exceptions=True to prevent
                # one failed send from affecting others
                await asyncio.gather(*send_tasks, return_exceptions=True)

    async def connect(self, websocket: WebSocket, project_id: str, file_id: str, user_id: str):
        await websocket.accept()
        
        # Initialize connections
        if project_id not in self.active_connections:
            self.active_connections[project_id] = {}
        if file_id not in self.active_connections[project_id]:
            self.active_connections[project_id][file_id] = {}
            
        # Store the connection
        self.active_connections[project_id][file_id][user_id] = websocket
        
        # Future enhancement: Load document history from database
        # Currently just confirming connection
        
        self.logger.info(f"Document client connected. Project: {project_id}, File: {file_id}, User: {user_id}")
        
        # Print all active users
        self.logger.info("Current active document users:")
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
        self.logger.info(f"Document client disconnected. Project: {project_id}, File: {file_id}, User: {user_id}")
        
        # Print remaining active users
        self.logger.info("Remaining active document users:")
        for p_id, files in self.active_connections.items():
            for f_id, users in files.items():
                self.logger.info(f"Project {p_id}, File {f_id}:")
                for u_id in users.keys():
                    self.logger.info(f"  - User: {u_id}")

    def add_to_history(self, project_id: str, file_id: str, user_id: str, operation_data: dict):
        """Add a text operation to the history"""
        self.logger.info(f"=== Adding to Document History ===")
        self.logger.info(f"Project: {project_id}, File: {file_id}, User: {user_id}")
        
        # Add to in-memory history
        if project_id not in self.document_history:
            self.document_history[project_id] = {}
        if file_id not in self.document_history[project_id]:
            self.document_history[project_id][file_id] = []
            
        history_entry = {
            "userId": user_id,
            "timestamp": operation_data.get("timestamp", datetime.now().timestamp() * 1000),
            "data": operation_data
        }
        
        self.document_history[project_id][file_id].append(history_entry)
        
        # Future enhancement: Store in database

    async def clear_history(self, project_id: str, file_id: str):
        """Clear the document history for a specific file"""
        if project_id in self.document_history and file_id in self.document_history[project_id]:
            self.document_history[project_id][file_id] = []
            self.logger.info(f"Cleared document history for Project: {project_id}, File: {file_id}")

# Initialize the document connection manager
document_manager = DocumentConnectionManager()

@app.websocket("/ws/document/{project_id}/{file_id}/{user_id}")
async def document_websocket_endpoint(websocket: WebSocket, project_id: str, file_id: str, user_id: str):
    await document_manager.connect(websocket, project_id, file_id, user_id)
    logger.info(f"Document WebSocket connected: project={project_id}, file={file_id}, user={user_id}")
    
    # Keep track of connections for this document
    document_key = f"{project_id}:{file_id}"
    if document_key not in document_connections:
        document_connections[document_key] = {}
    document_connections[document_key][user_id] = websocket
    
    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "data": {}
        })
        
        # Process messages
        while True:
            # Wait for a message from this client
            data = await websocket.receive_text()
            logger.debug(f"DOCUMENT RECEIVED RAW DATA: {data}")
            
            # Parse the message
            try:
                message = json.loads(data)
                logger.debug(f"DOCUMENT PARSED MESSAGE: {json.dumps(message, indent=2)}")
                
                # Process based on message type
                message_type = message.get("type")
                
                if message_type == "init":
                    logger.info(f"Document initialization: project={project_id}, file={file_id}, user={user_id}")
                
                elif message_type == "text_operation":
                    operation = message.get("data", {})
                    operation_type = operation.get("type")
                    operation_data = operation.get("data", {})
                    operation_user = operation_data.get("userId")
                    
                    # Add more detailed logging for format operations
                    if operation_type == "format":
                        format_type = operation_data.get("formatType", "unknown")
                        format_value = operation_data.get("formatValue", "unknown")
                        position = operation_data.get("position", -1)
                        length = operation_data.get("length", -1)
                        logger.info(f"Format operation: type={format_type}, value={format_value}, position={position}, length={length}, from user={operation_user}")
                    else:
                        logger.info(f"Text operation: type={operation_type}, from user={operation_user}")
                    
                    logger.debug(f"Operation data: {json.dumps(operation_data, indent=2)}")
                    
                    # Ensure userId is in the operation data
                    if "userId" not in operation_data:
                        operation_data["userId"] = user_id
                    
                    # Format for broadcasting
                    broadcast_message = {
                        "type": "text_operation",
                        "data": operation
                    }
                    
                    # Broadcast to other users
                    disconnected_users = []
                    for other_user_id, conn in document_connections[document_key].items():
                        if other_user_id != user_id:  # Don't send back to originator
                            logger.debug(f"Broadcasting to user: {other_user_id}")
                            try:
                                await conn.send_json(broadcast_message)
                            except Exception as e:
                                logger.error(f"Error broadcasting to {other_user_id}: {str(e)}")
                                disconnected_users.append(other_user_id)
                    
                    # Clean up disconnected users
                    for disconnected_user in disconnected_users:
                        logger.info(f"Removing disconnected document user: {disconnected_user}")
                        if disconnected_user in document_connections[document_key]:
                            del document_connections[document_key][disconnected_user]
                
                elif message_type == "cursor_update":
                    cursor_data = message.get("data", {})
                    
                    # Ensure userId is correct in the cursor data
                    cursor_data["userId"] = user_id
                    
                    # Format for broadcasting
                    broadcast_message = {
                        "type": "cursor_update",
                        "data": cursor_data
                    }
                    
                    # Broadcast cursor position to other users
                    disconnected_users = []
                    for other_user_id, conn in document_connections[document_key].items():
                        if other_user_id != user_id:
                            try:
                                await conn.send_json(broadcast_message)
                            except Exception as e:
                                logger.error(f"Error broadcasting cursor to {other_user_id}: {str(e)}")
                                disconnected_users.append(other_user_id)
                    
                    # Clean up disconnected users
                    for disconnected_user in disconnected_users:
                        logger.info(f"Removing disconnected document user: {disconnected_user}")
                        if disconnected_user in document_connections[document_key]:
                            del document_connections[document_key][disconnected_user]
                
                else:
                    logger.warning(f"Unknown message type: {message_type}")
            
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received: {data}")
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: project={project_id}, file={file_id}, user={user_id}")
        # Clean up connections
        if document_key in document_connections and user_id in document_connections[document_key]:
            del document_connections[document_key][user_id]
            if not document_connections[document_key]:  # If no more users for this document
                del document_connections[document_key]
        
        document_manager.disconnect(project_id, file_id, user_id)

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug") 