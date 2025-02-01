import React from 'react';
import { Folder, File as FileIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Project } from '../types';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link 
      to={`/project/${project.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Folder className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{project.name}</h3>
            <div className="flex items-center space-x-1 mt-1">
              <FileIcon className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {project.files.length} files
              </span>
            </div>
          </div>
        </div>
        <span className="text-xs text-gray-400">{project.lastModified}</span>
      </div>
    </Link>
  );
}