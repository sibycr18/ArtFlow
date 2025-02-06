import React, { useState } from 'react';
import { File as FileIcon, Image, PenSquare, Pencil, Trash2 } from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import ContextMenu from './common/ContextMenu';
import ConfirmationDialog from './common/ConfirmationDialog';

interface FileItemProps {
  file: {
    id: string;
    name: string;
    type: 'canvas' | 'image' | 'document';
  };
  projectId: string;
}

export default function FileItem({ file, projectId }: FileItemProps) {
  const { deleteFile, renameFile } = useProjects();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState(file.name);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDelete = () => {
    deleteFile(projectId, file.id);
    setShowDeleteConfirm(false);
  };

  const handleRename = () => {
    if (newName.trim() && newName !== file.name) {
      renameFile(projectId, file.id, newName);
    }
    setShowRenameDialog(false);
  };

  const getFileIcon = () => {
    switch (file.type) {
      case 'image':
        return Image;
      case 'canvas':
        return PenSquare;
      default:
        return FileIcon;
    }
  };

  const Icon = getFileIcon();

  const contextMenuItems = [
    {
      label: 'Rename',
      onClick: () => setShowRenameDialog(true),
      icon: Pencil
    },
    {
      label: 'Delete',
      onClick: () => setShowDeleteConfirm(true),
      icon: Trash2,
      danger: true
    }
  ];

  return (
    <>
      <div
        className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{file.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{file.type}</p>
          </div>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          items={contextMenuItems}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete File"
        message={`Are you sure you want to delete "${file.name}"? This action cannot be undone.`}
        confirmText="Delete"
        danger={true}
      />

      {showRenameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowRenameDialog(false)} />
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-indigo-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Rename File</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter new name"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRenameDialog(false)}
                className="px-4 py-2 text-gray-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
