import React, { useState } from 'react';
import { UserPlus, Users, Shield, Trash2 } from 'lucide-react';
import ConfirmationModal from './modals/ConfirmationModal';
import AddMemberModal from './modals/AddMemberModal';
import { useAuth } from '../context/AuthContext';

interface Collaborator {
  id: number;
  name: string;
  avatar: string;
  isAdmin: boolean;
}

export default function CollaboratorsList() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { 
      id: 1, 
      name: 'Member 1', 
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=faces',
      isAdmin: true 
    },
    { 
      id: 2, 
      name: 'Member 2', 
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=32&h=32&fit=crop&crop=faces',
      isAdmin: false 
    },
    { 
      id: 3, 
      name: 'Member 3', 
      avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=32&h=32&fit=crop&crop=faces',
      isAdmin: false 
    },
  ]);

  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<Collaborator | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleDeleteClick = (collaborator: Collaborator) => {
    setSelectedUser(collaborator);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedUser) {
      setCollaborators(collaborators.filter(c => c.id !== selectedUser.id));
      setShowDeleteConfirmation(false);
      setSelectedUser(null);
    }
  };

  const handleAddMember = (email: string) => {
    const newMember: Collaborator = {
      id: collaborators.length + 1,
      name: email.split('@')[0],
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=faces',
      isAdmin: false
    };
    setCollaborators([...collaborators, newMember]);
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-gray-500" />
            Collaborators
          </h3>
          <button 
            onClick={() => setShowAddMember(true)}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add Member
          </button>
        </div>
        <div className="space-y-3">
          {collaborators.map((collaborator) => (
            <div key={collaborator.id} className="flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={collaborator.avatar}
                    alt={collaborator.name}
                    className={`w-8 h-8 rounded-full ${collaborator.isAdmin ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}`}
                  />
                  {collaborator.isAdmin && (
                    <Shield className="w-4 h-4 text-indigo-600 absolute -bottom-1 -right-1 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-700">{collaborator.name}</span>
                  {collaborator.isAdmin && (
                    <span className="text-xs text-indigo-600 font-medium">Admin</span>
                  )}
                </div>
              </div>
              {user?.isAdmin && !collaborator.isAdmin && (
                <button 
                  onClick={() => handleDeleteClick(collaborator)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-full text-red-600"
                  aria-label={`Remove ${collaborator.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {showDeleteConfirmation && selectedUser && (
        <ConfirmationModal
          title="Remove Collaborator"
          message={`Are you sure you want to remove ${selectedUser.name} from this project? This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteConfirmation(false);
            setSelectedUser(null);
          }}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          onAdd={handleAddMember}
          onClose={() => setShowAddMember(false)}
        />
      )}
    </>
  );
}