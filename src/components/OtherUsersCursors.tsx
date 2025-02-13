import React from 'react';
import { useCanvas } from '../contexts/CanvasContext';

interface OtherUsersCursorsProps {
  canvasWidth: number;
  canvasHeight: number;
}

const OtherUsersCursors: React.FC<OtherUsersCursorsProps> = ({ canvasWidth, canvasHeight }) => {
  const { otherUsers } = useCanvas();

  return (
    <div className="absolute inset-0 pointer-events-none">
      {Object.entries(otherUsers).map(([userId, position]) => (
        <div
          key={userId}
          className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${(position.x / canvasWidth) * 100}%`,
            top: `${(position.y / canvasHeight) * 100}%`,
          }}
        >
          {/* Cursor icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.5 1.5L12.5 7.5L8 8.5L6.5 12.5L3.5 1.5Z"
              fill="#6200EE"
              stroke="#6200EE"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          
          {/* User label */}
          <div
            className="absolute left-4 top-0 px-2 py-1 bg-purple-600 text-white text-xs rounded-md whitespace-nowrap"
          >
            User {userId.slice(0, 4)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OtherUsersCursors; 