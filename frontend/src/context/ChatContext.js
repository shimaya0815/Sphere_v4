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
    return `ws://localhost:8001/ws/chat/${channelId}/`;
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
      
      setChannels(allChannels);
      setDirectMessages(allDirectMessages);
      setError(null);
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
        setMessages(response.results);
      }
      
      setError(null);
      return response;
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
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
    setMessages(prevMessages => {
      // Check if message already exists
      const exists = prevMessages.some(m => m.id === message.id);
      if (exists) return prevMessages;
      return [...prevMessages, message];
    });
  }, []);
  
  // Send a message to the current channel
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!activeChannel) return null;
    
    const { files, parentMessageId, mentionedUserIds } = options;
    
    try {
      // Prepare message data
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
      
      // If has files, use FormData
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
        
        const response = await chatApi.createMessage(formData);
        
        // Add new message to the list
        handleNewMessage(response.data);
        
        // Also send via WebSocket for real-time updates to other users
        if (isConnected) {
          sendWebSocketMessage({
            type: 'chat_message',
            data: response.data
          });
        }
        
        return response.data;
      } else {
        // Regular JSON message
        const response = await chatApi.createMessage(messageData);
        
        // Add new message to the list
        handleNewMessage(response.data);
        
        // Also send via WebSocket for real-time updates to other users
        if (isConnected) {
          sendWebSocketMessage({
            type: 'chat_message',
            data: response.data
          });
        }
        
        return response.data;
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return null;
    }
  }, [activeChannel, isConnected, sendWebSocketMessage, handleNewMessage]);
  
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
  
  // Load channels on initial mount
  useEffect(() => {
    if (currentUser) {
      loadChannels();
    }
  }, [currentUser, loadChannels]);
  
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