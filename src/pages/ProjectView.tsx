import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CollaboratorsList from '../components/CollaboratorsList';
import ProjectChat from '../components/project/ProjectChat';
import CreateFileButton from '../components/project/CreateFileButton';
import { ProjectChatProvider } from '../contexts/ProjectChatContext';
import { useProjects } from '../contexts/ProjectContext';
import FileItem from '../components/FileItem';

export default function ProjectView() {
  const { id } = useParams();
  const { projects } = useProjects();
  const project = projects.find(p => p.id === id);

  if (!project) {
    return <div className="p-6">Project not found</div>;
  }

  return (
    <ProjectChatProvider projectId={project.id}>
      <div className="max-w-7xl mx-auto p-6">
        <Link 
          to="/"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                    <p className="text-sm text-gray-500 mt-1">Last modified: {project.lastModified}</p>
                  </div>
                  <CreateFileButton />
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {project.files.map((file) => (
                    <FileItem key={file.id} file={file} projectId={project.id} />
                  ))}
                  {project.files.length === 0 && (
                    <div className="col-span-full text-center py-8">
                      <p className="text-sm text-gray-500 italic">No files yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <CollaboratorsList />
          </div>
        </div>

        <ProjectChat />
      </div>
    </ProjectChatProvider>
  );
}