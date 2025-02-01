import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import ChatMessage from './chat/ChatMessage';
import ChatInput from './chat/ChatInput';

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessage('');
    }
  };

  const toggleChat = () => {
    setIsAnimating(true);
    setIsOpen(!isOpen);
  };

  const handleAnimationEnd = () => {
    setIsAnimating(false);
  };

  return (
    <div 
      ref={containerRef}
      className={`fixed bottom-6 right-6 z-50 ${isAnimating ? 'pointer-events-none' : ''}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
    >
      <div
        className={`
          origin-bottom-right
          transition-all duration-300 ease-in-out
          ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}
          w-80 bg-white rounded-lg shadow-xl border border-gray-200
        `}
        onTransitionEnd={handleAnimationEnd}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Team Chat</h3>
          <button
            onClick={toggleChat}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
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
        aria-label="Toggle chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}