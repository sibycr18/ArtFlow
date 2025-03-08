import requests
import json
import uuid

# Base URL
base_url = "http://localhost:8000"
headers = {"Content-Type": "application/json"}

# Step 1: Create a test user
print("Creating a test user...")
user_data = {
    "email": f"test_{uuid.uuid4()}@example.com",
    "name": "Test User",
    "picture": "https://example.com/avatar.jpg",
    "google_id": f"google_{uuid.uuid4()}"
}

try:
    user_response = requests.post(f"{base_url}/auth/login", json=user_data)
    print(f"User Creation Status: {user_response.status_code}")
    
    if user_response.status_code == 200:
        response_data = user_response.json()
        # Extract user ID from the nested structure
        user_id = response_data["user"]["id"]
        print(f"User created with ID: {user_id}")
        
        # Step 2: Create a project with the user as admin
        print("\nCreating a project...")
        project_data = {
            "name": "Test Project",
            "admin_id": user_id
        }
        
        project_response = requests.post(f"{base_url}/projects", json=project_data)
        print(f"Project Creation Status: {project_response.status_code}")
        print(f"Project Response: {project_response.text}")
        
        if project_response.status_code == 200:
            project = project_response.json()
            project_id = project["id"]
            print(f"Project created with ID: {project_id}")
            
            # Step 3: Create a file in the project
            print("\nCreating a file...")
            file_data = {
                "project_id": project_id,
                "name": "Test File",
                "file_type": "drawing"
            }
            
            file_response = requests.post(
                f"{base_url}/files", 
                json=file_data, 
                params={"user_id": user_id}
            )
            
            print(f"File Creation Status: {file_response.status_code}")
            print(f"Response: {file_response.text}")
            
            # Step 4: Get all files for the project
            print("\nGetting project files...")
            files_response = requests.get(f"{base_url}/files?project_id={project_id}")
            
            print(f"Get Files Status: {files_response.status_code}")
            print(f"Files: {files_response.text}")
        else:
            print(f"Failed to create project: {project_response.text}")
    else:
        print(f"Failed to create user: {user_response.text}")
except Exception as e:
    print(f"Error: {str(e)}") 