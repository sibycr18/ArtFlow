import { API_BASE_URL } from "../config";
import logger from "../utils/logger";

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
    const url = `${API_BASE_URL}/files`;
    logger.info('API', `Creating file: ${url}`);
    
    const response = await fetch(url, {
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
      logger.error('API', `Failed to create file: ${response.status} ${response.statusText}`);
      throw new Error('Failed to create file');
    }

    return response.json();
  },

  // Get all files for a project
  async getProjectFiles(projectId: string): Promise<FileMetadata[]> {
    const url = `${API_BASE_URL}/files?project_id=${projectId}`;
    logger.info('API', `Fetching project files: ${url}`);
    
    const response = await fetch(url);

    if (!response.ok) {
      logger.error('API', `Failed to fetch files: ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch files');
    }

    return response.json();
  },

  // Update a file
  async updateFile(fileId: string, updates: Partial<Pick<FileMetadata, 'name' | 'file_type'>>): Promise<FileMetadata> {
    const url = `${API_BASE_URL}/files/${fileId}`;
    logger.info('API', `Updating file: ${url}`);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      logger.error('API', `Failed to update file: ${response.status} ${response.statusText}`);
      throw new Error('Failed to update file');
    }

    return response.json();
  },

  // Delete a file
  async deleteFile(fileId: string): Promise<void> {
    const url = `${API_BASE_URL}/files/${fileId}`;
    logger.info('API', `Deleting file: ${url}`);
    
    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      logger.error('API', `Failed to delete file: ${response.status} ${response.statusText}`);
      throw new Error('Failed to delete file');
    }
  },
}; 