import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project } from '../types';
import { projects as initialProjects } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { fileService, FileMetadata, FileType } from "../services/fileService";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'wss://artflow-backend-64f27556b9a4.herokuapp.com';

// Log initial mock data
console.log('Loading mock data:', initialProjects);

interface ProjectContextType {
  projects: Project[];
  addProject: (name: string) => Promise<Project | null>;
  deleteProject: (id: string) => void;
  renameProject: (id: string, newName: string) => void;
  renameFile: (projectId: string, fileId: string, newName: string) => void;
  files: FileMetadata[];
  createFile: (projectId: string, name: string, type: FileType) => Promise<FileMetadata | null>;
  deleteFile: (fileId: string) => Promise<boolean>;
  openProject: (projectId: string) => Promise<any>;
  currentProject: Project | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  console.log('ProjectProvider initializing with:', initialProjects);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  console.log('ProjectProvider: user from useAuth =', user);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);

  // Add this useEffect to fetch projects when user is logged in
  useEffect(() => {
    const fetchProjects = async () => {
      console.log("fetchProjects called with user:", user);
      if (!user?.id) {
        console.log("No user ID, skipping project fetch");
        return;
      }
      
      if (isLoading) {
        console.log("Already loading, skipping project fetch");
        return;
      }
      
      try {
        console.log("Setting isLoading to true");
        setIsLoading(true);
        console.log(`Fetching projects from ${API_BASE_URL}/projects?user_id=${user.id}`);
        const response = await fetch(`${API_BASE_URL}/projects?user_id=${user.id}`);
        
        if (!response.ok) {
          console.error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
          throw new Error('Failed to fetch projects');
        }
        
        const data = await response.json();
        console.log("Projects fetched successfully:", data);
        
        // Transform the data to match the Project interface
        const formattedProjects: Project[] = data.map((project: any) => ({
          id: project.id,
          name: project.name,
          lastModified: new Date(project.created_at).toLocaleString(),
          files: [] // We'll need to implement file fetching separately
        }));
        
        console.log("Setting projects:", formattedProjects);
        setProjects(formattedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        console.log("Setting isLoading to false");
        setIsLoading(false);
      }
    };
    
    fetchProjects();
  }, [user?.id]);

  // Update the useEffect that fetches project files when projects change
  useEffect(() => {
    const updateProjectsWithFiles = async () => {
      if (projects.length === 0) return;
      
      // Create a copy to avoid changing the state while iterating, which can cause infinite loops
      const projectsToUpdate = [...projects];
      const updatedProjects = [];
      let hasChanges = false;
      
      try {
        for (let i = 0; i < projectsToUpdate.length; i++) {
          const project = projectsToUpdate[i];
          
          // Skip projects that already have files loaded
          if (project.files && project.files.length > 0) {
            updatedProjects.push(project);
            continue;
          }
          
          const projectFiles = await fileService.getProjectFiles(project.id);
          
          if (projectFiles.length > 0) {
            hasChanges = true;
            updatedProjects.push({
              ...project,
              files: projectFiles.map(file => ({
                id: file.id,
                name: file.name,
                type: file.file_type as 'canvas' | 'image' | 'document',
                lastModified: new Date(file.updated_at).toLocaleString()
              }))
            });
          } else {
            updatedProjects.push(project);
          }
        }
        
        // Only update state if there were actually changes
        if (hasChanges) {
          setProjects(updatedProjects);
        }
      } catch (error) {
        console.error('Error fetching project files:', error);
      }
    };
    
    // Use a ref to ensure this only runs once per project load
    const timeoutId = setTimeout(() => {
      updateProjectsWithFiles();
    }, 500); // Add a small delay to avoid rapid consecutive calls
    
    return () => clearTimeout(timeoutId);
  }, [projects.length]);

  const addProject = async (name: string): Promise<Project | null> => {
    if (!user?.id) {
      console.error('Cannot create project: User not logged in');
      return null;
    }

    try {
      // Create project in backend
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
      console.log('Project created in backend:', projectData);

      // Format the project for frontend
      const newProject: Project = {
        id: projectData.id,
        name: projectData.name,
        lastModified: new Date(projectData.created_at).toLocaleString(),
        files: []
      };

      setProjects([newProject, ...projects]);
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter(project => project.id !== id));
  };

  const renameProject = (id: string, newName: string) => {
    setProjects(projects.map(project => 
      project.id === id ? { ...project, name: newName } : project
    ));
  };

  const deleteFile = async (fileId: string) => {
    try {
      await fileService.deleteFile(fileId);
      
      // Update files state
      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      
      // Update current project
      if (currentProject) {
        setCurrentProject({
          ...currentProject,
          files: currentProject.files.filter(file => file.id !== fileId)
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  };

  const renameFile = (projectId: string, fileId: string, newName: string) => {
    setProjects(projects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          lastModified: 'Just now',
          files: project.files.map(file =>
            file.id === fileId ? { ...file, name: newName } : file
          )
        };
      }
      return project;
    }));
  };

  const fetchProjectFiles = async (projectId: string) => {
    try {
      const projectFiles = await fileService.getProjectFiles(projectId);
      setFiles(projectFiles);
      return projectFiles;
    } catch (error) {
      console.error("Error fetching project files:", error);
      return [];
    }
  };

  const openProject = useCallback(async (projectId: string) => {
    try {
      // Fetch project details
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}?user_id=${user?.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }
      
      const projectData = await response.json();
      
      // Fetch project files
      const projectFiles = await fileService.getProjectFiles(projectId);
      
      // Format the project for frontend
      const projectDetails: Project = {
        id: projectData.id,
        name: projectData.name,
        lastModified: new Date(projectData.updated_at).toLocaleString(),
        files: projectFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.file_type as 'canvas' | 'image' | 'document',
          lastModified: new Date(file.updated_at).toLocaleString()
        }))
      };
      
      // Update current project
      setCurrentProject(projectDetails);
      
      // Update the project in the projects list
      setProjects(prevProjects => {
        const projectIndex = prevProjects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) {
          return [...prevProjects, projectDetails];
        } else {
          const updatedProjects = [...prevProjects];
          updatedProjects[projectIndex] = projectDetails;
          return updatedProjects;
        }
      });
      
      return projectDetails;
    } catch (error) {
      console.error('Error opening project:', error);
      return null;
    }
  }, [user?.id]);

  const createFile = useCallback(async (projectId: string, name: string, type: FileType) => {
    if (!user?.id) return null;
    
    try {
      const newFile = await fileService.createFile(projectId, name, type, user.id);
      
      // Update files state
      setFiles(prevFiles => [...prevFiles, newFile]);
      
      // Update current project
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject({
          ...currentProject,
          files: [...currentProject.files, newFile]
        });
      }
      
      return newFile;
    } catch (error) {
      console.error("Error creating file:", error);
      return null;
    }
  }, [user?.id, currentProject]);

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
    currentProject
  };

  console.log('ProjectProvider value:', value);

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