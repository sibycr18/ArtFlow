import React, { useState, useEffect } from 'react';
import { X, File, Image, FileText } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectContext';
import { createPortal } from 'react-dom';
import { FileType } from '../../services/fileService';

const fileTypes = [
  { id: 'document', label: 'Document', icon: FileText, apiType: 'text' as FileType },
  { id: 'canvas', label: 'Canvas', icon: File, apiType: 'drawing' as FileType },
  { id: 'image', label: 'Image', icon: Image, apiType: 'model' as FileType },
] as const;

interface CreateFileModalProps {
  onClose: () => void;
  projectId: string;
}

export default function CreateFileModal({ onClose, projectId }: CreateFileModalProps) {
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'document' | 'canvas' | 'image' | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { createFile } = useProjects();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileName.trim()) {
      setError('File name is required');
      return;
    }

    if (!fileType) {
      setError('Please select a file type');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Find the selected file type and get its API type
      const selectedType = fileTypes.find(ft => ft.id === fileType);
      
      if (!selectedType) {
        throw new Error('Invalid file type selected');
      }

      console.log('Creating file with:', {
        projectId,
        fileName: fileName.trim(),
        fileType: selectedType.apiType
      });

      // Use createFile instead of addFile to persist to the database
      const newFile = await createFile(
        projectId, 
        fileName.trim(),
        fileType
      );
      
      if (!newFile) {
        throw new Error('Failed to create file');
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating file:', error);
      setError('Failed to create file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create New File</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="file-name" className="block text-sm font-medium text-gray-700 mb-2">
              File Name
            </label>
            <input
              id="file-name"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {fileTypes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFileType(id)}
                  className={`
                    flex flex-col items-center p-3 border rounded-lg gap-2
                    ${fileType === id 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}