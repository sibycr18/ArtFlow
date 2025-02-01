import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { File as FileIcon, Image, FileText, ArrowLeft } from 'lucide-react';
import CollaboratorsList from '../components/CollaboratorsList';
import ProjectChat from '../components/project/ProjectChat';
import CreateFileButton from '../components/project/CreateFileButton';
import { ProjectChatProvider } from '../contexts/ProjectChatContext';
import { useProjects } from '../contexts/ProjectContext';

export default function ProjectView() {
  const { projectId } = useParams();
  const { projects } = useProjects();
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return <div className="p-6">Project not found</div>;
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'canvas':
        return <FileIcon className="w-5 h-5" />;
      case 'image':
        return <Image className="w-5 h-5" />;
      case 'document':
        return <FileText className="w-5 h-5" />;
      default:
        return <FileIcon className="w-5 h-5" />;
    }
  };

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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-500">Last modified {project.lastModified}</p>
              </div>
              <CreateFileButton />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.files.map((file) => (
                <div
                  key={file.id}
                  className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
                      {getFileIcon(file.type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{file.name}</h3>
                      <p className="text-xs text-gray-500">{file.lastModified}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <CollaboratorsList />
          </div>
        </div>
        <ProjectChat />
      </div>
    </ProjectChatProvider>
  );
}