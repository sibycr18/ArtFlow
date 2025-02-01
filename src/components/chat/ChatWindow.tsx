import React from 'react';
import { X } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface ChatWindowProps {
  position: { x: number; y: number };
  onClose: () => void;
  message: string;
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
}

export default function ChatWindow({ 
  position, 
  onClose, 
  message, 
  onMessageChange, 
  onSendMessage 
}: ChatWindowProps) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Team Chat</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full"
          aria-label="Close chat"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      
      <div className="h-96 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <ChatMessage 
            avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=faces"
            message="Let's work on the color scheme."
          />
        </div>

        <ChatInput
          message={message}
          onChange={onMessageChange}
          onSend={onSendMessage}
        />
      </div>
    </div>
  );
}