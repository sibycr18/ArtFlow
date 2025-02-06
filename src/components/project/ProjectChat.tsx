import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, GripHorizontal } from 'lucide-react';
import ChatMessage from '../chat/ChatMessage';
import ChatInput from '../chat/ChatInput';
import { useProjectChat } from '../../contexts/ProjectChatContext';

export default function ProjectChat() {
  const { messages, isOpen, toggleChat, sendMessage } = useProjectChat();
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 500 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>();
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        
        let newX = dragRef.current.initialX + dx;
        let newY = dragRef.current.initialY + dy;

        // Boundary checks
        const maxX = window.innerWidth - (chatRef.current?.offsetWidth || 0);
        const maxY = window.innerHeight - (chatRef.current?.offsetHeight || 0);
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div 
      ref={chatRef}
      style={{ 
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none',
        transform: isOpen ? 'scale(1)' : 'scale(0)',
        opacity: isOpen ? 1 : 0,
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
      }}
    >
      <div className="w-80 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-purple-100 overflow-hidden">
        <div 
          className="flex items-center justify-between p-4 border-b border-purple-100 bg-purple-50/50 cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-5 h-5 text-purple-400" />
            <h3 className="font-medium text-gray-900">Project Chat</h3>
          </div>
          <button
            onClick={toggleChat}
            className="p-1 hover:bg-purple-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-purple-500" />
          </button>
        </div>
        
        <div className="h-96 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <ChatMessage 
                key={msg.id}
                avatar={msg.sender.avatar}
                message={msg.content}
              />
            ))}
          </div>

          <ChatInput
            message={message}
            onChange={(e) => setMessage(e.target.value)}
            onSend={handleSendMessage}
          />
        </div>
      </div>

      <button 
        onClick={toggleChat}
        className={`
          absolute bottom-4 right-4
          p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg 
          hover:from-purple-700 hover:to-blue-700 transition-all duration-300 ease-in-out
          ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
        `}
        aria-label="Toggle project chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}