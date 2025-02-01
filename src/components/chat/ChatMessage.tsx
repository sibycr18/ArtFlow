import React from 'react';

interface ChatMessageProps {
  avatar: string;
  message: string;
}

export default function ChatMessage({ avatar, message }: ChatMessageProps) {
  return (
    <div className="flex items-start space-x-2">
      <img
        src={avatar}
        alt="User avatar"
        className="w-8 h-8 rounded-full"
      />
      <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
        <p className="text-sm text-gray-800">{message}</p>
      </div>
    </div>
  );
}