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
}

const ProjectChatContext = createContext<ProjectChatContextType | undefined>(undefined);

export function ProjectChatProvider({ children, projectId }: { children: React.ReactNode; projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [channelStatus, setChannelStatus] = useState<string>('disconnected');
  const { user } = useAuth();
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  // Messages reference for closure safety
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  // Toggle chat visibility
  const toggleChat = () => setIsOpen(prev => !prev);

  // Fetch all messages for this project
  const fetchMessages = useCallback(async () => {
    if (!projectId || !user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Get messages from backend API
      console.log(`[Chat Debug] Fetching messages from API for project: ${projectId}`);
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/messages?user_id=${user.id}`
      );
      
      if (!response.ok) {
        console.error(`[Chat Debug] API fetch failed: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[Chat Debug] Received ${data.length} messages from API`);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        // Helper function to get sender info
        const getSender = async (userId: string) => {
          if (userId === user.id) {
            return {
              id: user.id,
              name: user.name || 'You',
              avatar: user.picture || 'https://via.placeholder.com/32'
            };
          }
          
          try {
            // Fetch user data from Supabase
            const { data, error } = await supabase
              .from('users')
              .select('id, name, picture')
              .eq('id', userId)
              .single();
              
            if (error || !data) {
              return {
                id: userId,
                name: 'Unknown User',
                avatar: 'https://via.placeholder.com/32'
              };
            }
            
            return {
              id: data.id,
              name: data.name || 'Unknown User',
              avatar: data.picture || 'https://via.placeholder.com/32'
            };
          } catch (e) {
            return {
              id: userId,
              name: 'Unknown User',
              avatar: 'https://via.placeholder.com/32'
            };
          }
        };
        
        // Process messages with user information
        const messagesWithUserData = await Promise.all(
          data.map(async (msg: any) => {
            const sender = await getSender(msg.user_id);
              
            return {
              id: msg.id,
              content: msg.content,
              sender,
              timestamp: new Date(msg.created_at)
            };
          })
        );
        
        // Replace all messages (don't append) to avoid duplicates
        setMessages(messagesWithUserData);
      }
    } catch (error) {
      console.error('[Chat Debug] Error loading messages from API:', error);
      // If the API fetch fails, fall back to direct Supabase query
      await fetchMessagesDirectly();
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [projectId, user]);

  // Direct Supabase query as fallback
  const fetchMessagesDirectly = useCallback(async () => {
    if (!projectId || !user?.id) return;
    
    try {
      console.log('[Chat Debug] Fetching messages directly from Supabase');
      
      // Use authenticated query through Supabase (not anonymous)
      const { data, error } = await supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('[Chat Debug] Error fetching messages from Supabase:', error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('[Chat Debug] No messages found in Supabase');
        return;
      }
      
      console.log(`[Chat Debug] Received ${data.length} messages from Supabase directly`);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        // Helper function to get sender info
        const getSender = async (userId: string) => {
          if (userId === user.id) {
            return {
              id: user.id,
              name: user.name || 'You',
              avatar: user.picture || 'https://via.placeholder.com/32'
            };
          }
          
          try {
            // Fetch user data from Supabase
            const { data, error } = await supabase
              .from('users')
              .select('id, name, picture')
              .eq('id', userId)
              .single();
              
            if (error || !data) {
              return {
                id: userId,
                name: 'Unknown User',
                avatar: 'https://via.placeholder.com/32'
              };
            }
            
            return {
              id: data.id,
              name: data.name || 'Unknown User',
              avatar: data.picture || 'https://via.placeholder.com/32'
            };
          } catch (e) {
            return {
              id: userId,
              name: 'Unknown User',
              avatar: 'https://via.placeholder.com/32'
            };
          }
        };
        
        // Process messages with user information
        const messagesWithUserData = await Promise.all(
          data.map(async (msg: any) => {
            const sender = await getSender(msg.user_id);
              
            return {
              id: msg.id,
              content: msg.content,
              sender,
              timestamp: new Date(msg.created_at)
            };
          })
        );
        
        // Replace all messages to avoid duplicates from multiple sources
        setMessages(messagesWithUserData);
      }
    } catch (error) {
      console.error('[Chat Debug] Error in direct Supabase fetch:', error);
    }
  }, [projectId, user]);

  // Set up real-time subscription and cleanup
  useEffect(() => {
    if (!projectId || !user?.id) return;
    
    // Flag component as mounted
    isMounted.current = true;
    
    // Debug info to help identify connection issues
    console.log("[Chat Debug] Setting up Supabase Realtime for project:", projectId);
    
    // Initial message fetch
    fetchMessages();
    
    // Helper function to get sender info
    const getSender = async (userId: string) => {
      if (userId === user.id) {
        return {
          id: user.id,
          name: user.name || 'You',
          avatar: user.picture || 'https://via.placeholder.com/32'
        };
      }
      
      try {
        // Fetch user data from Supabase
        const { data, error } = await supabase
          .from('users')
          .select('id, name, picture')
          .eq('id', userId)
          .single();
          
        if (error || !data) {
          return {
            id: userId,
            name: 'Unknown User',
            avatar: 'https://via.placeholder.com/32'
          };
        }
        
        return {
          id: data.id,
          name: data.name || 'Unknown User',
          avatar: data.picture || 'https://via.placeholder.com/32'
        };
      } catch (e) {
        return {
          id: userId,
          name: 'Unknown User',
          avatar: 'https://via.placeholder.com/32'
        };
      }
    };
    
    // Configure channel for real-time updates with proper naming
    const channelName = `project-messages-${projectId}`;
    console.log("[Chat Debug] Creating channel:", channelName);
    
    // Subscribe to changes on the project_messages table
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: '*',  // Listen for all events (INSERT, UPDATE, DELETE)
        schema: 'public', 
        table: 'project_messages',
        filter: `project_id=eq.${projectId}`
      }, async (payload: any) => {
        console.log("[Chat Debug] Received payload:", payload);
        
        // Only process INSERT events
        if (payload.eventType !== 'INSERT') {
          return;
        }
        
        if (!isMounted.current) return;
        
        // Get user information for this message
        const senderId = payload.new.user_id;
        const sender = await getSender(senderId);
        
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
            return prev;
          }
          
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
        }
        
        // If the channel is established, verify we have all messages
        if (status === 'SUBSCRIBED') {
          console.log("[Chat Debug] Successfully subscribed to channel");
          fetchMessagesDirectly();
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          console.error("[Chat Debug] Channel error or closed:", status);
          // Try to recover with direct fetch
          fetchMessagesDirectly();
        }
      });
    
    // Polling as fallback mechanism
    const pollInterval = setInterval(() => {
      if (isMounted.current) {
        console.log("[Chat Debug] Polling for messages as fallback");
        fetchMessagesDirectly();
      }
    }, 10000); // Poll every 10 seconds as fallback
    
    // Cleanup function
    return () => {
      console.log("[Chat Debug] Cleaning up Supabase Realtime subscription");
      isMounted.current = false;
      subscription.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [projectId, fetchMessages, fetchMessagesDirectly, user]);

  // Send a new message
  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || !projectId) return;
    
    try {
      const messageContent = content.trim();
      
      // User info for the current user (sender)
      const userInfo = {
        id: user.id,
        name: user.name || 'You',
        avatar: user.picture || 'https://via.placeholder.com/32'
      };
      
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
        setMessages(prev => [...prev, tempMessage]);
      }
      
      // Send to backend API
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
      
      // Try direct insert as well for redundancy
      if (responseData && responseData.id) {
        // The message was added successfully via API, we can remove the temp message
        // and wait for the real-time update to add the real one
        if (isMounted.current) {
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
        }
      } else {
        // As fallback, try to also insert directly to Supabase
        try {
          const { data, error } = await supabase
            .from('project_messages')
            .insert({
              project_id: projectId,
              user_id: user.id,
              content: messageContent
            })
            .select();
            
          if (error) {
            console.error('Error with direct insert:', error);
          } else if (data && data.length > 0) {
            // Replace temp message with the real one if we got data back
            if (isMounted.current) {
              setMessages(prev => {
                const filtered = prev.filter(msg => msg.id !== tempId);
                const newMsg: Message = {
                  id: data[0].id,
                  content: data[0].content,
                  sender: userInfo,
                  timestamp: new Date(data[0].created_at)
                };
                return [...filtered, newMsg];
              });
            }
          }
        } catch (e) {
          console.error('Error with direct Supabase insert:', e);
        }
      }
      
      // Final fetch to ensure we have the latest state
      setTimeout(() => {
        if (isMounted.current) {
          fetchMessagesDirectly();
        }
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <ProjectChatContext.Provider value={{ messages, isOpen, toggleChat, sendMessage, isLoading }}>
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