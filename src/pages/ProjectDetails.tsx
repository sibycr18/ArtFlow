import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '../contexts/ProjectContext';
import CollaboratorsList from '../components/CollaboratorsList';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'wss://artflow-backend-64f27556b9a4.herokuapp.com';

interface ProjectDetails {
  id: string;
  name: string;
  lastModified: string;
  admin_id: string;
}

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects } = useProjects();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const localProject = projects.find(p => p.id === projectId);

  useEffect(() => {
    if (localProject) {
      setProjectDetails({
        id: localProject.id,
        name: localProject.name,
        lastModified: localProject.lastModified,
        admin_id: '' // We don't have this in local state
      });
      setLoading(false);
      return;
    }

    // If not found in local state, try to fetch from backend
    const fetchProjectDetails = async () => {
      if (!projectId || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Note: You may need to create this endpoint in your backend
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}?user_id=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch project details');
        }
        
        const data = await response.json();
        setProjectDetails({
          id: data.id,
          name: data.name,
          lastModified: new Date(data.created_at).toLocaleString(),
          admin_id: data.admin_id
        });
      } catch (error) {
        console.error('Error fetching project details:', error);
        setError('Failed to load project details');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [projectId, user?.id, localProject]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900">Loading project...</h2>
        </div>
      </div>
    );
  }
  
  if (error || (!projectDetails && !localProject)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Not Found</h1>
          <p className="text-gray-600">{error || "The project you're looking for doesn't exist or you don't have access to it."}</p>
        </div>
      </div>
    );
  }
  
  // Use projectDetails if available, otherwise fall back to localProject
  const project = projectDetails || {
    id: localProject?.id || '',
    name: localProject?.name || '',
    lastModified: localProject?.lastModified || ''
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-600">Last modified: {project.lastModified}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Files and content go here */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Project Files</h2>
              {/* Files list */}
              <div className="border rounded-lg p-4 bg-gray-50 text-center text-gray-500">
                File list will be displayed here
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            {/* Collaborators section */}
            <div className="mb-6">
              {projectId && <CollaboratorsList projectId={projectId} />}
            </div>
            
            {/* Project settings and other info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Project Settings</h2>
              <div className="border rounded-lg p-4 bg-gray-50 text-center text-gray-500">
                Settings will be displayed here
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 