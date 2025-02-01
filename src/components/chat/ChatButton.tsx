import React from 'react';
import { MessageCircle } from 'lucide-react';
import Draggable from 'react-draggable';

interface ChatButtonProps {
  position: { x: number; y: number };
  onDragStart: () => void;
  onDrag: () => void;
  onDragStop: (e: any, data: { x: number; y: number }) => void;
  nodeRef: React.RefObject<HTMLDivElement>;
}

export default function ChatButton({ position, onDragStart, onDrag, onDragStop, nodeRef }: ChatButtonProps) {
  return (
    <Draggable
      nodeRef={nodeRef}
      position={position}
      onStart={onDragStart}
      onDrag={onDrag}
      onStop={onDragStop}
      bounds="body"
    >
      <div 
        ref={nodeRef} 
        className="fixed bottom-6 right-6 z-[100]"
        style={{ touchAction: 'none' }}
      >
        <button 
          className="p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all cursor-move"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    </Draggable>
  );
}