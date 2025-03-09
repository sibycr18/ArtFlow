import React, { useRef, useState } from 'react';
import ChatButton from './ChatButton';
import ChatWindow from './ChatWindow';
import { ProjectChatProvider, useProjectChat } from '../../contexts/ProjectChatContext';

interface ProjectChatProps {
  projectId: string;
}

function ChatComponent() {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { isOpen, toggleChat } = useProjectChat();

  const handleDragStart = () => {
    // Nothing needed on drag start
  };

  const handleDrag = () => {
    // Nothing needed during drag
  };

  const handleDragStop = (e: any, data: { x: number; y: number }) => {
    setPosition({ x: data.x, y: data.y });
  };

  return (
    <>
      <ChatButton
        position={position}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        nodeRef={nodeRef}
      />
      
      {isOpen && (
        <ChatWindow
          position={position}
          onClose={toggleChat}
        />
      )}
    </>
  );
}

export default function ProjectChat({ projectId }: ProjectChatProps) {
  return (
    <ProjectChatProvider projectId={projectId}>
      <ChatComponent />
    </ProjectChatProvider>
  );
} 