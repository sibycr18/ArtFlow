import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '../contexts/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { CanvasProvider } from '../contexts/CanvasContext';
import { ImageEditorProvider } from '../contexts/ImageEditorContext';
import Canvas from '../components/Canvas';
import CollaborativeDocument from '../components/CollaborativeDocument';
import ImageEditor from '../components/ImageEditor';
import { Loader2 } from 'lucide-react';

export default function EditorView() {
  const { projectId, fileId } = useParams();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Use effect to simulate loading time and allow projects to load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // Show loading state for at least 800ms
    
    return () => clearTimeout(timer);
  }, []);

  // Find the project and file
  const project = projects.find(p => p.id === projectId);
  const file = project?.files.find(f => f.id === fileId);

  // Show loading screen while content is loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-purple-900">Loading file...</h2>
        </div>
      </div>
    );
  }

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
            <Canvas fileId={fileId!} onClose={handleClose} />
          </CanvasProvider>
        );
      case 'document':
        return (
          <CollaborativeDocument 
            fileName={file.name} 
            projectId={projectId!} 
            fileId={fileId!} 
            userId={user?.sub || 'anonymous'} 
            onClose={handleClose} 
          />
        );
      case 'image':
        return (
          <ImageEditorProvider
            projectId={projectId!}
            fileId={fileId!}
            userId={user?.sub || 'anonymous'}
          >
            <ImageEditor 
              fileName={file.name} 
              onClose={handleClose}
              projectId={projectId}
              fileId={fileId}
              userId={user?.sub || 'anonymous'}
            />
          </ImageEditorProvider>
        );
      default:
        return <div>Unsupported file type</div>;
    }
  };

  return renderEditor();
} 