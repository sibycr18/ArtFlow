import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from '../config';
import supabase from '../utils/supabaseClient';

// Define types for document operations
export interface TextOperation {
  type: 'insert' | 'delete' | 'format' | 'clear';
  data: {
    userId: string;
    timestamp: number;
    position?: number;
    length?: number; 
    text?: string;
    formatType?: 'bold' | 'italic' | 'underline' | 'align' | 'fontSize';
    formatValue?: string | number | boolean;
    styles?: {
      isBold: boolean;
      isItalic: boolean;
      isUnderline: boolean;
      fontSize: string;
      textAlign: string;
    };
    isHtml?: boolean;
  };
}

export type WebSocketDocMessage = 
  | { type: 'text_operation'; data: TextOperation }
  | { type: 'init'; data: { user_id: string, project_id: string, file_id: string } }
  | { type: 'cursor_update'; data: { userId: string, position: number } }
  | { type: 'connected' };

// Constants
const RECONNECT_INTERVAL = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

// Custom logger
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[Document] 🟦 ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    console.log(`[Document] 🟨 ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[Document] 🟧 ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[Document] 🟥 ${message}`, ...args);
  }
};

interface DocumentContextType {
  isConnected: boolean;
  connectionError: string | null;
  sendTextOperation: (operation: TextOperation) => void;
  sendCursorUpdate: (position: number) => void;
  onRemoteTextOperation?: (operation: TextOperation) => void;
  setOnRemoteTextOperation: (callback: (operation: TextOperation) => void) => void;
  onRemoteCursorUpdate?: (userId: string, position: number) => void;
  setOnRemoteCursorUpdate: (callback: (userId: string, position: number) => void) => void;
  connect: () => void;
  saveDocumentToDatabase: (content: string) => Promise<boolean>;
  loadDocumentContent: (fileId: string) => Promise<string | null>;
  isSaving: boolean;
  isLoading: boolean;
}

const DocumentContext = createContext<DocumentContextType | null>(null);

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
};

interface DocumentProviderProps {
  children: React.ReactNode;
  projectId: string;
  fileId: string;
  userId: string;
}

