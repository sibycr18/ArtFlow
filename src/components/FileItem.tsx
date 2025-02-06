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
        className="group p-4 bg-white/90 backdrop-blur-sm rounded-lg border border-purple-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-700 group-hover:bg-purple-200 group-hover:text-purple-800 transition-colors">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800">{file.name}</h3>
            <p className="text-xs text-purple-700 mt-1 capitalize font-medium">{file.type}</p>
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

      <ConfirmationDialog
        isOpen={showRenameDialog}
        onClose={() => setShowRenameDialog(false)}
        onConfirm={handleRename}
        title="Rename File"
        confirmText="Rename"
        danger={false}
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
          placeholder="Enter new name"
          autoFocus
        />
      </ConfirmationDialog>
    </>
  );
}
