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
  saveCanvasToDatabase: (imageData: string) => Promise<boolean>;
  isSaving: boolean;
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
  const [isSaving, setIsSaving] = useState(false);

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

  // Save canvas to database - now directly to files table
  const saveCanvasToDatabase = async (imageData: string): Promise<boolean> => {
    if (!fileId || !projectId || !userId || !isConnected) {
      logger.error('Cannot save: Missing required data or not connected');
      return false;
    }
    
    setIsSaving(true);
    try {
      logger.info('=== SAVE CANVAS START ===');
      logger.info(`Saving canvas to files table for fileId: ${fileId}`);
      
      const timestamp = Date.now();
      
      // First, get the current file data to verify it exists
      const { data: fileData, error: fetchError } = await supabase
        .from('files')
        .select('id, name')
        .eq('id', fileId)
        .single();
        
      if (fetchError) {
        logger.error('Error fetching file data before update:', fetchError);
        return false;
      }
      
      if (!fileData) {
        logger.error(`File with ID ${fileId} not found!`);
        return false;
      }
      
      logger.info(`Found file: ${fileData.name} (${fileData.id})`);
      
      // Check if we can log the image data size
      const dataSize = imageData ? Math.round(imageData.length / 1024) : 'unknown';
      logger.info(`Image data size: ~${dataSize}KB`);
      
      // Create the content object with a unique trace ID
      const traceId = `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const contentObject = {
        type: 'canvas',
        imageData: imageData,
        timestamp: timestamp,
        lastModifiedBy: userId,
        traceId: traceId // Add a unique trace ID to track this specific update
      };
      
      logger.info(`Generated trace ID for tracking: ${traceId}`);
      
      logger.info('Update parameters:', { 
        fileId, 
        contentType: contentObject.type,
        timestamp,
        hasImageData: !!contentObject.imageData
      });
      
      // Try a very simple update first with minimal data
      try {
        logger.info('Trying simple test update with minimal data...');
        
        // Simple test object
        const testObject = {
          test: 'test-value',
          timestamp: timestamp
        };
        
        const { data: testData, error: testError } = await supabase
          .from('files')
          .update({
            content: testObject
          })
          .eq('id', fileId)
          .select();
          
        if (!testError) {
          logger.info('Simple test update succeeded!', testData);
          
          // Verify the test update
          setTimeout(async () => {
            const { data: verifyTestData } = await supabase
              .from('files')
              .select('content')
              .eq('id', fileId)
              .single();
              
            logger.info('Test verification result:', verifyTestData?.content);
          }, 500);
        } else {
          logger.error('Simple test update failed:', testError);
        }
      } catch (error) {
        logger.error('Error in simple test update:', error);
      }
      
      // Continue with the real update attempts
      // Approach 1: Standard ORM update
      try {
        logger.info('Trying standard ORM update approach...');
        const { data: updateData, error: updateError } = await supabase
          .from('files')
          .update({
            content: contentObject,
            last_modified: new Date().toISOString()
          })
          .eq('id', fileId)
          .select();
          
        if (!updateError) {
          logger.info('Standard update successful!');
          logger.info('Update result:', updateData);
          
          // Immediately verify the update actually took effect
          logger.info('Verifying update...');
          setTimeout(async () => {
            const { data: verifyData, error: verifyError } = await supabase
              .from('files')
              .select('content')
              .eq('id', fileId)
              .single();
              
            if (verifyError) {
              logger.error('Error verifying update:', verifyError);
            } else if (!verifyData || !verifyData.content) {
              logger.error('Verification failed: No content found after update!');
            } else {
              logger.info('Verification succeeded: Content is in database', verifyData.content);
            }
          }, 500); // Wait 500ms to ensure DB has processed the update
          
          logger.info('=== SAVE CANVAS COMPLETE ===');
          return true;
        }
        
        logger.warn('Standard update failed:', updateError);
        
        // If last_modified column doesn't exist, try without it
        if (updateError.message?.includes('column "last_modified" does not exist')) {
          logger.info('Trying without last_modified column...');
          
          const { data: retryData, error: retryError } = await supabase
            .from('files')
            .update({
              content: contentObject
            })
            .eq('id', fileId)
            .select();
            
          if (!retryError) {
            logger.info('Update without last_modified successful!');
            logger.info('Update result:', retryData);
            logger.info('=== SAVE CANVAS COMPLETE ===');
            return true;
          }
          
          logger.warn('Update without last_modified failed:', retryError);
        }
      } catch (error) {
        logger.error('Error in standard update approach:', error);
      }
      
      // Approach 2: Raw SQL update
      try {
        logger.info('Trying raw SQL update approach...');
        
        // Create a stringified version of the content object
        const contentJson = JSON.stringify(contentObject);
        
        // Execute raw SQL query directly
        const { data: sqlData, error: sqlError } = await supabase.rpc(
          'update_file_content',
          { file_id: fileId, content_json: contentJson }
        );
        
        if (sqlError) {
          logger.error('Error in raw SQL update:', sqlError);
          
          // Try creating the function if it doesn't exist
          logger.info('Trying to create the update_file_content function...');
          
          const createFunctionSQL = `
            CREATE OR REPLACE FUNCTION update_file_content(file_id UUID, content_json JSONB)
            RETURNS VOID AS $$
            BEGIN
              UPDATE files 
              SET content = content_json
              WHERE id = file_id;
            END;
            $$ LANGUAGE plpgsql;
          `;
          
          await supabase.rpc('_update_file_content_create', { 
            query: createFunctionSQL 
          });
          
          // Try the RPC call again
          const { error: retryError } = await supabase.rpc(
            'update_file_content',
            { file_id: fileId, content_json: contentJson }
          );
          
          if (retryError) {
            logger.error('Error in retry raw SQL update:', retryError);
          } else {
            logger.info('Raw SQL update successful after creating function!');
            logger.info('=== SAVE CANVAS COMPLETE ===');
            return true;
          }
        } else {
          logger.info('Raw SQL update successful!');
          logger.info('=== SAVE CANVAS COMPLETE ===');
          return true;
        }
      } catch (error) {
        logger.error('Error in raw SQL approach:', error);
      }
      
      // Approach 3: Try direct REST call to bypass ORM
      try {
        logger.info('Trying direct REST API call...');
        
        const response = await fetch(`${supabase.supabaseUrl}/rest/v1/files?id=eq.${fileId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabase.supabaseKey,
            'Authorization': `Bearer ${supabase.supabaseKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            content: contentObject
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          logger.info('Direct REST update successful!');
          logger.info('Update result:', result);
          logger.info('=== SAVE CANVAS COMPLETE ===');
          return true;
        } else {
          const errorText = await response.text();
          logger.error('Error in direct REST call:', errorText);
        }
      } catch (error) {
        logger.error('Error in direct REST approach:', error);
      }
      
      logger.error('All update approaches failed');
      return false;
    } catch (error) {
      logger.error('Error in saveCanvasToDatabase:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Load drawing history - now from files table
  const loadDrawingHistory = async (fileId: string) => {
    if (!fileId || isHistoryLoading || isHistoryLoadedRef.current) return;
    
    logger.info('=== HISTORY LOADING START ===');
    logger.info(`Loading canvas content for fileId: ${fileId}`);
    
    setIsHistoryLoading(true);
    try {
      logger.info('Making Supabase request to files table...');
      
      // Fetch file content from Supabase
      const { data, error } = await supabase
        .from('files')
        .select('content, name')
        .eq('id', fileId)
        .single();
      
      if (error) {
        logger.error('Supabase error loading file content:', error);
        
        // Handle case where the content column doesn't exist yet
        if (error.message?.includes('column "content" does not exist')) {
          logger.error('The content column does not exist in the files table. Please run the database migration.');
          
          // Try loading from drawing_history as fallback
          logger.info('Attempting to load from drawing_history as fallback...');
          return await loadFromDrawingHistory(fileId);
        }
        
        throw error;
      }
      
      if (!data || !data.content) {
        logger.info('No content found in files table for file: ' + (data?.name || fileId));
        
        // Try loading from drawing_history as fallback
        logger.info('Attempting to load from drawing_history as fallback...');
        return await loadFromDrawingHistory(fileId);
      }
      
      const content = data.content;
      logger.info('Content loaded from files table:', content.type);
      
      // Process the content based on its type
      if (content.type === 'canvas' && content.imageData) {
        logger.info('Loading canvas snapshot from files table');
        
        // Create a new image to load the snapshot
        const img = new Image();
        img.onload = () => {
          logger.info('Image loaded, applying to canvas');
          
          // We'll use a special message to tell the Canvas component to draw the whole image
          if (onRemoteDrawRef.current) {
            onRemoteDrawRef.current({
              type: 'canvas_snapshot',
              imageData: content.imageData,
              timestamp: content.timestamp
            });
          } else {
            logger.error('Cannot draw: onRemoteDrawRef.current is undefined');
          }
          
          isHistoryLoadedRef.current = true;
          setIsHistoryLoading(false);
          logger.info('=== HISTORY LOADING COMPLETE ===');
        };
        
        img.onerror = (error) => {
          logger.error('Error loading image:', error);
          setIsHistoryLoading(false);
        };
        
        // Start loading the image
        img.src = content.imageData;
        return; // Exit early, onload will finish the process
      } else {
        logger.error('Unsupported content type or missing image data');
        setIsHistoryLoading(false);
      }
    } catch (error) {
      logger.error('Error in loadDrawingHistory:', error);
      logger.error('Full error details:', error);
      setIsHistoryLoading(false);
    }
  };
  
  // Fallback function to load from drawing_history table
  const loadFromDrawingHistory = async (fileId: string) => {
    try {
      logger.info('Fallback: Loading from drawing_history table...');
      
      // Fetch drawing history from Supabase ordered by timestamp
      const { data, error } = await supabase
        .from('drawing_history')
        .select('*')
        .eq('file_id', fileId)
        .order('timestamp', { ascending: true });
      
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
      
      logger.info(`Loaded ${data.length} drawing history entries.`);
      
      // Process the data
      try {
        for (const entry of data) {
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
            
            logger.info(`Processing entry of type: ${drawingData.type}`);
            
            // Handle the canvas_snapshot type
            if (drawingData.type === 'canvas_snapshot') {
              logger.info('Loading canvas snapshot from drawing_history');
              
              // Check if we have the callback and the image data
              if (drawingData.imageData && onRemoteDrawRef.current) {
                // Create a new image to load the snapshot
                const img = new Image();
                img.onload = () => {
                  logger.info('Image loaded, applying to canvas');
                  
                  // We'll use a special message to tell the Canvas component to draw the whole image
                  onRemoteDrawRef.current({
                    type: 'canvas_snapshot',
                    imageData: drawingData.imageData,
                    timestamp: drawingData.timestamp
                  });
                  
                  isHistoryLoadedRef.current = true;
                  setIsHistoryLoading(false);
                  logger.info('=== HISTORY LOADING COMPLETE ===');
                };
                
                img.onerror = (error) => {
                  logger.error('Error loading image:', error);
                  setIsHistoryLoading(false);
                };
                
                // Start loading the image
                img.src = drawingData.imageData;
                return; // Exit early, onload will finish the process
              } else {
                logger.error('Missing image data or remote draw handler');
              }
            } else {
              // Handle all other drawing data types as before
              if (drawingData.type === 'clear') {
                logger.info('Applying clear canvas operation');
                if (onRemoteClearRef.current) {
                  onRemoteClearRef.current();
                } else {
                  logger.error('Cannot clear canvas: onRemoteClearRef.current is undefined');
                }
              } else {
                logger.info(`Applying drawing operation of type: ${drawingData.type}`);
                if (onRemoteDrawRef.current) {
                  onRemoteDrawRef.current(drawingData);
                } else {
                  logger.error('Cannot draw: onRemoteDrawRef.current is undefined');
                }
              }
            }
          } else {
            logger.warn('Entry has no drawing_data:', entry);
          }
        }
      } catch (processingError) {
        logger.error('Error processing history entries:', processingError);
      }
      
      isHistoryLoadedRef.current = true;
      setIsHistoryLoading(false);
      logger.info('=== HISTORY LOADING COMPLETE (from drawing_history) ===');
    } catch (error) {
      logger.error('Error in loadFromDrawingHistory:', error);
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
      isHistoryLoading,
      saveCanvasToDatabase,
      isSaving
    }}>
      {children}
    </CanvasContext.Provider>
  );
}; 