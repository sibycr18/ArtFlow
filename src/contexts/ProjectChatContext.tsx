import React, { createContext, useContext, useState } from 'react';

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
  };
  timestamp: Date;
}

interface ProjectChatContextType {
  messages: Message[];
  isOpen: boolean;
  toggleChat: () => void;
  sendMessage: (content: string) => void;
}

const ProjectChatContext = createContext<ProjectChatContextType | undefined>(undefined);

export function ProjectChatProvider({ children, projectId }: { children: React.ReactNode; projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => setIsOpen(prev => !prev);

  const sendMessage = (content: string) => {
    // In a real app, this would integrate with your backend
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: {
        id: '1', // This would come from auth context
        name: 'John Doe',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=faces'
      },
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <ProjectChatContext.Provider value={{ messages, isOpen, toggleChat, sendMessage }}>
      {children}
    </ProjectChatContext.Provider>
  );
}

export function useProjectChat() {
  const context = useContext(ProjectChatContext);
  if (context === undefined) {
    throw new Error('useProjectChat must be used within a ProjectChatProvider');
  }
  return context;
}