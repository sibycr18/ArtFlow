import requests
import json
import uuid

# Base URL
base_url = "http://localhost:8000"
headers = {"Content-Type": "application/json"}

# Generate a valid UUID for admin_id
admin_id = str(uuid.uuid4())
project_name = "Test Project"

# Create a project
print("Creating a project...")
project_data = {
    "name": project_name,
    "admin_id": admin_id
}

try:
    project_response = requests.post(f"{base_url}/projects", json=project_data)
    print(f"Project Creation Status: {project_response.status_code}")
    print(f"Response: {project_response.text}")
    
    if project_response.status_code == 200:
        project = project_response.json()
        project_id = project["id"]
        print(f"Project created with ID: {project_id}")
except Exception as e:
    print(f"Error: {str(e)}") 