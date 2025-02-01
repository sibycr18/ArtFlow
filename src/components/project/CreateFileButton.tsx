import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import CreateFileModal from './CreateFileModal';

export default function CreateFileButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
      >
        <Plus className="w-4 h-4 mr-2" />
        New File
      </button>

      {showModal && <CreateFileModal onClose={() => setShowModal(false)} />}
    </>
  );
}