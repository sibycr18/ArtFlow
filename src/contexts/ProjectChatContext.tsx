import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import supabase from '../utils/supabaseClient';

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
  isLoading: boolean;
  isSending: boolean;
  channelStatus: string;
  isConnecting: boolean;
}

const ProjectChatContext = createContext<ProjectChatContextType | undefined>(undefined);

export function ProjectChatProvider({ children, projectId }: { children: React.ReactNode; projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [channelStatus, setChannelStatus] = useState<string>('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuth();
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  // Messages reference for closure safety
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  // Add a user cache to prevent repeated lookups
  const userCache = useRef<Record<string, any>>({});
  
  // Toggle chat visibility
  const toggleChat = () => setIsOpen(prev => !prev);

  // Fetch all messages for this project
  const fetchMessages = useCallback(async () => {
    if (!projectId || !user?.id) {
      console.log(`[Chat Debug] Skipping fetch - missing projectId or user.id: projectId=${projectId}, userId=${user?.id}`);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Log the exact URL being called
      const url = `${API_BASE_URL}/projects/${projectId}/messages?user_id=${user.id}`;
      console.log(`[Chat Debug] Fetching messages from API URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`[Chat Debug] API fetch failed: ${response.status} ${response.statusText}`);
        // Log the response body for more detail on the error
        const errorText = await response.text();
        console.error(`[Chat Debug] Error response body: ${errorText}`);
        throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[Chat Debug] Received ${data.length} messages from API`);
      console.log(`[Chat Debug] API response data:`, data);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        // Process messages with user information using the cached version
        const messagesWithUserData = await Promise.all(
          data.map(async (msg: any) => {
            const sender = await getSenderWithCache(msg.user_id);
              
            return {
              id: msg.id,
              content: msg.content,
              sender,
              timestamp: new Date(msg.created_at)
            };
          })
        );
        
        console.log(`[Chat Debug] Processed ${messagesWithUserData.length} messages with user data`);
        
        // Replace all messages (don't append) to avoid duplicates
        setMessages(messagesWithUserData);
      }
    } catch (error) {
      console.error('[Chat Debug] Error loading messages from API:', error);
      // If the API fetch fails, fall back to direct Supabase query
      console.log('[Chat Debug] Falling back to direct Supabase query');
      await fetchMessagesDirectly();
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [projectId, user]);

  // Direct Supabase query as fallback
  const fetchMessagesDirectly = useCallback(async () => {
    if (!projectId || !user?.id) {
      console.log(`[Chat Debug] Skipping direct fetch - missing projectId or user.id: projectId=${projectId}, userId=${user?.id}`);
      return;
    }
    
    try {
      console.log('[Chat Debug] Fetching messages directly from Supabase');
      console.log(`[Chat Debug] Query params: project_id=${projectId}`);
      
      // Use authenticated query through Supabase (not anonymous)
      const { data, error } = await supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('[Chat Debug] Error fetching messages from Supabase:', error);
        console.error('[Chat Debug] Full error object:', JSON.stringify(error));
        return;
      }
      
      if (!data) {
        console.error('[Chat Debug] Supabase returned null or undefined data');
        return;
      }
      
      if (data.length === 0) {
        console.log('[Chat Debug] No messages found in Supabase. This may be normal for a new project.');
        return;
      }
      
      console.log(`[Chat Debug] Received ${data.length} messages from Supabase directly`);
      console.log('[Chat Debug] Supabase response data:', data);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        // Process messages with user information using the cached version
        const messagesWithUserData = await Promise.all(
          data.map(async (msg: any) => {
            const sender = await getSenderWithCache(msg.user_id);
              
            return {
              id: msg.id,
              content: msg.content,
              sender,
              timestamp: new Date(msg.created_at)
            };
          })
        );
        
        console.log(`[Chat Debug] Processed ${messagesWithUserData.length} messages with user data from Supabase`);
        
        // Replace all messages to avoid duplicates from multiple sources
        setMessages(messagesWithUserData);
      }
    } catch (error) {
      console.error('[Chat Debug] Error in direct Supabase fetch:', error);
      console.error('[Chat Debug] Full error:', JSON.stringify(error, null, 2));
    }
  }, [projectId, user]);

  // Set up real-time subscription and cleanup
  useEffect(() => {
    if (!projectId || !user?.id) return;
    
    // Flag component as mounted
    isMounted.current = true;
    
    // Set connecting state to true
    setIsConnecting(true);
    
    // Debug info to help identify connection issues
    console.log("[Chat Debug] Setting up Supabase Realtime for project:", projectId);
    
    // Initial message fetch
    fetchMessages();
    
    // Configure channel for real-time updates with proper naming
    const channelName = `project-messages-${projectId}`;
    console.log("[Chat Debug] Creating channel:", channelName);
    
    // Enhanced subscription with better real-time configuration
    const subscription = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: user.id }
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT',  // Focus only on INSERT events to improve performance
        schema: 'public', 
        table: 'project_messages',
        filter: `project_id=eq.${projectId}`
      }, async (payload: any) => {
        console.log("[Chat Debug] Received real-time payload:", payload);
        
        if (!isMounted.current) return;
        
        // Get user information for this message using the cached version
        const senderId = payload.new.user_id;
        const sender = await getSenderWithCache(senderId);
        
        // Create a new message from the payload with proper user info
        const newMessage: Message = {
          id: payload.new.id,
          content: payload.new.content,
          sender,
          timestamp: new Date(payload.new.created_at)
        };
        
        // Check if message already exists to avoid duplicates
        setMessages(prev => {
          // Skip if already exists
          if (prev.some(msg => msg.id === newMessage.id)) {
            console.log(`[Chat Debug] Skipping duplicate message: ${newMessage.id}`);
            return prev;
          }
          
          console.log(`[Chat Debug] Adding new real-time message: ${newMessage.id}`);
          // Add new message and sort by timestamp
          return [...prev, newMessage].sort((a, b) => 
            a.timestamp.getTime() - b.timestamp.getTime()
          );
        });
      })
      .subscribe((status: string) => {
        console.log("[Chat Debug] Supabase channel status changed:", status);
        
        if (isMounted.current) {
          setChannelStatus(status);
          
          // Update connecting state based on channel status
          if (status === 'SUBSCRIBED') {
            setIsConnecting(false);
            console.log("[Chat Debug] Successfully subscribed to channel");
            // Fetch messages immediately to ensure we have latest state
            fetchMessagesDirectly();
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
            setIsConnecting(false);
            console.error("[Chat Debug] Channel error or closed:", status);
            // Try to recover with direct fetch
            fetchMessagesDirectly();
          }
        }
      });
    
    // Implement more responsive polling for faster updates
    const pollInterval = setInterval(() => {
      if (isMounted.current) {
        console.log("[Chat Debug] Polling for messages as fallback");
        fetchMessagesDirectly();
      }
    }, 5000); // Poll every 5 seconds instead of 30 seconds for more real-time feel
    
    // Also add a heartbeat to keep the connection alive
    const heartbeatInterval = setInterval(() => {
      if (isMounted.current) {
        subscription.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { projectId, userId: user.id, timestamp: new Date().toISOString() }
        });
      }
    }, 15000); // Send heartbeat every 15 seconds
    
    // Cleanup function
    return () => {
      console.log("[Chat Debug] Cleaning up Supabase Realtime subscription");
      isMounted.current = false;
      setIsConnecting(false);
      subscription.unsubscribe();
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
    };
  }, [projectId, fetchMessages, fetchMessagesDirectly, user]);

  // Helper function to get sender info with caching
  const getSenderWithCache = async (userId: string) => {
    // Return from cache if available
    if (userCache.current[userId]) {
      return userCache.current[userId];
    }

    if (userId === user?.id) {
      const currentUser = {
        id: user.id,
        name: user.name || 'You',
        avatar: user.picture || 'https://via.placeholder.com/32'
      };
      // Add to cache
      userCache.current[userId] = currentUser;
      return currentUser;
    }
    
    try {
      // Fetch user data from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('id, name, picture')
        .eq('id', userId)
        .single();
        
      if (error || !data) {
        const unknownUser = {
          id: userId,
          name: 'Unknown User',
          avatar: 'https://via.placeholder.com/32'
        };
        // Even cache unknown users to prevent repeated lookups
        userCache.current[userId] = unknownUser;
        return unknownUser;
      }
      
      const userInfo = {
        id: data.id,
        name: data.name || 'Unknown User',
        avatar: data.picture || 'https://via.placeholder.com/32'
      };
      
      // Add to cache
      userCache.current[userId] = userInfo;
      return userInfo;
    } catch (e) {
      const fallbackUser = {
        id: userId,
        name: 'Unknown User',
        avatar: 'https://via.placeholder.com/32'
      };
      // Cache even on error
      userCache.current[userId] = fallbackUser;
      return fallbackUser;
    }
  };

  // Optimized sendMessage function to eliminate redundant requests
  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || !projectId) return;
    
    try {
      setIsSending(true);
      const messageContent = content.trim();
      
      // User info for the current user (sender) - use from cache if available
      const userInfo = await getSenderWithCache(user.id);
      
      // Create a temporary message with local ID
      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        content: messageContent,
        sender: userInfo,
        timestamp: new Date()
      };
      
      // Add to UI immediately for responsiveness
      if (isMounted.current) {
        console.log(`[Chat Debug] Adding temporary message: ${tempId}`);
        setMessages(prev => [...prev, tempMessage]);
      }
      
      // Send to backend API - consolidated to a single request
      const response = await fetch(`${API_BASE_URL}/projects/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          user_id: user.id,
          content: messageContent
        })
      });
      
      // Parse response
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = await response.text();
      }
      
      if (!response.ok) {
        console.error('Error response from server:', responseData);
        
        // Remove temporary message on failure
        if (isMounted.current) {
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
        }
        throw new Error('Failed to send message');
      }
      
      // On success, don't immediately remove the temp message - we'll let it be replaced
      // when the real message arrives via the real-time subscription
      // This avoids the message appearing to disappear and reappear

      // Also directly add to Supabase for faster updates
      try {
        console.log(`[Chat Debug] Directly inserting message to Supabase for faster update`);
        await supabase
          .from('project_messages')
          .insert({
            id: responseData.id || undefined, // Use the ID from the response if available
            project_id: projectId,
            user_id: user.id,
            content: messageContent,
            created_at: new Date().toISOString()
          });
          
        // Update messages immediately with the correct ID if available
        if (responseData && responseData.id) {
          if (isMounted.current) {
            setMessages(prev => {
              // Replace temp message with the real one
              const updated = prev.map(msg => 
                msg.id === tempId ? {
                  ...msg,
                  id: responseData.id
                } : msg
              );
              return updated;
            });
          }
        }
      } catch (e) {
        console.error('[Chat Debug] Error with direct insert:', e);
        // We still have the temp message showing, so the UX is not affected
      }
      
    } catch (error) {
      console.error('[Chat Debug] Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ProjectChatContext.Provider value={{ 
      messages, 
      isOpen, 
      toggleChat, 
      sendMessage, 
      isLoading, 
      isSending,
      channelStatus,
      isConnecting
    }}>
      {children}
      {/* Debug element - only in development */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-0 left-0 p-2 text-xs bg-black/50 text-white z-[1000]">
          Channel: {channelStatus} | Messages: {messages.length} | Project: {projectId?.substring(0, 8)}
        </div>
      )}
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