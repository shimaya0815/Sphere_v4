import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import chatApi from '../api/chat';
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
    
    // Docker環境とラップトップ上での開発を区別
    const isDocker = process.env.REACT_APP_RUNNING_IN_DOCKER === 'true';
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // WebSocketのプロトコルを確認（HTTPSの場合はWSSを使用）
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    console.log(`Getting WebSocket URL for channel: ${channelId}, protocol: ${protocol}, isDocker: ${isDocker}, isLocalDev: ${isLocalDev}`);
    
    // Docker内でのWebSocket接続（Docker Compose内部での接続）
    if (isDocker) {
      // Docker内部のサービス名でアクセス
      return `${protocol}//websocket:8001/ws/chat/${channelId}/`;
    }
    
    // ローカル開発環境（Docker外）の場合
    if (isLocalDev) {
      // ホストマシンのIPアドレスで直接アクセス
      return `${protocol}//localhost:8001/ws/chat/${channelId}/`;
    }
    
    // その他の環境（本番など）ではプロキシを介して接続
    return `${protocol}//${window.location.host}/api/ws/chat/${channelId}/`;
  };
  
  const [wsUrl, setWsUrl] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // WebSocket URL をチャンネル変更時に更新
  useEffect(() => {
    if (activeChannel) {
      const url = getWebSocketUrl(activeChannel.id);
      console.log(`Setting WebSocket URL: ${url}`);
      setWsUrl(url);
    } else {
      setWsUrl(null);
    }
  }, [activeChannel]);
  
  const { 
    isConnected,
    sendMessage: sendWebSocketMessage,
    connect
  } = useWebSocket(
    wsUrl,
    {
      automaticOpen: true,
      onOpen: () => {
        console.log(`Connected to chat WebSocket for channel ID: ${activeChannel?.id}`);
        setConnectionAttempts(0);
        
        // 定期的なPingを送信するインターバルを設定
        const pingInterval = setInterval(() => {
          if (isConnected) {
            sendWebSocketMessage(JSON.stringify({
              type: 'ping',
              data: { timestamp: new Date().toISOString() }
            }));
            console.log('Sent ping to chat server');
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // 30秒ごとにPing
        
        return () => clearInterval(pingInterval);
      },
      onMessage: (event) => {
        try {
          // 文字列の場合はパース
          let data;
          if (typeof event === 'string') {
            data = JSON.parse(event);
          } else if (event.data) {
            data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          } else {
            data = event;
          }
          
          console.log("Received chat WebSocket message:", data);
          
          if (data.type === 'chat_message') {
            handleNewMessage(data.data);
          } else if (data.type === 'read_status') {
            // Update read status when other users read messages
            handleReadStatusUpdate(data.data);
          } else if (data.type === 'pong') {
            console.log('Received pong from server:', data);
          }
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
        }
      },
      onClose: () => {
        console.log('Disconnected from chat WebSocket');
        const newAttempts = connectionAttempts + 1;
        setConnectionAttempts(newAttempts);
      },
      onError: (error) => {
        console.error('Chat WebSocket error:', error);
        const newAttempts = connectionAttempts + 1;
        setConnectionAttempts(newAttempts);
      },
      // 自動再接続設定
      reconnectInterval: 3000,
      reconnectAttempts: 10
    }
  );
  
  // 追加: 明示的な再接続機能
  const handleReconnect = useCallback(() => {
    if (!isConnected && wsUrl) {
      console.log('Manually reconnecting to chat WebSocket');
      setConnectionAttempts(0);
      connect();
    }
  }, [isConnected, wsUrl, connect]);
  
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
      
      // Reset unread count for this channel in the local state
      setChannels(prevChannels => {
        return prevChannels.map(ch => {
          if (ch.id === channel.id) {
            return { ...ch, unread_count: 0 };
          }
          return ch;
        });
      });
      
      // WebSocketの接続状態をコンソールに出力
      console.log(`WebSocket状態 - Channel: ${channel.id}, 接続状態: ${isConnected ? '接続済み' : '未接続'}`);
      
      // Send API request to mark channel as read
      try {
        await chatApi.markChannelAsRead(channel.id);
        
        // Also notify other users through WebSocket
        if (isConnected) {
          const success = sendWebSocketMessage({
            type: 'read_status',
            data: {
              user_id: currentUser?.id,
              channel_id: channel.id,
              timestamp: new Date().toISOString()
            }
          });
          console.log(`WebSocket送信結果: ${success ? '成功' : '失敗'}`);
        } else {
          console.warn('WebSocket未接続のため、read_statusメッセージを送信できません。メッセージは表示されますが、リアルタイム通知は機能しません。');
          
          // オフライン状態でも通知メッセージを表示するためのフォールバック
          // ローカルのみでメッセージを追加（サーバーには送信されない）
          setMessages(prev => [
            ...prev,
            {
              id: `local-${Date.now()}`,
              content: "⚠️ WebSocketサーバーに接続できません。メッセージはローカルにのみ保存され、サーバーには送信されません。",
              user: {
                id: 0,
                full_name: "システム",
              },
              created_at: new Date().toISOString(),
              is_system: true,
              is_local: true
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to mark channel as read:", err);
      }
    }
  }, [loadMessages, currentUser, isConnected, sendWebSocketMessage]);
  
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
    
    // If message is from another user and in a different channel than active one
    // increment unread count for that channel
    if (message.user?.id !== currentUser?.id && 
        message.channel !== activeChannel?.id) {
      setChannels(prevChannels => {
        return prevChannels.map(ch => {
          if (ch.id === message.channel) {
            return {
              ...ch,
              unread_count: (ch.unread_count || 0) + 1
            };
          }
          return ch;
        });
      });
    }
  }, [currentUser, activeChannel]);
  
  // Handle read status updates from other users
  const handleReadStatusUpdate = useCallback((data) => {
    if (!data || !data.user_id || !data.channel_id) return;
    
    // We don't need to update our own UI when others read messages
    // This is primarily for syncing read receipts in the future
    console.log(`User ${data.user_id} read messages in channel ${data.channel_id}`);
  }, []);
  
  // Send a message to the current channel - works both online and offline
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
      handleNewMessage(messageObj);
      
      // Always try to send via WebSocket for real-time updates, if connected
      if (isConnected) {
        try {
          console.log('Sending via WebSocket:', messageObj);
          const sent = sendWebSocketMessage({
            type: 'chat_message',
            data: messageObj
          });
          
          if (!sent) {
            console.warn('WebSocket message send failed - connection may be lost');
          }
        } catch (wsError) {
          console.error('WebSocket send error:', wsError);
        }
      } else {
        console.warn('WebSocket not connected, message saved locally only');
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
      
      // Only try to save to API if we've had a successful connection
      if (isConnected) {
        // Try to send via API (in the background)
        try {
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
      }
      
      // Always return the message object that was added to the UI
      return messageObj;
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
    connectionAttempts,
    loadChannels,
    loadMessages,
    selectChannel,
    sendMessage,
    createChannel,
    startDirectMessage,
    searchMessages,
    handleReconnect
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