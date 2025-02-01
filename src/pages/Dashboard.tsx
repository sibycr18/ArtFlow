import React from 'react';
import ProjectCard from '../components/ProjectCard';
import NewProjectButton from '../components/NewProjectButton';
import { useProjects } from '../contexts/ProjectContext';

export default function Dashboard() {
  const { projects } = useProjects();

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
          <NewProjectButton />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}