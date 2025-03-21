from supabase import create_client
import os
import logging
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv
import uuid

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Debug environment variables
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")
supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

logger.info(f"Supabase URL: {supabase_url}")
logger.info(f"Supabase Key: {supabase_key[:10]}..." if supabase_key else "Supabase Key: None")
logger.info(f"Supabase Service Key: {supabase_service_key[:10]}..." if supabase_service_key else "Supabase Service Key: None")

# Initialize Supabase clients
if not supabase_url or not supabase_key or not supabase_service_key:
    raise ValueError("Supabase URL, anon key, and service role key are required. Check your .env file.")

# Regular client for most operations
supabase = create_client(supabase_url, supabase_key)

# Service role client for admin operations (like user management)
supabase_admin = create_client(supabase_url, supabase_service_key)

async def create_or_update_user(user_data: Dict) -> Optional[Dict]:
    try:
        # Check if user already exists
        response = supabase_admin.table('users').select('*').eq('google_id', user_data['google_id']).execute()
        
        if response.data:
            # Update existing user
            response = supabase_admin.table('users').update({
                'name': user_data['name'],
                'picture': user_data['picture'],
                'last_login': 'now()'
            }).eq('google_id', user_data['google_id']).execute()
            logger.info(f"Updated user: {user_data['email']}")
        else:
            # Create new user
            response = supabase_admin.table('users').insert({
                'email': user_data['email'],
                'name': user_data['name'],
                'picture': user_data['picture'],
                'google_id': user_data['google_id'],
                'created_at': 'now()',
                'last_login': 'now()'
            }).execute()
            logger.info(f"Created new user: {user_data['email']}")
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error in create_or_update_user: {str(e)}")
        return None

