import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from '../config';
import supabase from '../utils/supabaseClient';

// Define types for image edit operations
export interface FilterOperation {
  type: 'filter';
  data: {
    userId: string;
    timestamp: number;
    filterType: string;
    filterValue: number;
    allFilterValues?: Record<string, number>; // Add all filter values
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
  sendFilterOperation: (filterType: string, filterValue: number, allFilterValues?: Record<string, number>) => void;
  sendImageUpload: (imageData: string) => void;
  sendCropOperation: (imageData: string, width: number, height: number) => void;
  onRemoteImageOperation?: (operation: ImageEditOperation) => void;
  setOnRemoteImageOperation: (callback: (operation: ImageEditOperation) => void) => void;
  connect: () => void;
  saveImageToDatabase: (imageData: string, width: number, height: number, filterValues?: Record<string, number>) => Promise<boolean>;
  loadImageFromDatabase: (fileId: string) => Promise<{imageData: string, width: number, height: number, filterValues?: Record<string, number>} | null>;
  isSaving: boolean;
  isLoading: boolean;
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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const onRemoteImageOperationRef = useRef<((operation: ImageEditOperation) => void) | undefined>();
  const isCleaningUpRef = useRef(false);
  const isContentLoadedRef = useRef(false);

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

  const sendFilterOperation = useCallback((filterType: string, filterValue: number, allFilterValues?: Record<string, number>) => {
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
            allFilterValues,
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

  // Save image to database
  const saveImageToDatabase = async (
    imageData: string,
    width: number,
    height: number,
    filterValues?: Record<string, number>
  ): Promise<boolean> => {
    if (!fileId || !projectId || !userId || !isConnected) {
      logger.error('Cannot save: Missing required data or not connected');
      return false;
    }
    
    setIsSaving(true);
    try {
      logger.info('=== SAVE IMAGE START ===');
      logger.info(`Saving image to files table for fileId: ${fileId}`);
      
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
      
      // Check image data size for logging
      const dataSize = imageData ? Math.round(imageData.length / 1024) : 'unknown';
      logger.info(`Image data size: ~${dataSize}KB, dimensions: ${width}x${height}`);
      
      // Create the content object with a unique trace ID
      const traceId = `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const contentObject = {
        type: 'image',
        imageData: imageData,
        width: width,
        height: height,
        filterValues: filterValues || {},
        timestamp: timestamp,
        lastModifiedBy: userId,
        traceId: traceId
      };
      
      logger.info(`Generated trace ID for tracking: ${traceId}`);
      
      // Standard ORM update
      try {
        logger.info('Saving image content...');
        const { data: updateData, error: updateError } = await supabase
          .from('files')
          .update({
            content: contentObject,
            last_modified: new Date().toISOString()
          })
          .eq('id', fileId)
          .select();
          
        if (!updateError) {
          logger.info('Image save successful!');
          logger.info('Update result:', updateData);
          
          // Verify the update
          setTimeout(async () => {
            const { data: verifyData, error: verifyError } = await supabase
              .from('files')
              .select('content')
              .eq('id', fileId)
              .single();
              
            if (verifyError) {
              logger.error('Error verifying image update:', verifyError);
            } else if (!verifyData || !verifyData.content) {
              logger.error('Verification failed: No content found after update!');
            } else {
              logger.info('Verification succeeded: Image content is in database');
            }
          }, 500);
          
          // Reset content loaded flag to allow reloading after save
          isContentLoadedRef.current = false;
          
          logger.info('=== SAVE IMAGE COMPLETE ===');
          return true;
        }
        
        logger.warn('Standard update failed:', updateError);
        
        // Try without last_modified if that column doesn't exist
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
            
            // Reset content loaded flag to allow reloading after save
            isContentLoadedRef.current = false;
            
            logger.info('=== SAVE IMAGE COMPLETE ===');
            return true;
          }
          
          logger.warn('Update without last_modified failed:', retryError);
        }
        
        // If we get here, standard approach failed
        logger.error('Failed to save image content');
        return false;
      } catch (error) {
        logger.error('Error saving image to database:', error);
        return false;
      }
    } catch (error) {
      logger.error('Error in saveImageToDatabase:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Load image from database
  const loadImageFromDatabase = async (fileId: string): Promise<{
    imageData: string,
    width: number,
    height: number,
    filterValues?: Record<string, number>
  } | null> => {
    if (!fileId || isLoading || isContentLoadedRef.current) return null;
    
    setIsLoading(true);
    try {
      logger.info('=== IMAGE LOADING START ===');
      logger.info(`Loading image content for fileId: ${fileId}`);
      
      // Fetch file content from database
      const { data, error } = await supabase
        .from('files')
        .select('content, name')
        .eq('id', fileId)
        .single();
      
      if (error) {
        logger.error('Error loading image content:', error);
        return null;
      }
      
      if (!data || !data.content) {
        logger.info(`No content found for file: ${fileId}`);
        setIsLoading(false);
        isContentLoadedRef.current = true;
        return null;
      }
      
      logger.info(`Found image content for file: ${data.name}`);
      
      // Check if it's an image type content
      if (data.content.type === 'image' && data.content.imageData) {
        logger.info('Successfully loaded image content');
        isContentLoadedRef.current = true;
        
        return {
          imageData: data.content.imageData,
          width: data.content.width || 800,
          height: data.content.height || 600,
          filterValues: data.content.filterValues || {}
        };
      } else {
        logger.warn('Content exists but is not image type or has no image data');
        return null;
      }
    } catch (error) {
      logger.error('Error in loadImageFromDatabase:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ImageEditorContext.Provider value={{
      isConnected,
      connectionError,
      sendFilterOperation,
      sendImageUpload,
      sendCropOperation,
      onRemoteImageOperation: onRemoteImageOperationRef.current,
      setOnRemoteImageOperation,
      connect,
      saveImageToDatabase,
      loadImageFromDatabase,
      isSaving,
      isLoading
    }}>
      {children}
    </ImageEditorContext.Provider>
  );
}; 