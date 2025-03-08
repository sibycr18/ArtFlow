import requests
import json
import uuid

# Base URL
base_url = "http://localhost:8000"
headers = {"Content-Type": "application/json"}

# Generate valid UUIDs
admin_id = str(uuid.uuid4())
project_name = "Test Project"

# Step 1: Create a project
print("Creating a project...")
project_data = {
    "name": project_name,
    "admin_id": admin_id
}

try:
    project_response = requests.post(f"{base_url}/projects", json=project_data)
    print(f"Project Creation Status: {project_response.status_code}")
    
    if project_response.status_code == 200:
        project = project_response.json()
        project_id = project["id"]
        print(f"Project created with ID: {project_id}")
        
        # Step 2: Create a file in the project
        print("\nCreating a file...")
        file_data = {
            "project_id": project_id,
            "name": "Test File",
            "file_type": "drawing"
        }
        
        file_response = requests.post(
            f"{base_url}/files", 
            data=json.dumps(file_data), 
            headers=headers, 
            params={"user_id": admin_id}
        )
        
        print(f"File Creation Status: {file_response.status_code}")
        print(f"Response: {file_response.text}")
        
        # Step 3: Get all files for the project
        print("\nGetting project files...")
        files_response = requests.get(f"{base_url}/files?project_id={project_id}")
        
        print(f"Get Files Status: {files_response.status_code}")
        print(f"Files: {files_response.text}")
    else:
        print(f"Failed to create project: {project_response.text}")
except Exception as e:
    print(f"Error: {str(e)}") 