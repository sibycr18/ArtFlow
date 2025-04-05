import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { DrawingData, WebSocketMessage } from '../types/canvas';
import throttle from 'lodash/throttle';
import { WS_URL } from '../config';
import supabase from '../utils/supabaseClient';

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
  loadDrawingHistory: (fileId: string) => Promise<void>;
  isHistoryLoading: boolean;
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
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const onRemoteDrawRef = useRef<((data: DrawingData) => void) | undefined>();
  const onRemoteClearRef = useRef<(() => void) | undefined>();
  const isCleaningUpRef = useRef(false);
  const isHistoryLoadedRef = useRef(false);

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

  const loadDrawingHistory = async (fileId: string) => {
    if (!fileId || isHistoryLoading || isHistoryLoadedRef.current) return;
    
    logger.info('=== HISTORY LOADING START ===');
    logger.info(`Loading drawing history for fileId: ${fileId}, historyLoading: ${isHistoryLoading}, historyLoaded: ${isHistoryLoadedRef.current}`);
    
    setIsHistoryLoading(true);
    try {
      logger.info('Making Supabase request for drawing history...');
      
      // Fetch drawing history from Supabase
      const { data, error } = await supabase
        .from('drawing_history')
        .select('*')
        .eq('file_id', fileId)
        .order('sequence_number', { ascending: true });
      
      if (error) {
        logger.error('Supabase error loading drawing history:', error);
        throw error;
      }
      
      logger.info(`Supabase returned ${data?.length || 0} history entries`);
      
      if (!data || data.length === 0) {
        logger.info('No drawing history found for file');
        setIsHistoryLoading(false);
        isHistoryLoadedRef.current = true;
        return;
      }
      
      logger.info(`Loaded ${data.length} drawing history entries. Starting to apply them...`);
      logger.info(`First entry: ${JSON.stringify(data[0])}`);
      logger.info(`onRemoteDrawRef exists: ${!!onRemoteDrawRef.current}`);
      logger.info(`onRemoteClearRef exists: ${!!onRemoteClearRef.current}`);
      
      // Process each drawing operation in sequence with a small delay
      // to ensure proper rendering, especially for complex drawings
      const applyDrawingOperations = async () => {
        logger.info('Starting sequential application of drawing operations');
        let appliedCount = 0;
        
        for (const entry of data) {
          try {
            // Handle the case where drawing_data might be stored as a JSON string
            let drawingData;
            if (entry.drawing_data) {
              if (typeof entry.drawing_data === 'string') {
                logger.info('Drawing data is stored as string, parsing JSON');
                try {
                  drawingData = JSON.parse(entry.drawing_data);
                } catch (parseError) {
                  logger.error('Failed to parse drawing_data JSON string:', parseError);
                  continue;
                }
              } else {
                drawingData = entry.drawing_data;
              }
              
              logger.info(`Processing entry ${appliedCount + 1}/${data.length}, type: ${drawingData.type}`);
              logger.info('Drawing data details:', JSON.stringify(drawingData));
              
              // Handle clear canvas operation
              if (drawingData.type === 'clear') {
                logger.info('Applying clear canvas operation');
                if (onRemoteClearRef.current) {
                  onRemoteClearRef.current();
                } else {
                  logger.error('Cannot clear canvas: onRemoteClearRef.current is undefined');
                }
                // Add small delay after clear operation
                await new Promise(resolve => setTimeout(resolve, 10));
              } else {
                // Handle drawing operations
                logger.info(`Applying drawing operation of type: ${drawingData.type}`);
                if (onRemoteDrawRef.current) {
                  onRemoteDrawRef.current(drawingData);
                } else {
                  logger.error('Cannot draw: onRemoteDrawRef.current is undefined');
                }
                
                // For brush strokes, add a tiny delay to ensure proper stroke rendering
                if (drawingData.type === 'brush' || drawingData.type === 'eraser') {
                  // Smaller delay for continuous strokes
                  await new Promise(resolve => setTimeout(resolve, 5));
                } else {
                  // Slightly longer delay for shapes
                  await new Promise(resolve => setTimeout(resolve, 10));
                }
              }
              appliedCount++;
            } else {
              logger.warn('Entry has no drawing_data:', entry);
            }
          } catch (operationError) {
            logger.error('Error processing drawing operation:', operationError);
            logger.error('Problematic entry:', entry);
          }
        }
        
        logger.info(`Applied ${appliedCount}/${data.length} drawing operations`);
        isHistoryLoadedRef.current = true;
        setIsHistoryLoading(false);
        logger.info('=== HISTORY LOADING COMPLETE ===');
      };
      
      // Start the sequential application process
      applyDrawingOperations();
      
    } catch (error) {
      logger.error('Error in loadDrawingHistory:', error);
      logger.error('Full error details:', error);
      setIsHistoryLoading(false);
    }
  };

  return (
    <CanvasContext.Provider value={{
      isConnected,
      connectionError,
      sendDrawData,
      sendClearCanvas,
      setOnRemoteDraw,
      setOnRemoteClear,
      connect,
      loadDrawingHistory,
      isHistoryLoading
    }}>
      {children}
    </CanvasContext.Provider>
  );
}; 