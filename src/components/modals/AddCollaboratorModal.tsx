import React, { useState } from 'react';
import { X, Search, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://artflow-backend-64f27556b9a4.herokuapp.com';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface AddCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onCollaboratorAdded: () => void;
}

export default function AddCollaboratorModal({ 
  isOpen, 
  onClose,
  projectId,
  onCollaboratorAdded
}: AddCollaboratorModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/search?email=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      
      const data = await response.json();
      setSearchResults(data);
      
      if (data.length === 0) {
        setError('No users found with that email');
      }
    } catch (error) {
      setError('Error searching for users');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollaborator = async (collaboratorId: string) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/collaborators`, {
        method: 'POST',
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
        throw new Error('Failed to add collaborator');
      }
      
      setSuccess('Collaborator added successfully!');
      setSearchResults([]);
      setSearchTerm('');
      
      // Notify parent component
      onCollaboratorAdded();
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      setError('Error adding collaborator');
      console.error('Add collaborator error:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-xl font-semibold text-gray-800">Add Collaborator</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="email-search" className="block text-sm font-medium text-gray-700 mb-1">
              Search by email
            </label>
            <div className="relative">
              <input
                id="email-search"
                type="email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter user email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-indigo-100 rounded-full text-indigo-600 hover:bg-indigo-200 transition-colors"
              >
                <Search size={18} />
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
              {success}
            </div>
          )}
          
          {searchResults.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Search Results</h3>
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                {searchResults.map((result) => (
                  <li key={result.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {result.picture && (
                        <img 
                          src={result.picture} 
                          alt={result.name} 
                          className="w-8 h-8 rounded-full object-cover"
                          referrerpolicy="no-referrer"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{result.name}</p>
                        <p className="text-sm text-gray-500">{result.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddCollaborator(result.id)}
                      className="p-1.5 bg-indigo-100 rounded-full text-indigo-600 hover:bg-indigo-200 transition-colors"
                      title="Add as collaborator"
                    >
                      <Plus size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}