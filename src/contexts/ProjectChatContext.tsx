import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug info
console.log('Supabase URL:', supabaseUrl ? 'Available' : 'Missing');
console.log('Supabase Key:', supabaseAnonKey ? 'Available' : 'Missing');

// Initialize with real-time enabled
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  },
  global: {
    // Force debug mode in development
    debug: import.meta.env.DEV
  }
});

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://artflow-backend-64f27556b9a4.herokuapp.com';

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
      console.log(`⬇️ Fetching messages for project ${projectId} via API`);
      
      // Get messages from backend API
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/messages?user_id=${user.id}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`📥 Received ${data.length} messages:`, data);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        // Helper function to get sender info
        const getSender = async (userId) => {
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
        
        // Process messages to include proper user data
        const messagesWithUserData = await Promise.all(
          data.map(async (msg) => {
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
        console.log(`✅ Set ${messagesWithUserData.length} messages in state with user data`);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [projectId, user, supabase]);

  // Direct Supabase query as fallback
  const fetchMessagesDirectly = useCallback(async () => {
    if (!projectId || !user?.id) return;
    
    try {
      console.log(`🔄 Fetching messages directly from Supabase for project ${projectId}`);
      
      // Use authenticated query through Supabase (not anonymous)
      const { data, error } = await supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages from Supabase:', error);
        return;
      }
      
      console.log(`📊 Supabase returned ${data?.length || 0} messages`);
      
      if (!data || data.length === 0) {
        console.log('No messages found in Supabase');
        return;
      }
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        // Helper function to get sender info
        const getSender = async (userId) => {
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
          data.map(async (msg) => {
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
        console.log(`📝 Updated messages state with ${messagesWithUserData.length} messages with user data`);
      }
    } catch (error) {
      console.error('Error in direct Supabase fetch:', error);
    }
  }, [projectId, user, supabase]);

  // Set up real-time subscription and cleanup
  useEffect(() => {
    if (!projectId || !user?.id) return;
    
    // Flag component as mounted
    isMounted.current = true;
    
    console.log(`🔌 Setting up real-time for project ${projectId} with user ${user.id}`);
    
    // Initial message fetch
    fetchMessages();
    
    // Helper function to get sender info
    const getSender = async (userId) => {
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
    console.log(`📡 Subscribing to channel: ${channelName}`);
    
    // Subscribe to changes on the project_messages table
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: '*',  // Listen for all events (INSERT, UPDATE, DELETE)
        schema: 'public', 
        table: 'project_messages',
        filter: `project_id=eq.${projectId}`
      }, async (payload) => {
        console.log(`⚡ Real-time event received:`, payload);
        
        // Only process INSERT events
        if (payload.eventType !== 'INSERT') {
          console.log(`⏭️ Skipping non-INSERT event: ${payload.eventType}`);
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
        
        console.log(`📝 New message with user info:`, newMessage);
        
        // Check if message already exists to avoid duplicates
        setMessages(prev => {
          // Skip if already exists
          if (prev.some(msg => msg.id === newMessage.id)) {
            console.log(`⏭️ Skipping duplicate message ${newMessage.id}`);
            return prev;
          }
          
          console.log(`➕ Adding new message to state: ${newMessage.id}`);
          // Add new message and sort by timestamp
          return [...prev, newMessage].sort((a, b) => 
            a.timestamp.getTime() - b.timestamp.getTime()
          );
        });
      })
      .subscribe((status) => {
        console.log(`📶 Subscription status: ${status}`);
        
        if (isMounted.current) {
          setChannelStatus(status);
        }
        
        // If the channel is established, verify we have all messages
        if (status === 'SUBSCRIBED') {
          console.log('✅ Channel established, fetching messages to ensure we have the latest');
          fetchMessagesDirectly();
        }
      });
    
    // Polling as fallback mechanism
    console.log('⏱️ Setting up polling fallback');
    const pollInterval = setInterval(() => {
      if (isMounted.current) {
        console.log('🔄 Polling for messages');
        fetchMessagesDirectly();
      }
    }, 10000); // Poll every 10 seconds as fallback
    
    // Cleanup function
    return () => {
      console.log(`🧹 Cleaning up realtime for project ${projectId}`);
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
      console.log(`📤 Sending message to project ${projectId}:`, messageContent);
      
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
        console.log(`📱 Added temporary message to UI: ${tempId}`);
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
      
      console.log('📨 Server response:', responseData);
      
      if (!response.ok) {
        console.error('⚠️ Error response from server:', responseData);
        
        // Remove temporary message on failure
        if (isMounted.current) {
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
        }
        throw new Error('Failed to send message');
      }
      
      console.log('✅ Message sent successfully to API');
      
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
          console.log('🔄 Attempting direct Supabase insert as fallback');
          const { data, error } = await supabase
            .from('project_messages')
            .insert({
              project_id: projectId,
              user_id: user.id,
              content: messageContent
            })
            .select();
            
          if (error) {
            console.error('⚠️ Error with direct insert:', error);
          } else {
            console.log('✅ Direct insert successful:', data);
            
            // Replace temp message with the real one if we got data back
            if (data && data.length > 0 && isMounted.current) {
              setMessages(prev => {
                const filtered = prev.filter(msg => msg.id !== tempId);
                const newMsg = {
                  id: data[0].id,
                  content: data[0].content,
                  sender: {
                    id: user.id,
                    name: user.name || 'You',
                    avatar: user.picture || 'https://via.placeholder.com/32'
                  },
                  timestamp: new Date(data[0].created_at)
                };
                return [...filtered, newMsg];
              });
            }
          }
        } catch (e) {
          console.error('⚠️ Error with direct Supabase insert:', e);
        }
      }
      
      // Final fetch to ensure we have the latest state
      setTimeout(() => {
        if (isMounted.current) {
          console.log('🔄 Fetching final message state after send');
          fetchMessagesDirectly();
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  // Expose context values
  return (
    <ProjectChatContext.Provider value={{ messages, isOpen, toggleChat, sendMessage, isLoading }}>
      {children}
      {/* Debug element - remove in production */}
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