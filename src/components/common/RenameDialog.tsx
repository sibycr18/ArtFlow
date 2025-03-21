import React from 'react';

interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  initialName: string;
  setNewName: (name: string) => void;
}

export default function RenameDialog({ isOpen, onClose, onConfirm, initialName, setNewName }: RenameDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-indigo-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Rename Project</h2>
        <input
          type="text"
          value={initialName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Enter new name"
          autoFocus
        />
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
} 