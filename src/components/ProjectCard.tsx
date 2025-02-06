import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, File as FileIcon, Pencil, Trash2 } from 'lucide-react';
import type { Project } from '../types';
import { useProjects } from '../contexts/ProjectContext';
import ContextMenu from './common/ContextMenu';
import ConfirmationDialog from './common/ConfirmationDialog';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const { deleteProject, renameProject } = useProjects();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState(project.name);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDelete = () => {
    deleteProject(project.id);
    setShowDeleteConfirm(false);
  };

  const handleRename = () => {
    if (newName.trim() && newName !== project.name) {
      renameProject(project.id, newName);
    }
    setShowRenameDialog(false);
  };

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
      <Link 
        to={`/project/${project.id}`}
        className="group block bg-white/90 backdrop-blur-sm rounded-lg border border-purple-200 p-4 hover:border-purple-300 hover:shadow-md transition-all"
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-700 group-hover:bg-purple-200 group-hover:text-purple-800 transition-colors">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-gray-800">{project.name}</h3>
              <div className="flex items-center space-x-1.5 mt-1">
                <FileIcon className="w-3.5 h-3.5 text-purple-700" />
                <span className="text-xs text-purple-700 font-medium">
                  {project.files.length} files
                </span>
              </div>
            </div>
          </div>
          <span className="text-xs text-purple-700 font-medium">{project.lastModified}</span>
        </div>
      </Link>

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
        title="Delete Project"
        message={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
        confirmText="Delete"
        danger={true}
      />

      <ConfirmationDialog
        isOpen={showRenameDialog}
        onClose={() => setShowRenameDialog(false)}
        onConfirm={handleRename}
        title="Rename Project"
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