// Define UIFileType here in case of import issues
type UIFileType = 'canvas' | 'image' | 'document';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Project, File } from '../types';
import { projects as initialProjects } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { fileService, FileMetadata, FileType as BackendFileType } from "../services/fileService";
import { API_BASE_URL } from '../config';

interface ProjectContextType {
  projects: Project[];
  addProject: (name: string) => Promise<Project | null>;
  deleteProject: (id: string) => void;
  renameProject: (id: string, newName: string) => void;
  renameFile: (projectId: string, fileId: string, newName: string) => void;
  files: FileMetadata[];
  createFile: (projectId: string, name: string, type: UIFileType) => Promise<FileMetadata | null>;
  deleteFile: (projectId: string, fileId: string) => Promise<boolean>;
  openProject: (projectId: string) => Promise<any>;
  currentProject: Project | null;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  // Fetch projects from the backend
  useEffect(() => {
    const fetchProjects = async () => {
      // Skip if no user or already fetching
      if (!user?.id || isFetchingRef.current) {
        return;
      }

      // Set both the state and ref to indicate loading
      setIsLoading(true);
      isFetchingRef.current = true;

      try {
        const response = await fetch(`${API_BASE_URL}/projects?user_id=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        
        const data = await response.json();
        
        // Transform data to match the Project type
        const formattedProjects = await Promise.all(data.map(async (project: any) => {
          // Fetch files for each project
          const projectFiles = await fetchProjectFiles(project.id);
          
          // Map FileMetadata to File interface
          const mappedFiles = projectFiles.map(file => ({
            id: file.id,
            name: file.name,
            type: mapBackendToUIFileType(file.file_type),
            lastModified: new Date(file.updated_at).toLocaleDateString()
          }));
          
          return {
            id: project.id,
            name: project.name,
            lastModified: new Date(project.created_at).toLocaleDateString(),
            files: mappedFiles
          };
        }));
        
        setProjects(formattedProjects);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        // Reset both state and ref when done
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchProjects();
    
    // Only re-run when user changes, not when isLoading changes
  }, [user?.id]);

  // Helper function to map backend file type to UI file type
  const mapBackendToUIFileType = (fileType: BackendFileType): UIFileType => {
    switch (fileType) {
      case 'drawing':
        return 'canvas';
      case 'text':
        return 'document';
      case 'model':
        return 'image';
      default:
        return 'document';
    }
  };

  // Helper function to map UI file type to backend file type
  const mapUIToBackendFileType = (type: UIFileType): BackendFileType => {
    switch (type) {
      case 'canvas':
        return 'drawing';
      case 'document':
        return 'text';
      case 'image':
        return 'model';
      default:
        return 'text';
    }
  };

  // Add a new project
  const addProject = async (name: string): Promise<Project | null> => {
    if (!user?.id) return null;
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          admin_id: user.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      
      const projectData = await response.json();
      
      const newProject: Project = {
        id: projectData.id,
        name: projectData.name,
        lastModified: new Date().toLocaleDateString(),
        files: []
      };
      
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (error) {
      console.error("Error adding project:", error);
      return null;
    }
  };

  // Delete a project
  const deleteProject = async (id: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      // First get all files for this project
      const projectFiles = await fetchProjectFiles(id);
      
      // Delete all files first
      for (const file of projectFiles) {
        await fileService.deleteFile(file.id);
      }
      
      // Then delete the project
      const response = await fetch(`${API_BASE_URL}/projects/${id}?admin_id=${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      // Update local state
      setProjects(prev => prev.filter(p => p.id !== id));
      
      // Clear current project if it was the deleted one
      if (currentProject?.id === id) {
        setCurrentProject(null);
        setFiles([]);
        setLoadedProjectId(null);
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting project:", error);
      return false;
    }
  };

  // Rename a project
  const renameProject = (id: string, newName: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  // Delete a file
  const deleteFile = async (projectId: string, fileId: string): Promise<boolean> => {
    try {
      await fileService.deleteFile(fileId);
      
      // Update files state
      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      
      // Update current project if needed
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            files: prev.files.filter(file => file.id !== fileId)
          };
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  };

  // Rename a file
  const renameFile = (projectId: string, fileId: string, newName: string) => {
    // Here we would typically call an API to update the file name
    // For now, we'll just update the local state
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === fileId ? {...file, name: newName} : file
      )
    );
  };

  // Fetch files for a project
  const fetchProjectFiles = async (projectId: string) => {
    try {
      const files = await fileService.getProjectFiles(projectId);
      return files;
    } catch (error) {
      console.error("Error fetching project files:", error);
      return [];
    }
  };

  // Open a project and load its files
  const openProject = async (projectId: string) => {
    if (loadedProjectId === projectId && currentProject) {
      return currentProject;
    }
    
    try {
      // Fetch project details from the backend
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}?user_id=${user?.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }
      
      const projectData = await response.json();
      
      // Fetch files for this project
      const files = await fetchProjectFiles(projectId);
      const mappedFiles = files.map(file => ({
        id: file.id,
        name: file.name,
        type: mapBackendToUIFileType(file.file_type),
        lastModified: new Date(file.updated_at).toLocaleDateString()
      }));
      
      // Transform project data
      const project: Project = {
        id: projectData.id,
        name: projectData.name,
        lastModified: new Date(projectData.created_at).toLocaleDateString(),
        files: mappedFiles
      };
      
      // Update state
      setCurrentProject(project);
      setFiles(files);
      setLoadedProjectId(projectId);
      
      return project;
    } catch (error) {
      console.error("Error opening project:", error);
      throw error;
    }
  };

  // Create a new file in a project
  const createFile = async (projectId: string, name: string, type: UIFileType): Promise<FileMetadata | null> => {
    if (!user?.id) return null;
    
    try {
      // Convert the UI type to backend file_type for the API
      const fileType = mapUIToBackendFileType(type);
      const newFile = await fileService.createFile(projectId, name, fileType, user.id);
      
      if (newFile) {
        // Update files state
        setFiles(prev => [...prev, newFile]);
        
        // Map the new file to the File interface
        const mappedFile: File = {
          id: newFile.id,
          name: newFile.name,
          type: mapBackendToUIFileType(newFile.file_type),
          lastModified: new Date(newFile.updated_at).toLocaleDateString()
        };
        
        // Update current project if needed
        if (currentProject && currentProject.id === projectId) {
          setCurrentProject(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              files: [...prev.files, mappedFile]
            };
          });
        }

        // Update projects array
        setProjects(prev => prev.map(project => {
          if (project.id === projectId) {
            return {
              ...project,
              files: [...project.files, mappedFile]
            };
          }
          return project;
        }));
      }
      
      return newFile;
    } catch (error) {
      console.error("Error creating file:", error);
      return null;
    }
  };

  const value = {
    projects,
    addProject,
    deleteProject,
    renameProject,
    renameFile,
    files,
    createFile,
    deleteFile,
    openProject,
    currentProject,
    isLoading
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}