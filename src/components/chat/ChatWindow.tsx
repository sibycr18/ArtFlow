import React, { useState } from 'react';
import { X } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { useProjectChat } from '../../contexts/ProjectChatContext';

interface ChatWindowProps {
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ChatWindow({ 
  position, 
  onClose
}: ChatWindowProps) {
  const { messages, sendMessage, isLoading } = useProjectChat();
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Project Chat</h3>
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
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map(msg => (
              <ChatMessage
                key={msg.id} 
                avatar={msg.sender.avatar}
                message={msg.content}
              />
            ))
          )}
        </div>

        <ChatInput
          message={inputMessage}
          onChange={handleMessageChange}
          onSend={handleSendMessage}
        />
      </div>
    </div>
  );
}