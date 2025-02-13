import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface CanvasContextType {
  isConnected: boolean;
  sendDrawData: (data: any) => void;
  sendCursorMove: (x: number, y: number) => void;
  sendClearCanvas: () => void;
  otherUsers: { [key: string]: { x: number; y: number } };
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
};

interface CanvasProviderProps {
  children: React.ReactNode;
  projectId: string;
  fileId: string;
  userId: string;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({
  children,
  projectId,
  fileId,
  userId
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [otherUsers, setOtherUsers] = useState<{ [key: string]: { x: number; y: number } }>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const ws = new WebSocket(`ws://localhost:8000/ws/${projectId}/${fileId}/${userId}`);

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'draw':
          // Handle incoming draw data
          const drawEvent = new CustomEvent('remote-draw', { detail: data.data });
          window.dispatchEvent(drawEvent);
          break;
          
        case 'clear':
          // Handle canvas clear
          const clearEvent = new CustomEvent('remote-clear');
          window.dispatchEvent(clearEvent);
          break;
          
        case 'cursor_move':
          // Update other user's cursor position
          if (data.user_id !== userId) {
            setOtherUsers(prev => ({
              ...prev,
              [data.user_id]: {
                x: data.data.x,
                y: data.data.y
              }
            }));
          }
          break;
          
        case 'disconnect':
          // Remove disconnected user's cursor
          if (data.user_id !== userId) {
            setOtherUsers(prev => {
              const newUsers = { ...prev };
              delete newUsers[data.user_id];
              return newUsers;
            });
          }
          break;
      }
    };

    wsRef.current = ws;

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [projectId, fileId, userId]);

  const sendDrawData = (data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        file_type: 'canvas',
        update_type: 'draw',
        data
      }));
    }
  };

  const sendCursorMove = (x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        file_type: 'canvas',
        update_type: 'cursor_move',
        data: { x, y }
      }));
    }
  };

  const sendClearCanvas = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        file_type: 'canvas',
        update_type: 'clear',
        data: {}
      }));
    }
  };

  return (
    <CanvasContext.Provider
      value={{
        isConnected,
        sendDrawData,
        sendCursorMove,
        sendClearCanvas,
        otherUsers
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}; 