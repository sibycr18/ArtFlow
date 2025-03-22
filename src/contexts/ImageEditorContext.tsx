import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from '../config';

// Define types for image edit operations
export interface FilterOperation {
  type: 'filter';
  data: {
    userId: string;
    timestamp: number;
    filterType: string;
    filterValue: number;
    // Add any other relevant filter properties
  };
}

export interface ImageUploadOperation {
  type: 'upload';
  data: {
    userId: string;
    timestamp: number;
    imageData: string; // Base64 encoded image data
  };
}

export interface CropOperation {
  type: 'crop';
  data: {
    userId: string;
    timestamp: number;
    imageData: string; // Base64 encoded cropped image data
    width: number;
    height: number;
  };
}

export interface ImageEditOperation {
  type: 'filter' | 'rotate' | 'crop' | 'clear' | 'upload';
  data: any; // Will be specific to the operation type
}

export type WebSocketImageMessage = 
  | { type: 'image_operation'; data: ImageEditOperation }
  | { type: 'init'; data: { user_id: string, project_id: string, file_id: string } }
  | { type: 'connected' };

// Constants
const RECONNECT_INTERVAL = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

// Custom logger
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[ImageEditor] 🟦 ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    console.log(`[ImageEditor] 🟨 ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[ImageEditor] 🟧 ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ImageEditor] 🟥 ${message}`, ...args);
  }
};

interface ImageEditorContextType {
  isConnected: boolean;
  connectionError: string | null;
  sendFilterOperation: (filterType: string, filterValue: number) => void;
  sendImageUpload: (imageData: string) => void;
  sendCropOperation: (imageData: string, width: number, height: number) => void;
  onRemoteImageOperation?: (operation: ImageEditOperation) => void;
  setOnRemoteImageOperation: (callback: (operation: ImageEditOperation) => void) => void;
  connect: () => void;
}

const ImageEditorContext = createContext<ImageEditorContextType | null>(null);

export const useImageEditor = () => {
  const context = useContext(ImageEditorContext);
  if (!context) {
    throw new Error('useImageEditor must be used within an ImageEditorProvider');
  }
  return context;
};

interface ImageEditorProviderProps {
  children: React.ReactNode;
  projectId: string;
  fileId: string;
  userId: string;
}

export const ImageEditorProvider: React.FC<ImageEditorProviderProps> = ({
  children,
  projectId,
  fileId,
  userId
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const onRemoteImageOperationRef = useRef<((operation: ImageEditOperation) => void) | undefined>();
  const isCleaningUpRef = useRef(false);

  const setOnRemoteImageOperation = useCallback((callback: (operation: ImageEditOperation) => void) => {
    onRemoteImageOperationRef.current = callback;
  }, []);

  const cleanup = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    logger.debug('Cleaning up WebSocket connection...');
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    isCleaningUpRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      logger.debug('WebSocket is already connected or connecting, skipping connection attempt');
      return;
    }

    cleanup();

    try {
      logger.info(`Connecting to WebSocket... Project: ${projectId}, File: ${fileId}, User: ${userId}`);
      const wsUrl = `${WS_URL}/ws/image/${projectId}/${fileId}/${userId}`;
      logger.debug(`WebSocket URL: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        logger.info('WebSocket connected successfully');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;

        // Send initialization message
        ws.send(JSON.stringify({
          type: 'init',
          data: {
            user_id: userId,
            project_id: projectId,
            file_id: fileId
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          logger.debug('Received message:', message);

          switch (message.type) {
            case 'connected':
              logger.info('Connection confirmed by server');
              break;
            case 'image_operation':
              logger.debug('Received image operation:', message.data);
              if (onRemoteImageOperationRef.current) {
                onRemoteImageOperationRef.current(message.data);
              }
              break;
            default:
              logger.warn('Unknown message type:', message.type);
          }
        } catch (error) {
          logger.error('Error processing message:', error);
        }
      };

      ws.onclose = (event) => {
        logger.info(`WebSocket disconnected with code ${event.code}`);
        setIsConnected(false);
        
        if (!isCleaningUpRef.current && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          logger.info(`Attempting to reconnect (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})...`);
          reconnectTimeoutRef.current = window.setTimeout(connect, RECONNECT_INTERVAL);
        } else if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionError('Maximum reconnection attempts reached. Please refresh the page.');
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
      };

    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to connect');
    }
  }, [projectId, fileId, userId]);

  useEffect(() => {
    if (projectId && fileId && userId) {
      connect();
    }
    return cleanup;
  }, [projectId, fileId, userId]);

  const sendFilterOperation = useCallback((filterType: string, filterValue: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      logger.info(`Sending filter operation: ${filterType} with value: ${filterValue}`);
      wsRef.current.send(JSON.stringify({
        type: 'image_operation',
        data: {
          type: 'filter',
          data: {
            userId,
            filterType,
            filterValue,
            timestamp: Date.now()
          }
        }
      }));
    } else {
      logger.warn('WebSocket is not connected. Filter operation not sent.');
    }
  }, [userId]);

  const sendImageUpload = useCallback((imageData: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      logger.info(`Sending image upload operation. Data length: ${imageData.length} characters`);
      wsRef.current.send(JSON.stringify({
        type: 'image_operation',
        data: {
          type: 'upload',
          data: {
            userId,
            imageData,
            timestamp: Date.now()
          }
        }
      }));
    } else {
      logger.warn('WebSocket is not connected. Image upload not sent.');
    }
  }, [userId]);

  const sendCropOperation = useCallback((imageData: string, width: number, height: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      logger.info(`Sending crop operation. Cropped image dimensions: ${width}x${height}`);
      wsRef.current.send(JSON.stringify({
        type: 'image_operation',
        data: {
          type: 'crop',
          data: {
            userId,
            imageData,
            width,
            height,
            timestamp: Date.now()
          }
        }
      }));
    } else {
      logger.warn('WebSocket is not connected. Crop operation not sent.');
    }
  }, [userId]);

  return (
    <ImageEditorContext.Provider value={{
      isConnected,
      connectionError,
      sendFilterOperation,
      sendImageUpload,
      sendCropOperation,
      onRemoteImageOperation: onRemoteImageOperationRef.current,
      setOnRemoteImageOperation,
      connect
    }}>
      {children}
    </ImageEditorContext.Provider>
  );
}; 