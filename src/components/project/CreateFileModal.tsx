import React, { useState, useEffect } from 'react';
import { X, File, Image, FileText } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectContext';
import { createPortal } from 'react-dom';

const fileTypes = [
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'canvas', label: 'Canvas', icon: File },
  { id: 'image', label: 'Image', icon: Image },
] as const;

interface CreateFileModalProps {
  onClose: () => void;
  projectId: string;
}

export default function CreateFileModal({ onClose, projectId }: CreateFileModalProps) {
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'document' | 'canvas' | 'image'>('document');
  const [error, setError] = useState('');
  const { addFile } = useProjects();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileName.trim()) {
      setError('File name is required');
      return;
    }

    console.log('Creating file with:', {
      projectId,
      fileName: fileName.trim(),
      fileType
    });

    addFile(projectId, {
      name: fileName.trim(),
      type: fileType,
    });
    
    onClose();
  };

  const modal = (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create New File</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
              File Name
            </label>
            <input
              type="text"
              id="fileName"
              value={fileName}
              onChange={(e) => {
                setFileName(e.target.value);
                setError('');
              }}
              className={`
                w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2
                ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-indigo-200'}
              `}
              placeholder="Enter file name"
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
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
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              Create File
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}