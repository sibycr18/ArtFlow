import React, { useState } from 'react';
import { Plus, Check, X, Loader2 } from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

export default function NewProjectButton() {
  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addProject } = useProjects();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!projectName.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newProject = await addProject(projectName.trim());
      
      if (newProject) {
        setProjectName('');
        setIsCreating(false);
        
        // Optionally, navigate to the new project
        navigate(`/projects/${newProject.id}`);
      } else {
        setError('Failed to create project. Please try again.');
      }
    } catch (error) {
      console.error('Project creation error:', error);
      setError('An error occurred while creating the project.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCreating) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleCreate()}
            disabled={isLoading}
          />
          <button
            onClick={handleCreate}
            disabled={!projectName.trim() || isLoading}
            className="p-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsCreating(false)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            disabled={isLoading}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {error && (
          <div className="text-sm text-red-500 mt-1">{error}</div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsCreating(true)}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
    >
      <Plus className="w-4 h-4 mr-2" />
      New Project
    </button>
  );
}