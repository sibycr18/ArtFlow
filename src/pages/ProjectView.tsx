import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FolderOpen } from 'lucide-react';
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
  const [isFileOpen, setIsFileOpen] = useState(false);

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-purple-100">
                <div className="p-6">
                  <Link 
                    to="/"
                    className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 hover:text-purple-700 transition-colors inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Projects</span>
                  </Link>
                  <div className="mt-4 text-center">
                    <p className="text-gray-600">Project not found</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProjectChatProvider projectId={project.id}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-purple-100">
                <div className="p-6 border-b border-purple-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Link 
                        to="/"
                        className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Link>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <FolderOpen className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent pb-[2px]">
                          {project.name}
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">Last modified: {project.lastModified}</p>
                      </div>
                    </div>
                    {!isFileOpen && <CreateFileButton projectId={project.id} />}
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max">
                    {project.files.map((file) => (
                      <FileItem 
                        key={file.id} 
                        file={file} 
                        projectId={project.id} 
                        onFileOpen={() => setIsFileOpen(true)}
                        onFileClose={() => setIsFileOpen(false)}
                      />
                    ))}
                    {project.files.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-12">
                        <div className="p-4 bg-purple-50 rounded-full mb-4">
                          <FolderOpen className="w-8 h-8 text-purple-400" />
                        </div>
                        <p className="text-gray-500 text-center">
                          No files yet. Start adding your creative assets!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!isFileOpen && (
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-purple-100 p-6 lg:sticky lg:top-8">
                  <CollaboratorsList />
                </div>
              </div>
            )}
          </div>
        </div>

        {!isFileOpen && <ProjectChat />}
      </div>
    </ProjectChatProvider>
  );
}