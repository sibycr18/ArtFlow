import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, File as FileIcon, Pencil, Trash2 } from 'lucide-react';
import type { Project } from '../types';
import { useProjects } from '../contexts/ProjectContext';
import ContextMenu from './common/ContextMenu';
import ConfirmationDialog from './common/ConfirmationDialog';
import RenameDialog from './common/RenameDialog';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const { deleteProject, renameProject } = useProjects();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const success = await deleteProject(project.id);
      if (!success) {
        throw new Error('Failed to delete project');
      }
      setShowDeleteConfirm(false);
    } catch (error) {
      setDeleteError('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(false);
    }
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
      onClick: () => {
        setDeleteError(null);
        setShowDeleteConfirm(true);
      },
      icon: Trash2,
      danger: true
    }
  ];

  return (
    <>
      <Link 
        to={`/project/${project.id}`}
        className="block bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow"
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Folder className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 line-clamp-1">{project.name}</h3>
              <div className="flex items-center space-x-1 mt-1">
                <FileIcon className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {project.files.length} files
                </span>
              </div>
            </div>
          </div>
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
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        title="Delete Project"
        message={
          <>
            <p>Are you sure you want to delete "{project.name}"? This action cannot be undone.</p>
            <p className="mt-2 text-sm text-gray-500">All files in this project will be permanently deleted.</p>
            {deleteError && (
              <p className="mt-2 text-sm text-red-600">{deleteError}</p>
            )}
          </>
        }
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        confirmDisabled={isDeleting}
        danger={true}
      />

      <RenameDialog
        isOpen={showRenameDialog}
        onClose={() => setShowRenameDialog(false)}
        onConfirm={handleRename}
        initialName={project.name}
        setNewName={setNewName}
      />
    </>
  );
}