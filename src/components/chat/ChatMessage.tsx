import React from 'react';

interface ChatMessageProps {
  avatar: string;
  message: string;
  isCurrentUser?: boolean;
  senderName?: string;
}

export default function ChatMessage({ 
  avatar, 
  message, 
  isCurrentUser = false,
  senderName = 'Unknown User'
}: ChatMessageProps) {
  // For current user: messages are on the right
  // For other users: messages are on the left with their name
  
  if (isCurrentUser) {
    return (
      <div className="flex items-center justify-end space-x-2 mb-2">
        <div className="bg-purple-100 rounded-lg px-3 py-1.5 max-w-[80%]">
          <p className="text-sm text-gray-800">{message}</p>
        </div>
        <img
          src={avatar}
          alt="Your avatar"
          className="w-7 h-7 rounded-full border border-gray-200 shadow-sm"
        />
      </div>
    );
  }
  
  // Other users' messages (left-aligned with name)
  return (
    <div className="flex flex-col items-start mb-2">
      <span className="text-[10px] text-gray-400 ml-9 mb-0.5">{senderName}</span>
      <div className="flex items-center space-x-2">
        <img
          src={avatar}
          alt={`${senderName}'s avatar`}
          className="w-7 h-7 rounded-full border border-gray-200 shadow-sm"
        />
        <div className="bg-gray-100 rounded-lg px-3 py-1.5 max-w-[80%]">
          <p className="text-sm text-gray-800">{message}</p>
        </div>
      </div>
    </div>
  );
}