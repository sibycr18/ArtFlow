import React from 'react';
import ProjectCard from '../components/ProjectCard';
import NewProjectButton from '../components/NewProjectButton';
import { useProjects } from '../contexts/ProjectContext';

export default function Dashboard() {
  const { projects } = useProjects();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
              <p className="text-sm text-gray-500 mt-1">Manage and organize your creative projects</p>
            </div>
            <NewProjectButton />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
            {projects.length === 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-sm text-gray-500 italic">No projects yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}