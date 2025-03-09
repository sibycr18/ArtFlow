import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, GripHorizontal, AlertCircle } from 'lucide-react';
import ChatMessage from '../chat/ChatMessage';
import ChatInput from '../chat/ChatInput';
import { useProjectChat } from '../../contexts/ProjectChatContext';
import { useAuth } from '../../context/AuthContext';

export default function ProjectChat() {
  const { messages, isOpen, toggleChat, sendMessage, isLoading } = useProjectChat();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [buttonPosition, setButtonPosition] = useState({ x: window.innerWidth - 88, y: window.innerHeight - 88 });
  const [isDragging, setIsDragging] = useState(false);
  const [isButtonDragging, setIsButtonDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [connectionError, setConnectionError] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>();
  const chatRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Connection status checker
  useEffect(() => {
    // A simple way to detect if messages aren't loading properly
    let errorTimer: NodeJS.Timeout;
    
    if (isOpen && isLoading) {
      // If loading takes too long, show connection error
      errorTimer = setTimeout(() => {
        setConnectionError(true);
      }, 10000); // 10 seconds timeout
    } else {
      setConnectionError(false);
    }
    
    return () => {
      clearTimeout(errorTimer);
    };
  }, [isOpen, isLoading]);

  // Calculate chat position based on button position and available space
  const getChatPosition = () => {
    const CHAT_WIDTH = 320;
    const CHAT_HEIGHT = 440;
    const MARGIN = 16;

    // Try positions in order of preference
    const positions = [
      // Above left (default)
      {
        x: buttonPosition.x - CHAT_WIDTH + 40,
        y: buttonPosition.y - CHAT_HEIGHT - 16,
        origin: 'bottom right'
      },
      // Above right
      {
        x: buttonPosition.x,
        y: buttonPosition.y - CHAT_HEIGHT - 16,
        origin: 'bottom left'
      },
      // Below left
      {
        x: buttonPosition.x - CHAT_WIDTH + 40,
        y: buttonPosition.y + 56,
        origin: 'top right'
      },
      // Below right
      {
        x: buttonPosition.x,
        y: buttonPosition.y + 56,
        origin: 'top left'
      },
      // Left side
      {
        x: buttonPosition.x - CHAT_WIDTH - 16,
        y: buttonPosition.y - CHAT_HEIGHT / 2,
        origin: 'center right'
      },
      // Right side
      {
        x: buttonPosition.x + 56,
        y: buttonPosition.y - CHAT_HEIGHT / 2,
        origin: 'center left'
      }
    ];

    // Find the first position that fits within the viewport
    for (const pos of positions) {
      if (
        pos.x >= MARGIN &&
        pos.y >= MARGIN &&
        pos.x + CHAT_WIDTH <= window.innerWidth - MARGIN &&
        pos.y + CHAT_HEIGHT <= window.innerHeight - MARGIN
      ) {
        return pos;
      }
    }

    // If no position fits perfectly, use the first position but constrained to viewport
    return {
      x: Math.max(MARGIN, Math.min(window.innerWidth - CHAT_WIDTH - MARGIN, positions[0].x)),
      y: Math.max(MARGIN, Math.min(window.innerHeight - CHAT_HEIGHT - MARGIN, positions[0].y)),
      origin: positions[0].origin
    };
  };

  const chatPosition = getChatPosition();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if ((isDragging || isButtonDragging) && dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        
        let newX = dragRef.current.initialX + dx;
        let newY = dragRef.current.initialY + dy;

        // Boundary checks
        if (isDragging) {
          const maxX = window.innerWidth - 40;
          const maxY = window.innerHeight - 40;
          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));
          
          // When dragging chat, update button position based on current chat position
          const chatPos = getChatPosition();
          const buttonX = chatPos.origin.includes('right') 
            ? newX + 320 - 40  // Chat is to the left of button
            : newX;            // Chat is to the right of button
          const buttonY = chatPos.origin.includes('bottom')
            ? newY + 440 + 16  // Chat is above button
            : chatPos.origin.includes('top')
              ? newY - 56      // Chat is below button
              : newY + 220;    // Chat is beside button

          setButtonPosition({ 
            x: Math.max(0, Math.min(buttonX, window.innerWidth - 40)),
            y: Math.max(0, Math.min(buttonY, window.innerHeight - 40))
          });
        } else {
          // When dragging button, directly update its position
          const maxX = window.innerWidth - 40;
          const maxY = window.innerHeight - 40;
          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));
          setButtonPosition({ x: newX, y: newY });
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isButtonDragging) {
        const dx = Math.abs(e.clientX - dragStart.x);
        const dy = Math.abs(e.clientY - dragStart.y);
        if (dx < 5 && dy < 5) {
          toggleChat();
        }
      }
      setIsDragging(false);
      setIsButtonDragging(false);
    };

    if (isDragging || isButtonDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isButtonDragging, dragStart, toggleChat]);

  const handleMouseDown = (e: React.MouseEvent, isButton: boolean = false) => {
    e.preventDefault();
    if (isButton) {
      setIsButtonDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: buttonPosition.x,
        initialY: buttonPosition.y
      };
    } else {
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: chatPosition.x,
        initialY: chatPosition.y
      };
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <>
      {/* Chat Window */}
      <div 
        className={`fixed z-[100] ${
          isOpen 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
        style={{ 
          left: chatPosition.x,
          top: chatPosition.y,
          touchAction: 'none',
          transformOrigin: chatPosition.origin,
          transition: isButtonDragging || isDragging ? 'none' : 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out'
        }}
        ref={chatRef}
      >
        <div className="w-80 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-purple-100 overflow-hidden">
          <div 
            className="flex items-center justify-between p-4 border-b border-purple-100 bg-purple-50/50 cursor-move"
            onMouseDown={(e) => handleMouseDown(e)}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-5 h-5 text-purple-400" />
              <h3 className="font-medium text-gray-900">Project Chat</h3>
            </div>
            <button
              onClick={toggleChat}
              className="p-1 hover:bg-purple-100 rounded-full transition-colors duration-200"
            >
              <X className="w-5 h-5 text-purple-500" />
            </button>
          </div>
          
          <div className="h-96 flex flex-col">
            {connectionError && (
              <div className="bg-red-50 border-b border-red-100 p-2 flex items-center justify-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">Connection issue. Messages may not be live.</span>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2" id="chat-messages-container">
              {isLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Start the conversation!</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatMessage 
                      key={msg.id}
                      avatar={msg.sender.avatar}
                      message={msg.content}
                      isCurrentUser={msg.sender.id === user?.id}
                      senderName={msg.sender.name}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <ChatInput
              message={message}
              onChange={(e) => setMessage(e.target.value)}
              onSend={handleSendMessage}
            />
          </div>
        </div>
      </div>

      {/* Chat Button */}
      <div 
        ref={buttonRef}
        className={`fixed z-[100] cursor-move ${
          !isOpen 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
        style={{
          left: buttonPosition.x,
          top: buttonPosition.y,
          touchAction: 'none',
          transformOrigin: 'center',
          transition: isButtonDragging || isDragging ? 'none' : 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out'
        }}
        onMouseDown={(e) => handleMouseDown(e, true)}
      >
        <button 
          className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 ease-in-out"
          aria-label="Toggle project chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    </>
  );
}