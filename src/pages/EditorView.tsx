import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '../contexts/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { CanvasProvider } from '../contexts/CanvasContext';
import Canvas from '../components/Canvas';
import Document from '../components/Document';
import ImageEditor from '../components/ImageEditor';

export default function EditorView() {
  const { projectId, fileId } = useParams();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { user } = useAuth();

  // Find the project and file
  const project = projects.find(p => p.id === projectId);
  const file = project?.files.find(f => f.id === fileId);

  if (!project || !file) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">File Not Found</h2>
          <p className="text-gray-600 mb-4">The file you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Project
          </button>
        </div>
      </div>
    );
  }

  const handleClose = () => {
    navigate(`/project/${projectId}`);
  };

  // Render the appropriate editor based on file type
  const renderEditor = () => {
    switch (file.type) {
      case 'canvas':
        return (
          <CanvasProvider
            projectId={projectId!}
            fileId={fileId!}
            userId={user?.sub || 'anonymous'}
          >
            <Canvas onClose={handleClose} />
          </CanvasProvider>
        );
      case 'document':
        return <Document fileName={file.name} onClose={handleClose} />;
      case 'image':
        return <ImageEditor fileName={file.name} onClose={handleClose} />;
      default:
        return <div>Unsupported file type</div>;
    }
  };

  return renderEditor();
} 