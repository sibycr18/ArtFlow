import { API_BASE_URL } from "../config";

// Define file types
export type FileType = "drawing" | "text" | "model";

export interface FileMetadata {
  id: string;
  project_id: string;
  name: string;
  file_type: FileType;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export const fileService = {
  // Create a new file
  async createFile(projectId: string, name: string, fileType: FileType, userId: string): Promise<FileMetadata> {
    const response = await fetch(`${API_BASE_URL}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        name,
        file_type: fileType,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create file');
    }

    return response.json();
  },

  // Get all files for a project
  async getProjectFiles(projectId: string): Promise<FileMetadata[]> {
    const response = await fetch(`${API_BASE_URL}/files?project_id=${projectId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }

    return response.json();
  },

  // Update a file
  async updateFile(fileId: string, updates: Partial<Pick<FileMetadata, 'name' | 'file_type'>>): Promise<FileMetadata> {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update file');
    }

    return response.json();
  },

  // Delete a file
  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  },
}; 