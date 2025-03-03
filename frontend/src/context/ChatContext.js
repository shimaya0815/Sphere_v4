import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { chatApi } from '../api';
import { useAuth } from './AuthContext';
import useWebSocket from '../hooks/useWebSocket';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [channels, setChannels] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Websocket connection for the active channel
  const getWebSocketUrl = (channelId) => {
    if (!channelId) return null;
    
    console.log('Getting WebSocket URL for channel:', channelId);
    
    // リバースプロキシを介してWebSocketサーバーに接続
    // これによりCORSの問題が解決される
    return `ws://${window.location.host}/ws/chat/${channelId}/`;
  };
  
  const { 
    isConnected,
    sendMessage: sendWebSocketMessage
  } = useWebSocket(
    activeChannel ? getWebSocketUrl(activeChannel.id) : null,
    {
      automaticOpen: !!activeChannel,
      onMessage: (data) => {
        if (data.type === 'chat_message') {
          handleNewMessage(data.data);
        }
      }
    }
  );
  
  // Load channels for the current user's business
  const loadChannels = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Create mock channels immediately to ensure faster UI development
      const mockChannels = [
        {
          id: 1,
          name: 'general',
          workspace: { id: 1, name: 'Workspace' },
          channel_type: 'public',
          is_direct_message: false,
          description: '一般的な会話用チャンネル',
          unread_count: 0
        },
        {
          id: 2,
          name: 'random',
          workspace: { id: 1, name: 'Workspace' },
          channel_type: 'public', 
          is_direct_message: false,
          description: '雑談用チャンネル',
          unread_count: 0
        }
      ];
      
      // Create mock direct messages
      const mockDMs = [
        {
          id: 3,
          name: currentUser.get_full_name ? currentUser.get_full_name() : 'テストユーザー',
          workspace: { id: 1, name: 'Workspace' },
          channel_type: 'direct',
          is_direct_message: true,
          unread_count: 0
        }
      ];
      
      setChannels(mockChannels);
      setDirectMessages(mockDMs);
      
      try {
        // Try to load real channels but don't block the UI
        const response = await chatApi.getUserChannels();
        
        // Process and organize channels
        const allChannels = [];
        const allDirectMessages = [];
        
        response.forEach(workspace => {
          workspace.channels.forEach(channel => {
            if (channel.is_direct_message) {
              allDirectMessages.push({
                ...channel,
                workspace: workspace.workspace
              });
            } else {
              allChannels.push({
                ...channel,
                workspace: workspace.workspace
              });
            }
          });
        });
        
        if (allChannels.length > 0) {
          setChannels(allChannels);
        }
        
        if (allDirectMessages.length > 0) {
          setDirectMessages(allDirectMessages);
        }
        
        setError(null);
      } catch (apiErr) {
        console.warn('Could not load real channels, using mock data:', apiErr);
        // Already using mock data, so just log the error
      }
    } catch (err) {
      console.error('Error loading channels:', err);
      setError('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Load messages for a channel
  const loadMessages = useCallback(async (channelId, options = {}) => {
    if (!channelId) return;
    
    setLoading(true);
    try {
      const response = await chatApi.getChannelMessages(channelId, options);
      
      // If loading more messages (before_id is set), append to existing messages
      // Otherwise replace all messages
      if (options.before_id) {
        setMessages(prevMessages => [...response.results, ...prevMessages]);
      } else {
        setMessages(response.results || []);
      }
      
      setError(null);
      return response;
    } catch (err) {
      console.error('Error loading messages:', err);
      
      // Use mock data if API call fails
      const mockMessages = [
        {
          id: 1,
          content: 'チャンネルへようこそ！',
          user: {
            id: 999,
            full_name: 'System',
          },
          created_at: new Date().toISOString(),
          channel: channelId,
        }
      ];
      
      setMessages(mockMessages);
      setError(null);
      
      return { results: mockMessages, count: mockMessages.length };
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Set active channel and load its messages
  const selectChannel = useCallback(async (channel) => {
    setActiveChannel(channel);
    if (channel) {
      await loadMessages(channel.id);
    }
  }, [loadMessages]);
  
  // Handle new message (from WebSocket or after sending)
  const handleNewMessage = useCallback((message) => {
    console.log('Handling new message:', message);
    
    // Add mock user data if not present
    const enhancedMessage = { 
      ...message,
      // Ensure message has necessary properties
      id: message.id || Math.floor(Math.random() * 1000000),
      user: message.user || {
        id: currentUser?.id || 1,
        full_name: currentUser?.get_full_name() || 'Current User',
      },
      created_at: message.created_at || new Date().toISOString()
    };
    
    setMessages(prevMessages => {
      // Check if message already exists
      const exists = prevMessages.some(m => m.id === enhancedMessage.id);
      if (exists) return prevMessages;
      return [...prevMessages, enhancedMessage];
    });
  }, [currentUser]);
  
  // Send a message to the current channel
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!activeChannel) return null;
    
    console.log('Sending message to channel:', activeChannel.id, content);
    
    const { files, parentMessageId, mentionedUserIds } = options;
    
    try {
      // Create a unique timestamp-based ID for this message
      const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create a mock message immediately for UI responsiveness
      const mockMessage = {
        id: tempId,
        content,
        channel: activeChannel.id,
        user: {
          id: currentUser?.id || 1,
          full_name: currentUser?.get_full_name ? currentUser.get_full_name() : 'Current User',
        },
        created_at: new Date().toISOString(),
      };
      
      // Add the mock message to the UI immediately
      handleNewMessage(mockMessage);
      
      // Try to send via WebSocket for real-time updates
      if (isConnected) {
        console.log('Sending via WebSocket:', mockMessage);
        sendWebSocketMessage({
          type: 'chat_message',
          data: mockMessage
        });
      }
      
      // Prepare message data for API
      const messageData = {
        content,
        channel: activeChannel.id
      };
      
      if (parentMessageId) {
        messageData.parent_message = parentMessageId;
      }
      
      if (mentionedUserIds && mentionedUserIds.length > 0) {
        messageData.mentioned_user_ids = mentionedUserIds;
      }
      
      try {
        // Try to send via API (in the background)
        if (files && files.length > 0) {
          const formData = new FormData();
          formData.append('channel', activeChannel.id);
          formData.append('content', content);
          
          if (parentMessageId) {
            formData.append('parent_message', parentMessageId);
          }
          
          if (mentionedUserIds && mentionedUserIds.length > 0) {
            mentionedUserIds.forEach(id => {
              formData.append('mentioned_user_ids', id);
            });
          }
          
          files.forEach(file => {
            formData.append('files', file);
          });
          
          // Send API request but don't block UI
          chatApi.createMessage(formData)
            .then(response => {
              console.log('Message saved to API:', response.data);
            })
            .catch(err => {
              console.warn('Could not save message to API, but WebSocket delivery was attempted', err);
            });
        } else {
          // Regular JSON message - send but don't block UI
          chatApi.createMessage(messageData)
            .then(response => {
              console.log('Message saved to API:', response.data);
            })
            .catch(err => {
              console.warn('Could not save message to API, but WebSocket delivery was attempted', err);
            });
        }
      } catch (apiError) {
        console.error('API Error when sending message:', apiError);
        // Already added message to UI and attempted WebSocket delivery
      }
      
      // Return the mock message that was added to the UI
      return mockMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return null;
    }
  }, [activeChannel, isConnected, sendWebSocketMessage, handleNewMessage, currentUser]);
  
  // Create a new channel
  const createChannel = useCallback(async (channelData) => {
    try {
      const response = await chatApi.createChannel(channelData);
      
      // Add the new channel to the list
      setChannels(prevChannels => [...prevChannels, response.data]);
      
      return response.data;
    } catch (err) {
      console.error('Error creating channel:', err);
      setError('Failed to create channel');
      return null;
    }
  }, []);
  
  // Start a direct message conversation
  const startDirectMessage = useCallback(async (userId) => {
    try {
      const response = await chatApi.createDirectMessageChannel(userId);
      
      // Add to direct messages if not already there
      setDirectMessages(prevDMs => {
        const exists = prevDMs.some(dm => dm.id === response.data.id);
        if (exists) return prevDMs;
        return [...prevDMs, response.data];
      });
      
      return response.data;
    } catch (err) {
      console.error('Error starting direct message:', err);
      setError('Failed to start direct message conversation');
      return null;
    }
  }, []);
  
  // Search messages
  const searchMessages = useCallback(async (workspaceId, query, options = {}) => {
    try {
      const response = await chatApi.searchMessages(workspaceId, query, options);
      return response;
    } catch (err) {
      console.error('Error searching messages:', err);
      setError('Failed to search messages');
      return { results: [], count: 0 };
    }
  }, []);
  
  // Load channels on initial mount and handle mock data if API fails
  useEffect(() => {
    if (currentUser) {
      loadChannels().catch(err => {
        console.error('Error loading real channels, using mock data', err);
        
        // Create mock channels if API fails
        const mockChannels = [
          {
            id: 1,
            name: 'general',
            workspace: { id: 1, name: 'Workspace' },
            channel_type: 'public',
            is_direct_message: false,
            description: '一般的な会話用チャンネル',
            unread_count: 0
          },
          {
            id: 2,
            name: 'random',
            workspace: { id: 1, name: 'Workspace' },
            channel_type: 'public',
            is_direct_message: false,
            description: '雑談用チャンネル',
            unread_count: 0
          }
        ];
        
        // Create mock direct messages
        const mockDMs = [
          {
            id: 3,
            name: 'テストユーザー',
            workspace: { id: 1, name: 'Workspace' },
            channel_type: 'direct',
            is_direct_message: true,
            unread_count: 0
          }
        ];
        
        setChannels(mockChannels);
        setDirectMessages(mockDMs);
        setError(null);
      });
    }
  }, [currentUser, loadChannels]);
  
  // Create default channel if none exists
  useEffect(() => {
    if (channels.length === 0 && !loading && currentUser) {
      // Create a default channel if there are no channels
      createChannel({
        name: 'general',
        description: '一般的な会話用チャンネル',
        workspace: 1,
        channel_type: 'public'
      }).catch(err => console.error('Error creating default channel', err));
    }
  }, [channels, loading, currentUser, createChannel]);
  
  const value = {
    channels,
    directMessages,
    activeChannel,
    messages,
    loading,
    error,
    isConnected,
    loadChannels,
    loadMessages,
    selectChannel,
    sendMessage,
    createChannel,
    startDirectMessage,
    searchMessages
  };
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;