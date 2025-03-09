import React from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  message: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  sending?: boolean;
}

export default function ChatInput({ message, onChange, onSend, sending = false }: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && message.trim() && !sending) {
      onSend();
    }
  };

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={message}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          placeholder={sending ? "Sending message..." : "Type a message..."}
          disabled={sending}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        <button 
          onClick={onSend}
          disabled={!message.trim() || sending}
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}