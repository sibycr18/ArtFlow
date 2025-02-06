import React, { createContext, useContext, useState } from 'react';
import { Project } from '../types';
import { projects as initialProjects } from '../data/mockData';

// Log initial mock data
console.log('Loading mock data:', initialProjects);

interface ProjectContextType {
  projects: Project[];
  addProject: (name: string) => void;
  addFile: (projectId: string, file: { name: string; type: 'canvas' | 'image' | 'document' }) => void;
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
    setProjects(projects.map(project => {
      if (project.id === projectId) {
        const newFile = {
          id: `f${project.files.length + 1}`,
          name: file.name,
          type: file.type,
          lastModified: 'Just now'
        };
        return {
          ...project,
          lastModified: 'Just now',
          files: [...project.files, newFile]
        };
      }
      return project;
    }));
  };

  const value = {
    projects,
    addProject,
    addFile
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