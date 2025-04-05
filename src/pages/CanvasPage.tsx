import React from 'react';
import { useParams } from 'react-router-dom';
import Canvas from '../components/Canvas';

const CanvasPage: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();

  if (!fileId) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">File Not Found</h2>
          <p className="text-gray-600">Please select a valid file to edit.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Canvas fileId={fileId} />
    </div>
  );
};

export default CanvasPage;
