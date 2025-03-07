import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import chatApi from '../api/chat';
import { useAuth } from './AuthContext';
import useSocketIO from '../hooks/useSocketIO';
import toast from 'react-hot-toast';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [channels, setChannels] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Socket.IO connection
  const {
    isConnected,
    emit,
    on,
    connect,
    disconnect
  } = useSocketIO({
    onConnect: (socket) => {
      console.log('Connected to chat Socket.IO server');
      
      // Join active channel if exists
      if (activeChannel && currentUser) {
        joinChannel(activeChannel.id);
      }
    },
    onDisconnect: (reason) => {
      console.log(`Disconnected from chat Socket.IO server: ${reason}`);
    },
    onError: (err) => {
      console.error('Chat Socket.IO error:', err);
    },
    onReconnect: () => {
      console.log('Reconnected to chat Socket.IO server');
      
      // Rejoin active channel on reconnect
      if (activeChannel && currentUser) {
        joinChannel(activeChannel.id);
      }
    }
  });
  
  // Join a channel via Socket.IO
  const joinChannel = useCallback((channelId) => {
    if (!isConnected || !currentUser) return;
    
    console.log(`Joining channel ${channelId} via Socket.IO`);
    
    emit('join_channel', {
      channel_id: channelId,
      user_info: {
        id: currentUser.id,
        name: currentUser.get_full_name ? currentUser.get_full_name() : 'User',
        email: currentUser.email
      }
    }, (response) => {
      console.log('Join channel response:', response);
    });
  }, [isConnected, currentUser, emit]);
  
  // Leave a channel via Socket.IO
  const leaveChannel = useCallback((channelId) => {
    if (!isConnected) return;
    
    console.log(`Leaving channel ${channelId} via Socket.IO`);
    
    emit('leave_channel', {
      channel_id: channelId
    });
  }, [isConnected, emit]);
  
  // Load channels for the current user's business
  const loadChannels = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // APIからのデータ取得が失敗した場合のフォールバック
      // バックエンドの最新状態に合わせたデフォルトチャンネル
      const defaultChannels = [
        {
          id: 1,
          name: 'task',
          workspace: { id: 1, name: 'Workspace' },
          channel_type: 'public',
          is_direct_message: false,
          description: 'タスク関連の通知や議論のための共通チャンネルです',
          unread_count: 0
        },
        {
          id: 2,
          name: 'general',
          workspace: { id: 1, name: 'Workspace' },
          channel_type: 'public', 
          is_direct_message: false,
          description: '一般的な会話用チャンネルです',
          unread_count: 0
        }
      ];
      
      // 最初にデフォルトのチャンネルを設定
      setChannels(defaultChannels);
      setDirectMessages([]);
      
      try {
        // Try to load real channels from API
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
        
        // APIから取得したデータがある場合のみ更新
        if (allChannels.length > 0) {
          setChannels(allChannels);
        }
        
        if (allDirectMessages.length > 0) {
          setDirectMessages(allDirectMessages);
        }
        
        setError(null);
      } catch (apiErr) {
        console.warn('Could not load real channels from API, using default channels:', apiErr);
        // フォールバックとしてデフォルトチャンネルをそのまま使用
      }
    } catch (err) {
      console.error('Error loading channels:', err);
      setError('チャンネルの読み込み中にエラーが発生しました');
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
  
  // Set up Socket.IO event listeners
  useEffect(() => {
    if (!isConnected) return;
    
    // Handle incoming chat messages
    const unsubscribeMessage = on('chat_message', (data) => {
      console.log('Received chat message:', data);
      
      // Only process messages for the active channel
      if (activeChannel && data.channel_id === activeChannel.id.toString()) {
        const enhancedMessage = {
          id: data.id,
          content: data.content,
          user: {
            id: data.user.id,
            full_name: data.user.name || 'Unknown User'
          },
          created_at: data.timestamp,
          channel: parseInt(data.channel_id)
        };
        
        setMessages(prevMessages => {
          // Check if message already exists (avoid duplicates)
          const exists = prevMessages.some(m => m.id === enhancedMessage.id);
          if (exists) return prevMessages;
          return [...prevMessages, enhancedMessage];
        });
      } else {
        // If message is for another channel, increment unread count
        setChannels(prevChannels => {
          return prevChannels.map(ch => {
            if (ch.id.toString() === data.channel_id) {
              return {
                ...ch,
                unread_count: (ch.unread_count || 0) + 1
              };
            }
            return ch;
          });
        });
      }
    });
    
    // Handle typing indicators
    const unsubscribeTyping = on('typing', (data) => {
      console.log('Typing indicator:', data);
      // We could implement typing indicator UI here
    });
    
    // Handle read status updates
    const unsubscribeReadStatus = on('read_status', (data) => {
      console.log('Read status update:', data);
      // We could update read receipts UI here
    });
    
    // Handle user joined notifications
    const unsubscribeUserJoined = on('user_joined', (data) => {
      console.log('User joined channel:', data);
      // We could show a notification that a user joined
    });
    
    // Clean up event listeners on unmount or when connection status changes
    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
      unsubscribeReadStatus();
      unsubscribeUserJoined();
    };
  }, [isConnected, on, activeChannel]);
  
  // Set active channel and load its messages
  const selectChannel = useCallback(async (channel) => {
    // Leave previous channel if exists
    if (activeChannel && isConnected) {
      leaveChannel(activeChannel.id);
    }
    
    setActiveChannel(channel);
    
    if (channel) {
      await loadMessages(channel.id);
      
      // Reset unread count for this channel in the local state
      setChannels(prevChannels => {
        return prevChannels.map(ch => {
          if (ch.id === channel.id) {
            return { ...ch, unread_count: 0 };
          }
          return ch;
        });
      });
      
      // Join the new channel via Socket.IO
      if (isConnected) {
        joinChannel(channel.id);
      }
      
      // Send API request to mark channel as read
      try {
        await chatApi.markChannelAsRead(channel.id);
        
        // Also notify other users through Socket.IO
        if (isConnected) {
          emit('read_status', {
            channel_id: channel.id,
            timestamp: new Date().toISOString()
          });
        } else {
          console.warn('Socket.IO not connected, read status will not be broadcast in real-time');
          
          // Try to reconnect Socket.IO
          connect();
        }
      } catch (err) {
        console.error("Failed to mark channel as read:", err);
      }
    }
  }, [loadMessages, isConnected, activeChannel, joinChannel, leaveChannel, emit, connect]);
  
  // Send a message to the current channel
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!activeChannel) return null;
    
    console.log('Sending message to channel:', activeChannel.id, content);
    
    const { files, parentMessageId, mentionedUserIds } = options;
    
    try {
      // Create a unique timestamp-based ID for this message
      const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create a message object for immediate display
      const messageObj = {
        id: tempId,
        content,
        channel: activeChannel.id,
        user: {
          id: currentUser?.id || 1,
          full_name: currentUser?.get_full_name ? currentUser.get_full_name() : 'Current User',
        },
        created_at: new Date().toISOString(),
        is_local: !isConnected, // Flag to indicate if this is a local-only message
      };
      
      // Add the message to the UI immediately for better responsiveness
      setMessages(prevMessages => {
        const exists = prevMessages.some(m => m.id === messageObj.id);
        if (exists) return prevMessages;
        return [...prevMessages, messageObj];
      });
      
      // Send via Socket.IO if connected
      if (isConnected) {
        emit('chat_message', {
          channel_id: activeChannel.id,
          content,
          id: tempId
        });
      } else {
        console.warn('Socket.IO not connected, message saved locally only');
        
        // Try to reconnect
        connect();
      }
      
      // Also save to API for persistence
      try {
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
        
        if (files && files.length > 0) {
          // For files, use FormData
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
              console.warn('Could not save message to API:', err);
            });
        } else {
          // Regular JSON message - send but don't block UI
          chatApi.createMessage(messageData)
            .then(response => {
              console.log('Message saved to API:', response.data);
            })
            .catch(err => {
              console.warn('Could not save message to API:', err);
            });
        }
      } catch (apiError) {
        console.error('API Error when sending message:', apiError);
      }
      
      return messageObj;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return null;
    }
  }, [activeChannel, isConnected, currentUser, emit, connect]);
  
  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping = true) => {
    if (!activeChannel || !isConnected) return;
    
    emit('typing_indicator', {
      channel_id: activeChannel.id,
      is_typing: isTyping
    });
  }, [activeChannel, isConnected, emit]);
  
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
  
  // Load channels on initial mount and when user changes
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 チャンネル読み込み開始 - ユーザー:', currentUser);
      
      // 必ず表示するデフォルトチャンネル定義
      const defaultChannels = [
        {
          id: 1,
          name: 'task',
          workspace: { id: 1, name: 'Workspace' },
          channel_type: 'public',
          is_direct_message: false,
          description: 'タスク関連の通知や議論のための共通チャンネルです',
          unread_count: 0
        },
        {
          id: 2,
          name: 'general',
          workspace: { id: 1, name: 'Workspace' },
          channel_type: 'public',
          is_direct_message: false,
          description: '一般的な会話用チャンネルです',
          unread_count: 0
        }
      ];
      
      // 先にデフォルトチャンネルを設定して表示を確保
      setChannels(defaultChannels);
      console.log('📋 デフォルトチャンネル設定完了');
      
      // APIからのデータ取得を試みる
      loadChannels()
        .then(() => {
          console.log('✅ APIからのチャンネル取得成功');
        })
        .catch(err => {
          console.error('❌ APIチャンネル取得エラー、デフォルトチャンネルを維持:', err);
          setError(null); // エラー表示はしない
        });
    }
  }, [currentUser, loadChannels]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Leave active channel
      if (activeChannel && isConnected) {
        leaveChannel(activeChannel.id);
      }
      
      // Disconnect Socket.IO
      disconnect();
    };
  }, [activeChannel, isConnected, leaveChannel, disconnect]);
  
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
    sendTypingIndicator,
    createChannel,
    startDirectMessage,
    searchMessages,
    connect
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