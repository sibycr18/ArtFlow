import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Shield, Trash2 } from 'lucide-react';
import AddCollaboratorModal from './modals/AddCollaboratorModal';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://artflow-backend-64f27556b9a4.herokuapp.com';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  picture: string;
  is_admin: boolean;
}

interface CollaboratorsListProps {
  projectId: string;
}

export default function CollaboratorsList({ projectId }: CollaboratorsListProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const isCurrentUserAdmin = () => {
    if (!user?.id) return false;
    const admin = collaborators.find(c => c.is_admin);
    return admin?.id === user.id;
  };

  const fetchCollaborators = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/collaborators?user_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
      }
      
      const data = await response.json();
      setCollaborators(data);
    } catch (error) {
      setError('Error loading collaborators');
      console.error('Fetch collaborators error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!user?.id || !isCurrentUserAdmin()) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/collaborators`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          admin_id: user.id,
          collaborator_id: collaboratorId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove collaborator');
      }
      
      // Refresh the collaborators list
      await fetchCollaborators();
    } catch (error) {
      setError('Error removing collaborator');
      console.error('Remove collaborator error:', error);
    }
  };

  useEffect(() => {
    if (projectId && user?.id) {
      fetchCollaborators();
    }
  }, [projectId, user?.id]);

  if (!user) return null;

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-gray-500" />
            Collaborators
          </h3>
          {isCurrentUserAdmin() && (
            <button
              onClick={() => setShowAddModal(true)}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Add Member
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-3">Loading collaborators...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-3">{error}</div>
        ) : collaborators.length === 0 ? (
          <div className="text-center text-gray-500 py-3">No collaborators found</div>
        ) : (
          <div className="space-y-3">
            {collaborators.map((collaborator) => (
              <div key={collaborator.id} className="flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img 
                      src={collaborator.picture}
                      alt={collaborator.name} 
                      className={`w-8 h-8 rounded-full ${collaborator.is_admin ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}`}
                      referrerPolicy="no-referrer"
                    />
                    {collaborator.is_admin && (
                      <Shield className="w-4 h-4 text-indigo-600 absolute -bottom-1 -right-1 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700">{collaborator.name}</span>
                    {collaborator.is_admin && (
                      <span className="text-xs text-indigo-600 font-medium">Admin</span>
                    )}
                  </div>
                </div>
                {isCurrentUserAdmin() && !collaborator.is_admin && (
                  <button
                    onClick={() => handleRemoveCollaborator(collaborator.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-full text-red-600"
                    aria-label={`Remove ${collaborator.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showAddModal && (
        <AddCollaboratorModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          projectId={projectId}
          onCollaboratorAdded={fetchCollaborators}
        />
      )}
    </>
  );
}