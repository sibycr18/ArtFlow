import React, { createContext, useContext, useState } from 'react';
import { Project } from '../types';
import { projects as initialProjects } from '../data/mockData';

interface ProjectContextType {
  projects: Project[];
  addProject: (name: string) => void;
  addFile: (projectId: string, file: { name: string; type: 'canvas' | 'image' | 'document' }) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
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

  return (
    <ProjectContext.Provider value={{ projects, addProject, addFile }}>
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