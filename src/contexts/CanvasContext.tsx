import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { DrawingData, WebSocketMessage } from '../types/canvas';
import throttle from 'lodash/throttle';
import { WS_URL } from '../config';

// Custom logger
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[Canvas] 🟦 ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    console.log(`[Canvas] 🟨 ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[Canvas] 🟧 ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[Canvas] 🟥 ${message}`, ...args);
  }
};

// Constants
const RECONNECT_INTERVAL = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const THROTTLE_INTERVAL = 16; // ~60fps
const THROTTLE_LEADING = true; // Send the first event immediately
const THROTTLE_TRAILING = true; // Send the last event
const FLUSH_INTERVAL = 500; // Flush throttled events every 500ms

interface CanvasContextType {
  isConnected: boolean;
  connectionError: string | null;
  sendDrawData: (data: DrawingData) => void;
  sendClearCanvas: () => void;
  onRemoteDraw?: (data: DrawingData) => void;
  onRemoteClear?: () => void;
  setOnRemoteDraw: (callback: (data: DrawingData) => void) => void;
  setOnRemoteClear: (callback: () => void) => void;
  connect: () => void;
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const onRemoteDrawRef = useRef<((data: DrawingData) => void) | undefined>();
  const onRemoteClearRef = useRef<(() => void) | undefined>();
  const isCleaningUpRef = useRef(false);

  const setOnRemoteDraw = useCallback((callback: (data: DrawingData) => void) => {
    onRemoteDrawRef.current = callback;
  }, []);

  const setOnRemoteClear = useCallback((callback: () => void) => {
    onRemoteClearRef.current = callback;
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
      const wsUrl = `${WS_URL}/ws/${projectId}/${fileId}/${userId}`;
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
          const wsUrl = `${WS_URL}/ws/${projectId}/${fileId}/${userId}`;
          logger.info(`Received message from WebSocket URL: ${wsUrl}`);
          logger.debug('Received raw message type:', message.type);
          logger.debug('Full message data:', message);

          // Simplified message handling - only handle draw and clear commands
          switch (message.type) {
            case 'connected':
              logger.info('Connection confirmed by server');
              break;
            case 'draw':
              logger.debug('Received draw data:', message);
              if (onRemoteDrawRef.current) {
                onRemoteDrawRef.current(message.data);
              }
              break;
            case 'draw_batch':
              // Ignore batched messages
              logger.warn('Ignoring batched drawing data as batching is disabled');
              break;
            case 'clear':
              logger.info('Received clear command');
              if (onRemoteClearRef.current) {
                onRemoteClearRef.current();
              }
              break;
            default:
              // Skip any other message types (history_sync, etc.)
              logger.warn('Skipping message type:', message.type);
          }
        } catch (error) {
          logger.error('Error processing message:', error);
        }
      };

      ws.onclose = (event) => {
        const wsUrl = `${WS_URL}/ws/${projectId}/${fileId}/${userId}`;
        logger.info(`WebSocket disconnected with code ${event.code} from URL: ${wsUrl}`);
        logger.info(`WebSocket close reason: ${event.reason || 'No reason provided'}`);
        setIsConnected(false);
        
        // Don't attempt to reconnect if we're cleaning up
        if (!isCleaningUpRef.current && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          logger.info(`Attempting to reconnect (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})...`);
          reconnectTimeoutRef.current = window.setTimeout(connect, RECONNECT_INTERVAL);
        } else if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionError('Maximum reconnection attempts reached. Please refresh the page.');
        }
      };

      ws.onerror = (error) => {
        const wsUrl = `${WS_URL}/ws/${projectId}/${fileId}/${userId}`;
        logger.error(`WebSocket error on URL: ${wsUrl}`, error);
        setConnectionError('Connection error occurred');
      };

    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to connect');
    }
  }, [projectId, fileId, userId]);

  useEffect(() => {
    // Only connect if we have valid parameters
    if (projectId && fileId && userId) {
      connect();
    }
    return cleanup;
  }, [projectId, fileId, userId]); // Remove connect and cleanup from dependencies

  // Create a throttled version of sendMessage
  const throttledSendMessage = useCallback(
    throttle((message: WebSocketMessage) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const wsUrl = `${WS_URL}/ws/${projectId}/${fileId}/${userId}`;
        logger.info(`Sending message to WebSocket URL: ${wsUrl}`);
        wsRef.current.send(JSON.stringify(message));
      } else {
        logger.warn('WebSocket is not connected. Message not sent:', message);
      }
    }, THROTTLE_INTERVAL, { leading: THROTTLE_LEADING, trailing: THROTTLE_TRAILING }),
    [projectId, fileId, userId]
  );

  const sendDrawData = useCallback((data: DrawingData) => {
    // Simplified - all drawing data sent immediately without throttling
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const wsUrl = `${WS_URL}/ws/${projectId}/${fileId}/${userId}`;
      logger.info(`Sending drawing data to WebSocket URL: ${wsUrl}`);
      wsRef.current.send(JSON.stringify({
        type: 'draw',
        data: {
          ...data,
          timestamp: Date.now()
        }
      }));
    } else {
      logger.warn('WebSocket is not connected. Drawing data not sent.');
    }
  }, [projectId, fileId, userId]);

  const sendClearCanvas = useCallback(() => {
    // Use direct send instead of throttle for clear canvas
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const wsUrl = `${WS_URL}/ws/${projectId}/${fileId}/${userId}`;
      logger.info(`Sending clear command to WebSocket URL: ${wsUrl}`);
      wsRef.current.send(JSON.stringify({
        type: 'clear'
      }));
    } else {
      logger.warn('WebSocket is not connected. Clear command not sent.');
    }
  }, [projectId, fileId, userId]);

  return (
    <CanvasContext.Provider value={{
      isConnected,
      connectionError,
      sendDrawData,
      sendClearCanvas,
      setOnRemoteDraw,
      setOnRemoteClear,
      connect
    }}>
      {children}
    </CanvasContext.Provider>
  );
}; 