async def get_user_by_google_id(google_id: str) -> Optional[Dict]:
    try:
        response = supabase_admin.table('users').select('*').eq('google_id', google_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error in get_user_by_google_id: {str(e)}")
        return None

async def search_users_by_email(email: str) -> List[Dict]:
    try:
        # Using the SQL function we created in the migration
        response = supabase_admin.rpc('search_users_by_email', {'search_email': email}).execute()
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error in search_users_by_email: {str(e)}")
        return []

async def create_project(name: str, admin_id: str) -> Optional[Dict]:
    try:
        # Explicitly generate a UUID for the project
        project_id = str(uuid.uuid4())
        print(f"Project ID: {project_id}")
        
        # Create the data object and log it
        project_data = {
            'id': project_id,
            'name': name,
            'admin_id': admin_id,
            'collaborators': []
        }
        
        logger.info(f"Attempting to insert project with data: {project_data}")
        
        # Use upsert instead of insert to be more explicit
        response = supabase_admin.table('projects').upsert(
            project_data
        ).execute()
        
        logger.info(f"Supabase response: {response}")
        logger.info(f"Created new project: {name} with admin: {admin_id}, id: {project_id}")
        
        if response.data:
            return response.data[0]
        else:
            logger.error(f"No data returned from project creation, but no error thrown")
            return None
    except Exception as e:
        logger.error(f"Error in create_project: {str(e)}")
        # Log the full traceback for better debugging
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None

async def create_project_via_rpc(name: str, admin_id: str) -> Optional[Dict]:
    """Alternative method to create projects using direct SQL for debugging."""
    try:
        # Generate UUID
        project_id = str(uuid.uuid4())
        
        logger.info(f"Using RPC to create project with id: {project_id}, name: {name}, admin_id: {admin_id}")
        
        # Execute an RPC function call to insert directly with SQL
        # This bypasses potential issues with the Supabase Python client's table interface
        rpc_payload = {
            "project_id": project_id,
            "project_name": name,
            "admin_user_id": admin_id
        }
        
        logger.info(f"RPC payload: {rpc_payload}")
        
        # Execute direct SQL via RPC
        result = supabase_admin.rpc(
            'create_project_directly', 
            rpc_payload
        ).execute()
        
        logger.info(f"RPC result: {result}")
        
        # If successful, fetch the project we just created
        if result.data:
            response = supabase_admin.table('projects').select('*').eq('id', project_id).execute()
            if response.data:
                logger.info(f"Successfully created project via RPC: {response.data[0]}")
                return response.data[0]
        
        logger.error(f"Failed to create project via RPC, no data returned")
        return None
    except Exception as e:
        logger.error(f"Error in create_project_via_rpc: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None

async def add_collaborator(project_id: str, admin_id: str, collaborator_id: str) -> bool:
    try:
        # First check if project exists and user is admin
        response = supabase_admin.table('projects').select('collaborators').eq('id', project_id).eq('admin_id', admin_id).execute()
        
        if not response.data:
            logger.error(f"Project not found or user is not admin: {project_id}, {admin_id}")
            return False
        
        # Get current collaborators
        current_collaborators = response.data[0].get('collaborators', [])
        
        # Check if user is already a collaborator
        if collaborator_id in current_collaborators:
            logger.info(f"User is already a collaborator: {collaborator_id}")
            return True
        
        # Add new collaborator
        updated_collaborators = current_collaborators + [collaborator_id]
        response = supabase_admin.table('projects').update({
            'collaborators': updated_collaborators
        }).eq('id', project_id).eq('admin_id', admin_id).execute()
        
        logger.info(f"Added collaborator {collaborator_id} to project {project_id}")
        return True
    except Exception as e:
        logger.error(f"Error in add_collaborator: {str(e)}")
        return False

async def remove_collaborator(project_id: str, admin_id: str, collaborator_id: str) -> bool:
    try:
        # First check if project exists and user is admin
        response = supabase_admin.table('projects').select('collaborators').eq('id', project_id).eq('admin_id', admin_id).execute()
        
        if not response.data:
            logger.error(f"Project not found or user is not admin: {project_id}, {admin_id}")
            return False
        
        # Get current collaborators
        current_collaborators = response.data[0].get('collaborators', [])
        
        # Remove collaborator
        if collaborator_id in current_collaborators:
            updated_collaborators = [c for c in current_collaborators if c != collaborator_id]
            response = supabase_admin.table('projects').update({
                'collaborators': updated_collaborators
            }).eq('id', project_id).eq('admin_id', admin_id).execute()
            
            logger.info(f"Removed collaborator {collaborator_id} from project {project_id}")
            return True
        else:
            logger.info(f"User is not a collaborator: {collaborator_id}")
            return True  # Not an error, already not a collaborator
    except Exception as e:
        logger.error(f"Error in remove_collaborator: {str(e)}")
        return False

async def get_project_collaborators(project_id: str, user_id: str) -> List[Dict]:
    try:
        # First check if project exists and user has access
        response = supabase_admin.table('projects').select('admin_id, collaborators').eq('id', project_id).execute()
        
        if not response.data:
            logger.error(f"Project not found: {project_id}")
            return []
        
        project = response.data[0]
        
        # Check if user has access
        if project['admin_id'] != user_id and user_id not in project.get('collaborators', []):
            logger.error(f"User does not have access to this project: {user_id}, {project_id}")
            return []
        
        # Get admin details
        admin_response = supabase_admin.table('users').select('id, name, email, picture').eq('id', project['admin_id']).execute()
        admin = admin_response.data[0] if admin_response.data else None
        
        # Get collaborator details if there are any
        collaborators = []
        if project.get('collaborators') and len(project['collaborators']) > 0:
            collab_ids = project['collaborators']
            collab_response = supabase_admin.table('users').select('id, name, email, picture').in_('id', collab_ids).execute()
            collaborators = collab_response.data if collab_response.data else []
        
        # Mark the admin
        if admin:
            admin['is_admin'] = True
            collaborators = [admin] + [{'is_admin': False, **c} for c in collaborators]
        
        return collaborators
    except Exception as e:
        logger.error(f"Error in get_project_collaborators: {str(e)}")
        return []

async def ensure_project_exists(project_id: str) -> bool:
    try:
        # Check if project exists
        response = supabase.table('projects').select('id').eq('id', project_id).execute()
        
        if not response.data:
            # Create project if it doesn't exist
            response = supabase.table('projects').insert({'id': project_id}).execute()
            logger.info(f"Created new project: {project_id}")
        return True
    except Exception as e:
        logger.error(f"Error ensuring project exists: {str(e)}")
        return False

async def ensure_file_exists(project_id: str, file_id: str) -> bool:
    try:
        # Check if file exists
        response = supabase.table('files').select('id').eq('id', file_id).eq('project_id', project_id).execute()
        
        if not response.data:
            # Create file if it doesn't exist
            response = supabase.table('files').insert({
                'id': file_id,
                'project_id': project_id
            }).execute()
            logger.info(f"Created new file: {file_id} in project: {project_id}")
        return True
    except Exception as e:
        logger.error(f"Error ensuring file exists: {str(e)}")
        return False

async def add_drawing_history(project_id: str, file_id: str, user_id: str, drawing_data: dict, timestamp: int) -> bool:
    try:
        # Ensure project and file exist
        await ensure_project_exists(project_id)
        await ensure_file_exists(project_id, file_id)
        
        # Get the current max sequence number for this file
        response = supabase.table('drawing_history')\
            .select('sequence_number')\
            .eq('file_id', file_id)\
            .order('sequence_number', desc=True)\
            .limit(1)\
            .execute()
        
        sequence_number = 1
        if response.data:
            sequence_number = response.data[0]['sequence_number'] + 1
        
        # Insert the drawing history entry
        response = supabase.table('drawing_history').insert({
            'file_id': file_id,
            'project_id': project_id,
            'user_id': user_id,
            'drawing_data': drawing_data,
            'timestamp': timestamp,
            'sequence_number': sequence_number
        }).execute()
        
        logger.info(f"Added drawing history entry: {response.data}")
        return True
    except Exception as e:
        logger.error(f"Error adding drawing history: {str(e)}")
        return False

async def get_file_history(project_id: str, file_id: str) -> List[Dict]:
    try:
        response = supabase.table('drawing_history')\
            .select('*')\
            .eq('file_id', file_id)\
            .eq('project_id', project_id)\
            .order('sequence_number', asc=True)\
            .execute()
        
        return [
            {
                'userId': entry['user_id'],
                'timestamp': entry['timestamp'],
                'data': entry['drawing_data']
            }
            for entry in response.data
        ]
    except Exception as e:
        logger.error(f"Error getting file history: {str(e)}")
        return []

async def clear_file_history(project_id: str, file_id: str) -> bool:
    try:
        response = supabase.table('drawing_history')\
            .delete()\
            .eq('file_id', file_id)\
            .eq('project_id', project_id)\
            .execute()
        
        logger.info(f"Cleared history for file {file_id} in project {project_id}")
        return True
    except Exception as e:
        logger.error(f"Error clearing file history: {str(e)}")
        return False

async def get_project_by_id(project_id: str, user_id: str) -> Optional[Dict]:
    try:
        # First check if project exists and user has access
        response = supabase_admin.table('projects').select('*').eq('id', project_id).execute()
        
        if not response.data:
            logger.error(f"Project not found: {project_id}")
            return None
        
        project = response.data[0]
        
        # Check if user has access
        if project['admin_id'] != user_id and user_id not in project.get('collaborators', []):
            logger.error(f"User does not have access to this project: {user_id}, {project_id}")
            return None
            
        return project
    except Exception as e:
        logger.error(f"Error in get_project_by_id: {str(e)}")
        return None

async def get_user_projects(user_id: str) -> List[Dict]:
    try:
        # Get projects where user is admin
        admin_response = supabase_admin.table('projects').select('*').eq('admin_id', user_id).execute()
        admin_projects = admin_response.data if admin_response.data else []
        
        # Get projects where user is a collaborator using a simple text check
        # This avoids any potential recursive function calls
        collab_response = supabase_admin.table('projects').select('*').execute()
        collab_projects = []
        if collab_response.data:
            for project in collab_response.data:
                # Check if collaborators field exists and contains user_id
                if 'collaborators' in project and project['collaborators']:
                    collaborators_str = str(project['collaborators'])
                    if user_id in collaborators_str:
                        collab_projects.append(project)
        
        # Combine and deduplicate projects
        all_projects = {project['id']: project for project in admin_projects + collab_projects}
        
        return list(all_projects.values())
    except Exception as e:
        logger.error(f"Error in get_user_projects: {str(e)}")
        return []

# Add file management functions
async def create_file(project_id: str, name: str, file_type: str, user_id: str) -> Dict:
    """Create a new file in a project"""
    try:
        # Validate file_type
        if file_type not in ["drawing", "text", "model"]:
            raise ValueError(f"Invalid file type: {file_type}")
        
        # Create the base data dictionary without created_by
        file_data = {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "name": name,
            "file_type": file_type
        }
        
        # Try to fetch the table structure to check if created_by exists
        try:
            # First try with created_by included
            file_data["created_by"] = user_id
            response = supabase_admin.table('files').insert(file_data).execute()
            return response.data[0]
        except Exception as e:
            # If we get a specific error about created_by column, retry without it
            if "created_by" in str(e):
                logger.warning("created_by column not found in files table, inserting without it")
                del file_data["created_by"]
                response = supabase_admin.table('files').insert(file_data).execute()
                
                if not response.data:
                    raise Exception("Failed to create file")
                
                return response.data[0]
            else:
                # If it's a different error, re-raise it
                raise
    except Exception as e:
        logger.error(f"Error in create_file: {str(e)}")
        raise

async def get_project_files(project_id: str) -> List[Dict]:
    """Get all files for a project"""
    try:
        response = supabase_admin.table('files').select('*').eq('project_id', project_id).execute()
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error in get_project_files: {str(e)}")
        return []

async def update_file(file_id: str, updates: Dict) -> Dict:
    """Update a file's details"""
    try:
        # Ensure we're not trying to update restricted fields
        safe_updates = {k: v for k, v in updates.items() if k not in ['id', 'project_id', 'created_at', 'created_by']}
        
        response = supabase_admin.table('files').update(safe_updates).eq('id', file_id).execute()
        
        if not response.data:
            raise Exception(f"Failed to update file {file_id}")
        
        return response.data[0]
    except Exception as e:
        logger.error(f"Error in update_file: {str(e)}")
        raise

async def delete_file(file_id: str) -> bool:
    """Delete a file"""
    try:
        response = supabase_admin.table('files').delete().eq('id', file_id).execute()
        return len(response.data) > 0
    except Exception as e:
        logger.error(f"Error in delete_file: {str(e)}")
        return False

# Project Messages functions
async def add_project_message(project_id: str, user_id: str, content: str) -> Dict:
    try:
        # Log the incoming request
        logger.info(f"Adding message to project {project_id} from user {user_id}: {content[:50]}...")
        
        # First check if user has access to the project
        response = supabase_admin.table('projects').select('id, admin_id, collaborators').eq('id', project_id).execute()
        
        if not response.data:
            logger.error(f"Project not found: {project_id}")
            return {"error": "Project not found"}
        
        project = response.data[0]
        logger.info(f"Project found: {project}")
        
        # Check if user has access
        has_access = False
        if project['admin_id'] == user_id:
            has_access = True
            logger.info(f"User {user_id} is admin of project {project_id}")
        elif 'collaborators' in project and user_id in project['collaborators']:
            has_access = True
            logger.info(f"User {user_id} is collaborator of project {project_id}")
        
        if not has_access:
            logger.error(f"User does not have access to this project: {user_id}, {project_id}")
            return {"error": "Access denied"}
        
        # Insert the message
        message_data = {
            "project_id": project_id,
            "user_id": user_id,
            "content": content,
            "is_system_message": False
        }
        logger.info(f"Inserting message data: {message_data}")
        
        response = supabase_admin.table('project_messages').insert(message_data).execute()
        
        if not response.data:
            logger.error("No data returned from message insert")
            return {"error": "Failed to insert message"}
            
        logger.info(f"Message added: {response.data}")
        return response.data[0] if response.data else {}
    except Exception as e:
        logger.error(f"Error in add_project_message: {str(e)}")
        return {"error": str(e)}

async def get_project_messages(project_id: str, user_id: str, limit: int = 50) -> List[Dict]:
    try:
        logger.info(f"Getting messages for project {project_id} for user {user_id} (limit: {limit})")
        
        # First check if user has access to the project
        response = supabase_admin.table('projects').select('id, admin_id, collaborators').eq('id', project_id).execute()
        logger.info(f"Projects query response: {response}")
        
        if not response.data:
            logger.error(f"Project not found: {project_id}")
            return []
        
        project = response.data[0]
        logger.info(f"Project found: {project}")
        
        # Check if user has access
        has_access = False
        if project['admin_id'] == user_id:
            has_access = True
            logger.info(f"User {user_id} is admin of project {project_id}")
        elif project.get('collaborators') and user_id in project.get('collaborators', []):
            has_access = True
            logger.info(f"User {user_id} is collaborator of project {project_id}")
        
        if not has_access:
            logger.error(f"User does not have access to this project: {user_id}, {project_id}")
            return []
        
        # Get messages with all fields, no joins to avoid issues
        logger.info(f"Fetching messages for project {project_id}")
        
        try:
            # First try using direct admin query for maximum reliability
            response = supabase_admin.table('project_messages').select('*').eq('project_id', project_id).order('created_at', {"ascending": True}).limit(limit).execute()
            
            if not response.data and not isinstance(response.data, list):
                logger.error(f"Invalid response from Supabase: {response}")
                return []
                
            logger.info(f"Found {len(response.data)} messages via admin query")
            
            # Log the first message for debugging
            if response.data:
                logger.info(f"Sample message: {response.data[0]}")
            
            return response.data
        except Exception as inner_error:
            logger.error(f"Error in admin query: {str(inner_error)}")
            
            # Fallback to direct SQL query as last resort
            try:
                # Use raw SQL query to bypass potential RLS issues
                sql = f"""
                SELECT * FROM public.project_messages 
                WHERE project_id = '{project_id}'
                ORDER BY created_at ASC
                LIMIT {limit}
                """
                response = supabase_admin.execute_sql(sql)
                
                if not hasattr(response, 'data') or not response.data:
                    logger.error("SQL query returned no data")
                    return []
                    
                # Parse the JSON result
                messages = response.data
                logger.info(f"Retrieved {len(messages)} messages via SQL query")
                
                return messages
            except Exception as sql_error:
                logger.error(f"Error in SQL fallback: {str(sql_error)}")
                return []
    except Exception as e:
        logger.error(f"Error in get_project_messages: {str(e)}")
        return []

async def delete_project(project_id: str, admin_id: str) -> bool:
    """Delete a project and all its files"""
    try:
        # First check if project exists and user is admin
        response = supabase_admin.table('projects').select('*').eq('id', project_id).eq('admin_id', admin_id).execute()
        
        if not response.data:
            logger.error(f"Project not found or user is not admin: {project_id}, {admin_id}")
            return False
            
        # Get all files for this project
        files = await get_project_files(project_id)
        
        # Delete all files first
        for file in files:
            try:
                # Delete file history if it exists
                await clear_file_history(project_id, file['id'])
                # Delete the file
                await supabase_admin.table('files').delete().eq('id', file['id']).execute()
            except Exception as e:
                logger.error(f"Error deleting file {file['id']}: {str(e)}")
                # Continue with other files even if one fails
                
        # Finally delete the project
        response = supabase_admin.table('projects').delete().eq('id', project_id).eq('admin_id', admin_id).execute()
        
        logger.info(f"Deleted project {project_id}")
        return True
    except Exception as e:
        logger.error(f"Error in delete_project: {str(e)}")
        return False 