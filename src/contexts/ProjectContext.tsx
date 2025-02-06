import React, { createContext, useContext, useState } from 'react';
import { Project } from '../types';
import { projects as initialProjects } from '../data/mockData';

// Log initial mock data
console.log('Loading mock data:', initialProjects);

interface ProjectContextType {
  projects: Project[];
  addProject: (name: string) => void;
  addFile: (projectId: string, file: { name: string; type: 'canvas' | 'image' | 'document' }) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, newName: string) => void;
  deleteFile: (projectId: string, fileId: string) => void;
  renameFile: (projectId: string, fileId: string, newName: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  console.log('ProjectProvider initializing with:', initialProjects);
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const addProject = (name: string) => {
    const newProject: Project = {
      id: `p${projects.length + 1}`,
      name,
      lastModified: 'Just now',
      files: []
    };

    setProjects([newProject, ...projects]);
  };

  const addFile = (projectId: string, file: { name: string; type: 'canvas' | 'image' | 'document' }) => {
    console.log('Adding file:', { projectId, file });
    console.log('Current projects:', projects);

    setProjects(projects.map(project => {
      if (project.id === projectId) {
        const updatedProject = {
          ...project,
          lastModified: 'Just now',
          files: [
            ...project.files,
            {
              id: `f${project.files.length + 1}`,
              ...file
            }
          ]
        };
        console.log('Updated project:', updatedProject);
        return updatedProject;
      }
      return project;
    }));
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter(project => project.id !== id));
  };

  const renameProject = (id: string, newName: string) => {
    setProjects(projects.map(project => 
      project.id === id ? { ...project, name: newName } : project
    ));
  };

  const deleteFile = (projectId: string, fileId: string) => {
    setProjects(projects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          lastModified: 'Just now',
          files: project.files.filter(file => file.id !== fileId)
        };
      }
      return project;
    }));
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

  const value = {
    projects,
    addProject,
    addFile,
    deleteProject,
    renameProject,
    deleteFile,
    renameFile
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