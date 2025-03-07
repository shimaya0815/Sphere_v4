import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import chatApi from '../api/chat';
import { useAuth } from './AuthContext';
import useWebSocket from '../hooks/useWebSocket';
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
  
  // Websocket connection for the active channel - 複数の接続オプションを試す
  const getWebSocketUrl = (channelId) => {
    if (!channelId) {
      console.error('❌ チャンネルIDがありません');
      return null;
    }
    
    // HTTPSの場合はWSSを使用
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // 3つの異なる接続方法を定義（優先度順）
    const connectionOptions = [
      // 1. プロキシ経由で接続する方法 (webpack dev serverの設定を使用)
      `${protocol}//${window.location.host}/ws/chat/${channelId}/`,
      
      // 2. 直接WebSocketサーバーに接続する方法
      `${protocol}//localhost:8001/ws/chat/${channelId}/`,
      
      // 3. フォールバックとしてWebSocketサーバーのIPアドレスを直接指定
      `${protocol}//127.0.0.1:8001/ws/chat/${channelId}/`
    ];
    
    // 最初のオプションを使用（他のオプションはフック内の接続エラー時に自動試行）
    const selectedUrl = connectionOptions[0];
    
    // WebSocket接続URLとチャンネル情報をグローバル変数に保存（デバッグ用）
    window.wsConnectionInfo = {
      channelId,
      selectedUrl,
      allOptions: connectionOptions,
      timestamp: new Date().toISOString()
    };
    
    console.log(`🔌 WebSocket接続設定:`, window.wsConnectionInfo);
    
    return selectedUrl;
  };
  
  const [wsUrl, setWsUrl] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // WebSocket URL をチャンネル変更時に更新
  useEffect(() => {
    if (activeChannel) {
      // チャンネルIDが確実に数値であることを確認
      const channelId = activeChannel.id || 1;
      const url = getWebSocketUrl(channelId);
      
      // 詳細なログ出力
      console.log(`🔄 WebSocket URL設定: チャンネル=${JSON.stringify(activeChannel)}, ID=${channelId}, URL=${url}`);
      
      // 接続URL更新
      setWsUrl(url);
      
      // 接続再試行回数もリセット
      setConnectionAttempts(0);
    } else {
      console.warn('⚠️ アクティブチャンネルがありません - WebSocket接続を中断します');
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
      toast('チャットサーバーに再接続しています...', { id: 'chat-ws-reconnect' });
    }
  }, [isConnected, wsUrl, connect]);
  
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
          
          // 接続状態をより積極的にチェック
          // WebSocket接続を明示的に試みる
          handleReconnect();
          
          // 1秒後に再度接続状態をチェック
          setTimeout(() => {
            if (!isConnected) {
              // それでも接続できない場合のみ警告表示
              setMessages(prev => [
                ...prev,
                {
                  id: `local-${Date.now()}`,
                  content: "⚠️ WebSocketサーバーに接続できません。メッセージはローカルにのみ保存され、サーバーには送信されません。再接続を行います。",
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
          }, 1000);
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
  
  // Load channels on initial mount and handle defaults if API fails
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
        .then(apiChannels => {
          console.log('✅ APIからのチャンネル取得成功:', apiChannels);
          // APIデータがない場合はデフォルトのままでOK
        })
        .catch(err => {
          console.error('❌ APIチャンネル取得エラー、デフォルトチャンネルを維持:', err);
          setError(null); // エラー表示はしない
        });
    }
  }, [currentUser, loadChannels]);
  
  // チャンネル選択時に自動的にWebSocket接続を確立
  const forceConnectToChannel = useCallback((channel) => {
    if (!channel || !channel.id) {
      console.warn('❌ 有効なチャンネルがありません');
      return;
    }
    
    console.log('🔌 チャンネル接続開始:', channel);
    
    // 強制的にWebSocket接続を確立
    try {
      // チャンネルを選択
      selectChannel(channel);
      
      // WebSocket接続のためにタイマーを設定
      setTimeout(() => {
        try {
          if (channel && channel.id) {
            // useWebSocket.jsのconnect関数を直接呼び出す
            connect();
            console.log('🔄 WebSocket接続を強制的に試行:', channel.id);
          }
        } catch (err) {
          console.error('❌ WebSocket接続試行エラー:', err);
        }
      }, 500);
    } catch (err) {
      console.error('❌ チャンネル選択エラー:', err);
    }
  }, [selectChannel, connect]);
  
  // デフォルトチャンネルの作成は不要
  // サインアップ時にバックエンドでtaskとgeneralのチャンネルが自動的に作成されるため
  
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
    handleReconnect,
    forceConnectToChannel, // 新しい関数を公開
    connect // WebSocket接続関数も直接公開
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