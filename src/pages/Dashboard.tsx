import React from 'react';
import ProjectCard from '../components/ProjectCard';
import NewProjectButton from '../components/NewProjectButton';
import { useProjects } from '../contexts/ProjectContext';
import { Palette } from 'lucide-react';

export default function Dashboard() {
  const { projects } = useProjects();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-purple-100">
          <div className="p-8 border-b border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Palette className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    My Projects
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">Bring your creative visions to life</p>
                </div>
              </div>
              <NewProjectButton />
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
              {projects.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-purple-50 rounded-full mb-4">
                    <Palette className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-gray-500 text-center">
                    No projects yet. Start creating something amazing!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}