export const DocumentProvider: React.FC<DocumentProviderProps> = ({
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
  const onRemoteTextOperationRef = useRef<((operation: TextOperation) => void) | undefined>();
  const onRemoteCursorUpdateRef = useRef<((userId: string, position: number) => void) | undefined>();
  const isCleaningUpRef = useRef(false);
  const isContentLoadedRef = useRef(false);

  const setOnRemoteTextOperation = useCallback((callback: (operation: TextOperation) => void) => {
    onRemoteTextOperationRef.current = callback;
  }, []);

  const setOnRemoteCursorUpdate = useCallback((callback: (userId: string, position: number) => void) => {
    onRemoteCursorUpdateRef.current = callback;
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
      const wsUrl = `${WS_URL}/ws/document/${projectId}/${fileId}/${userId}`;
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
          const message = JSON.parse(event.data) as WebSocketDocMessage;
          logger.debug('❗ WEBSOCKET RECEIVED RAW MESSAGE:', event.data);
          logger.debug('💾 WEBSOCKET PARSED MESSAGE:', JSON.stringify(message, null, 2));
          
          // Additional detailed logging for received operations
          if (message.type === 'text_operation' && message.data) {
            const operation = message.data;
            logger.debug('📥 INCOMING OPERATION DETAILS:', {
              type: operation.type,
              timestamp: new Date(operation.data.timestamp).toISOString(),
              userId: operation.data.userId,
              isSelf: operation.data.userId === userId,
              ...(operation.type === 'insert' ? {
                insertedText: operation.data.text,
                position: operation.data.position,
                textLength: operation.data.text?.length || 0,
                hasStyles: !!operation.data.styles,
                styles: operation.data.styles
              } : {}),
              ...(operation.type === 'delete' ? {
                position: operation.data.position,
                deleteLength: operation.data.length
              } : {}),
              ...(operation.type === 'format' ? {
                formatType: operation.data.formatType,
                formatValue: operation.data.formatValue,
                formatPosition: operation.data.position,
                formatLength: operation.data.length
              } : {})
            });
          }

          switch (message.type) {
            case 'connected':
              logger.info('Connection confirmed by server');
              break;
            case 'text_operation':
              logger.debug('Received text operation:', message.data);
              
              // Verify message structure and do a strict user ID check
              if (message.data && 
                 typeof message.data === 'object' && 
                 message.data.data && 
                 typeof message.data.data === 'object') {
                
                const senderUserId = message.data.data.userId;
                
                if (senderUserId === userId) {
                  logger.debug(`Ignoring own operation with user ID: ${senderUserId}`);
                  return; // Don't process our own messages
                } else {
                  logger.debug(`Processing remote operation from user: ${senderUserId}`);
                }
              } else {
                logger.warn('Malformed message structure', message);
                return; // Don't process malformed messages
              }
              
              if (onRemoteTextOperationRef.current) {
                onRemoteTextOperationRef.current(message.data);
              }
              break;
              
            case 'cursor_update':
              logger.debug('Received cursor update:', message.data);
              if (onRemoteCursorUpdateRef.current && message.data.userId !== userId) {
                onRemoteCursorUpdateRef.current(message.data.userId, message.data.position);
              }
              break;
              
            default:
              logger.warn('Unknown message type:', message);
          }
        } catch (error) {
          logger.error('Error processing message:', error);
        }
      };

      ws.onclose = (event) => {
        logger.info(`WebSocket disconnected with code ${event.code}`);
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
        logger.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
      };

    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to connect');
    }
  }, [projectId, fileId, userId, cleanup]);

  useEffect(() => {
    // Only connect if we have valid parameters
    if (projectId && fileId && userId) {
      connect();
    }
    return cleanup;
  }, [projectId, fileId, userId, connect, cleanup]);

  const sendTextOperation = useCallback((operation: TextOperation) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      logger.info(`Sending text operation: ${operation.type}`);
      // Make sure the operation contains the userId
      const operationWithUser = {
        ...operation,
        data: {
          ...operation.data,
          userId,
          timestamp: Date.now()
        }
      };
      
      // Create message to send
      const message = {
        type: 'text_operation',
        data: operationWithUser
      };
      
      // Log what actually gets sent to WebSocket with more detail
      logger.debug('WEBSOCKET SENDING FULL MESSAGE:', JSON.stringify(message, null, 2));
      logger.debug('WEBSOCKET OPERATION STATS:', {
        type: operation.type,
        timestamp: new Date(operationWithUser.data.timestamp).toISOString(),
        userId: operationWithUser.data.userId,
        messageSize: JSON.stringify(message).length,
        messageType: 'text_operation',
        hasStyles: !!operationWithUser.data.styles,
        ...(operation.type === 'insert' ? {
          insertedText: operationWithUser.data.text,
          position: operationWithUser.data.position,
          textLength: operationWithUser.data.text?.length || 0
        } : {}),
        ...(operation.type === 'delete' ? {
          position: operationWithUser.data.position,
          deleteLength: operationWithUser.data.length
        } : {}),
        ...(operation.type === 'format' ? {
          formatType: operationWithUser.data.formatType,
          formatValue: operationWithUser.data.formatValue,
          formatPosition: operationWithUser.data.position,
          formatLength: operationWithUser.data.length
        } : {})
      });
      
      wsRef.current.send(JSON.stringify(message));
    } else {
      logger.warn('WebSocket is not connected. Text operation not sent.');
    }
  }, [userId]);

  const sendCursorUpdate = useCallback((position: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      logger.info(`Sending cursor update at position: ${position}`);
      wsRef.current.send(JSON.stringify({
        type: 'cursor_update',
        data: {
          userId,
          position
        }
      }));
    } else {
      logger.warn('WebSocket is not connected. Cursor update not sent.');
    }
  }, [userId]);

  // Save document to database function
  const saveDocumentToDatabase = async (htmlContent: string): Promise<boolean> => {
    if (!fileId || !projectId || !userId || !isConnected) {
      logger.error('Cannot save: Missing required data or not connected');
      return false;
    }
    
    setIsSaving(true);
    try {
      logger.info('=== SAVE DOCUMENT START ===');
      logger.info(`Saving document to files table for fileId: ${fileId}`);
      
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
      
      // Check content size for logging
      const contentSize = htmlContent ? Math.round(htmlContent.length / 1024) : 'unknown';
      logger.info(`Document content size: ~${contentSize}KB`);
      
      // Create the content object with a unique trace ID
      const traceId = `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const contentObject = {
        type: 'document',
        htmlContent: htmlContent,
        timestamp: timestamp,
        lastModifiedBy: userId,
        traceId: traceId
      };
      
      logger.info(`Generated trace ID for tracking: ${traceId}`);
      
      // Try standard ORM update
      try {
        logger.info('Saving document content...');
        const { data: updateData, error: updateError } = await supabase
          .from('files')
          .update({
            content: contentObject,
            last_modified: new Date().toISOString()
          })
          .eq('id', fileId)
          .select();
          
        if (!updateError) {
          logger.info('Document save successful!');
          logger.info('Update result:', updateData);
          
          // Verify the update
          setTimeout(async () => {
            const { data: verifyData, error: verifyError } = await supabase
              .from('files')
              .select('content')
              .eq('id', fileId)
              .single();
              
            if (verifyError) {
              logger.error('Error verifying document update:', verifyError);
            } else if (!verifyData || !verifyData.content) {
              logger.error('Verification failed: No content found after update!');
            } else {
              logger.info('Verification succeeded: Document content is in database');
            }
          }, 500);
          
          logger.info('=== SAVE DOCUMENT COMPLETE ===');
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
            logger.info('=== SAVE DOCUMENT COMPLETE ===');
            return true;
          }
          
          logger.warn('Update without last_modified failed:', retryError);
        }
        
        // If we get here, standard approach failed
        logger.error('Failed to save document content');
        return false;
      } catch (error) {
        logger.error('Error saving document to database:', error);
        return false;
      }
    } catch (error) {
      logger.error('Error in saveDocumentToDatabase:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Load document content from database
  const loadDocumentContent = async (fileId: string): Promise<string | null> => {
    if (!fileId || isLoading || isContentLoadedRef.current) return null;
    
    setIsLoading(true);
    try {
      logger.info('=== DOCUMENT LOADING START ===');
      logger.info(`Loading document content for fileId: ${fileId}`);
      
      // Fetch file content from database
      const { data, error } = await supabase
        .from('files')
        .select('content, name')
        .eq('id', fileId)
        .single();
      
      if (error) {
        logger.error('Error loading document content:', error);
        return null;
      }
      
      if (!data || !data.content) {
        logger.info(`No content found for file: ${fileId}`);
        setIsLoading(false);
        isContentLoadedRef.current = true;
        return null;
      }
      
      logger.info(`Found document content for file: ${data.name}`);
      
      // Check if it's a document type content
      if (data.content.type === 'document' && data.content.htmlContent) {
        logger.info('Successfully loaded document content');
        isContentLoadedRef.current = true;
        return data.content.htmlContent;
      } else {
        logger.warn('Content exists but is not document type or has no HTML content');
        return null;
      }
    } catch (error) {
      logger.error('Error in loadDocumentContent:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DocumentContext.Provider value={{
      isConnected,
      connectionError,
      sendTextOperation,
      sendCursorUpdate,
      setOnRemoteTextOperation,
      setOnRemoteCursorUpdate,
      connect,
      saveDocumentToDatabase,
      loadDocumentContent,
      isSaving,
      isLoading
    }}>
      {children}
    </DocumentContext.Provider>
  );
};

export default DocumentProvider; 