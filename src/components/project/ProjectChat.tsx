import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatMessage from '../chat/ChatMessage';
import ChatInput from '../chat/ChatInput';
import { useProjectChat } from '../../contexts/ProjectChatContext';

export default function ProjectChat() {
  const { messages, isOpen, toggleChat, sendMessage } = useProjectChat();
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={`
          origin-bottom-right
          transition-all duration-300 ease-in-out
          ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}
          w-80 bg-white rounded-lg shadow-xl border border-gray-200
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Project Chat</h3>
          <button
            onClick={toggleChat}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
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
          absolute bottom-0 right-0
          p-4 bg-indigo-600 text-white rounded-full shadow-lg 
          hover:bg-indigo-700 transition-all duration-300 ease-in-out
          ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
        `}
        aria-label="Toggle project chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}