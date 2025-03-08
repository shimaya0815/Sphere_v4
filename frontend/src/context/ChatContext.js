import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import chatApi from '../api/chat';
import { useAuth } from './AuthContext';
import useChatSocket from '../hooks/useChatSocket';
import toast from 'react-hot-toast';

// チャットコンテキスト作成
const ChatContext = createContext();

/**
 * チャットコンテキストプロバイダーコンポーネント
 */
export const ChatProvider = ({ children }) => {
  const { currentUser } = useAuth();
  
  // チャンネル関連の状態管理
  const [channels, setChannels] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Socket.IOを使用したチャット接続管理
  const {
    isConnected,
    activeChannel,
    messages,
    setMessages,  // setMessages関数を追加
    typingUsers,
    selectChannel: selectChannelSocket,
    sendMessage: sendMessageSocket,
    sendTypingIndicator,
    sendReadStatus,
    connect,
    disconnect
  } = useChatSocket({
    showNotifications: true,
    debug: process.env.NODE_ENV === 'development'
  });
  
  /**
   * チャンネル一覧を読み込む
   */
  const loadChannels = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    
    try {
      // 最低限表示するデフォルトチャンネル
      const defaultChannels = [
        {
          id: 1,
          name: 'general',
          workspace: { id: 1, name: 'Workspace' },
          channel_type: 'public',
          is_direct_message: false,
          description: '一般的な会話用チャンネルです',
          unread_count: 0
        },
        {
          id: 2,
          name: 'task',
          workspace: { id: 1, name: 'Workspace' },
          channel_type: 'public',
          is_direct_message: false,
          description: 'タスク関連の通知や議論のための共通チャンネルです',
          unread_count: 0
        }
      ];
      
      // まずデフォルトチャンネルを表示して、UIのレスポンス性を確保
      setChannels(defaultChannels);
      setDirectMessages([]);
      
      try {
        // APIからチャンネル一覧を取得
        const response = await chatApi.getUserChannels();
        
        // チャンネルとダイレクトメッセージを整理
        const allChannels = [];
        const allDirectMessages = [];
        
        // レスポンスチェック - 配列かどうか確認
        const workspaces = Array.isArray(response) ? response : 
                         Array.isArray(response.data) ? response.data : [];
        
        // ここでさらにデバッグログを出力
        console.log('ワークスペースデータ:', workspaces);
        
        if (workspaces.length === 0) {
          console.log('ワークスペースデータが空か配列ではありません。デフォルトを使用します。');
          // デフォルトを使用するので、ここで早期リターン
          return;
        }
        
        workspaces.forEach(workspace => {
          // workspace.channelsが配列かどうか確認
          if (workspace && Array.isArray(workspace.channels)) {
            workspace.channels.forEach(channel => {
              if (!channel) return; // nullチェック
              
              const enrichedChannel = {
                ...channel,
                workspace: workspace.workspace || { id: 1, name: 'デフォルト' }
              };
              
              if (channel.is_direct_message) {
                allDirectMessages.push(enrichedChannel);
              } else {
                allChannels.push(enrichedChannel);
              }
            });
          } else {
            console.warn('このワークスペースのチャンネルデータが無効です:', workspace);
          }
        });
        
        // 取得データがある場合のみ更新
        if (allChannels.length > 0) {
          setChannels(allChannels);
        }
        
        if (allDirectMessages.length > 0) {
          setDirectMessages(allDirectMessages);
        }
        
        setError(null);
      } catch (apiErr) {
        console.warn('APIからのチャンネル取得に失敗しました。デフォルトチャンネルを使用します。', apiErr);
        // デフォルトチャンネルをそのまま使用
      }
    } catch (err) {
      console.error('チャンネル読み込みエラー:', err);
      setError('チャンネルの読み込み中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  /**
   * チャンネルのメッセージを読み込む
   * @param {number|string} channelId - チャンネルID
   * @param {Object} options - 読み込みオプション
   * @returns {Promise<Object>} 読み込み結果
   */
  const loadMessages = useCallback(async (channelId, options = {}) => {
    if (!channelId) return;
    
    setLoading(true);
    
    try {
      console.log(`チャンネル ${channelId} のメッセージを読み込み中...`, options);
      
      // APIからメッセージ履歴を取得
      const response = await chatApi.getChannelMessages(channelId, options);
      
      // レスポンスの形式を確認
      console.log(`チャンネル ${channelId} のメッセージ レスポンス:`, response);
      
      // APIからのレスポンスを統一形式に変換（Socket.IO互換形式に）
      let messages = [];
      let count = 0;
      
      if (response && response.data && response.data.results) {
        // 標準的なAPIレスポンス形式
        messages = response.data.results.map(msg => ({
          message_id: msg.id,
          channel_id: String(channelId),
          content: msg.content,
          user: msg.user,
          timestamp: msg.created_at,
          ...msg // その他の項目も保持
        }));
        count = response.data.count || messages.length;
        console.log(`チャンネル ${channelId} のメッセージ ${messages.length} 件を読み込みました`);
      } else if (response && Array.isArray(response.results)) {
        // 別の形式
        messages = response.results.map(msg => ({
          message_id: msg.id,
          channel_id: String(channelId),
          content: msg.content,
          user: msg.user,
          timestamp: msg.created_at,
          ...msg // その他の項目も保持
        }));
        count = response.count || messages.length;
        console.log(`チャンネル ${channelId} のメッセージ ${messages.length} 件を読み込みました`);
      } else if (response && Array.isArray(response)) {
        // 配列形式
        messages = response.map(msg => ({
          message_id: msg.id,
          channel_id: String(channelId),
          content: msg.content,
          user: msg.user,
          timestamp: msg.created_at,
          ...msg // その他の項目も保持
        }));
        count = messages.length;
        console.log(`チャンネル ${channelId} のメッセージ ${messages.length} 件を読み込みました`);
      } else {
        // それ以外のフォールバック
        console.warn(`不明な形式のメッセージレスポンス:`, response);
        if (response && typeof response === 'object') {
          messages = Object.values(response).filter(item => 
            item && typeof item === 'object' && item.content
          ).map(msg => ({
            message_id: msg.id || `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            channel_id: String(channelId),
            content: msg.content || '',
            user: msg.user || { id: 0, name: 'Unknown' },
            timestamp: msg.created_at || msg.timestamp || new Date().toISOString(),
            ...msg
          }));
          count = messages.length;
        }
      }
      
      return {
        results: messages,
        count: count
      };
    } catch (err) {
      console.error('メッセージ読み込みエラー:', err);
      
      // APIエラー時のフォールバックメッセージ
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
      
      return { results: mockMessages, count: mockMessages.length };
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * チャンネルを選択して表示する
   * @param {Object} channel - チャンネルオブジェクト
   */
  const selectChannel = useCallback(async (channel) => {
    if (!channel) return;
    
    try {
      console.log(`チャンネル選択: ${channel.name} (ID: ${channel.id})`);
      
      // 未読カウントをリセット
      setChannels(prevChannels => {
        return prevChannels.map(ch => {
          if (ch.id === channel.id) {
            return { ...ch, unread_count: 0 };
          }
          return ch;
        });
      });
      
      // APIでチャンネルを既読としてマーク
      try {
        await chatApi.markChannelAsRead(channel.id);
      } catch (err) {
        console.error('チャンネル既読マークエラー:', err);
      }
      
      // 先にSocket.IO経由でチャンネルを選択（メッセージ読み込み前に実行）
      try {
        console.log('Socket.IO経由でチャンネルを選択:', channel.id);
        const socketResult = await selectChannelSocket(channel);
        console.log('Socket.IO経由のチャンネル選択結果:', socketResult);
      } catch (socketErr) {
        console.error('Socket.IO経由のチャンネル選択エラー:', socketErr);
        // エラーは表示しない（メッセージ表示を優先）
      }
      
      // 過去メッセージを読み込む
      const messageHistory = await loadMessages(channel.id);
      
      // メッセージ履歴に基づいてメッセージを表示
      if (messageHistory && messageHistory.results) {
        // Socket.IOのメッセージをメッセージリストに設定
        console.log(`チャンネル ${channel.id} のメッセージを設定: ${messageHistory.results.length} 件`);
        
        // メッセージをuseChatSocketに渡す - 初期メッセージとして設定
        try {
          // ディープコピーして確実に新しい参照を作成
          const messagesCopy = JSON.parse(JSON.stringify(messageHistory.results));
          console.log('メッセージ設定前状態確認:', {
            現在のメッセージ数: messages.length,
            設定するメッセージ数: messagesCopy.length
          });
          
          // より単純な方法でメッセージを設定（一旦空にして、すぐに設定）
          setMessages([]);
          
          // requestAnimationFrameを使用して次の描画サイクルで設定
          requestAnimationFrame(() => {
            // メッセージを時系列順にソート（古いものが上、新しいものが下）
            messagesCopy.sort((a, b) => {
              const dateA = new Date(a.created_at || a.timestamp);
              const dateB = new Date(b.created_at || b.timestamp);
              return dateA - dateB;
            });
            
            setMessages(messagesCopy);
            console.log('メッセージが正常に設定されました:', messagesCopy.length);
            
            // メッセージの読み込みが完了したことをカスタムイベントで通知
            window.dispatchEvent(new CustomEvent('messages-loaded', { 
              detail: { channelId: channel.id, count: messagesCopy.length } 
            }));
          });
        } catch (setErr) {
          console.error('メッセージリスト設定エラー:', setErr);
        }
      }
      
      return messageHistory;
    } catch (err) {
      console.error('チャンネル選択エラー:', err);
      setError(`チャンネルの選択中にエラーが発生しました: ${err.message}`);
      return null;
    }
  }, [selectChannelSocket, loadMessages]);
  
  /**
   * メッセージを送信する
   * @param {string} content - メッセージ内容
   * @param {Object} options - 送信オプション
   * @returns {Promise<Object>} 送信結果
   */
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!content.trim() || !activeChannel) return null;
    
    const { files, parentMessageId, mentionedUserIds } = options;
    
    try {
      // APIに先にメッセージを保存して永続化を確実にする
      let apiResult = null;
      
      if (files && files.length > 0) {
        try {
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
          
          // APIでメッセージを保存
          apiResult = await chatApi.createMessage(formData);
          console.log('APIでメッセージを保存しました:', apiResult);
        } catch (apiErr) {
          console.error('APIでのメッセージ保存に失敗しました:', apiErr);
        }
      } else {
        // 通常のテキストメッセージの場合
        try {
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
          
          // APIでメッセージを保存
          apiResult = await chatApi.createMessage(messageData);
          console.log('APIでメッセージを保存しました:', apiResult);
        } catch (apiErr) {
          console.error('APIでのメッセージ保存に失敗しました:', apiErr);
        }
      }
      
      // APIでの保存が成功したら、Socket.IOでもメッセージを送信して即時反映
      if (apiResult && apiResult.data) {
        // API保存成功時はソケットで通知
        try {
          const socketResult = await sendMessageSocket(content);
          return {
            ...socketResult,
            apiSuccess: true,
            message: apiResult.data
          };
        } catch (socketErr) {
          console.warn('Socket.IOでの送信に失敗しましたが、APIでの保存は成功しました:', socketErr);
          return {
            status: 'partial_success',
            apiSuccess: true,
            message: apiResult.data
          };
        }
      } else {
        // API保存失敗時はSocket.IOのみで送信を試みる
        try {
          const socketResult = await sendMessageSocket(content);
          return socketResult;
        } catch (socketErr) {
          throw new Error('APIとSocket.IOの両方でメッセージ送信に失敗しました');
        }
      }
    } catch (err) {
      console.error('メッセージ送信エラー:', err);
      setError(`メッセージの送信中にエラーが発生しました: ${err.message}`);
      return null;
    }
  }, [activeChannel, sendMessageSocket]);
  
  /**
   * 新しいチャンネルを作成する
   * @param {Object} channelData - チャンネル情報
   * @returns {Promise<Object>} 作成結果
   */
  const createChannel = useCallback(async (channelData) => {
    try {
      // APIでチャンネルを作成
      const response = await chatApi.createChannel(channelData);
      
      // チャンネル一覧に追加
      setChannels(prev => [...prev, response.data]);
      
      return response.data;
    } catch (err) {
      console.error('チャンネル作成エラー:', err);
      setError('チャンネルの作成に失敗しました');
      return null;
    }
  }, []);
  
  /**
   * ダイレクトメッセージチャンネルを開始する
   * @param {number|string} userId - 相手ユーザーID
   * @returns {Promise<Object>} 作成結果
   */
  const startDirectMessage = useCallback(async (userId) => {
    try {
      // APIでダイレクトメッセージチャンネルを作成
      const response = await chatApi.createDirectMessageChannel(userId);
      
      // 既に存在しない場合のみ追加
      setDirectMessages(prev => {
        const exists = prev.some(dm => dm.id === response.data.id);
        if (exists) return prev;
        return [...prev, response.data];
      });
      
      return response.data;
    } catch (err) {
      console.error('ダイレクトメッセージ開始エラー:', err);
      setError('ダイレクトメッセージの開始に失敗しました');
      return null;
    }
  }, []);
  
  /**
   * メッセージを検索する
   * @param {number|string} workspaceId - ワークスペースID
   * @param {string} query - 検索キーワード
   * @param {Object} options - 検索オプション
   * @returns {Promise<Object>} 検索結果
   */
  const searchMessages = useCallback(async (workspaceId, query, options = {}) => {
    try {
      // APIでメッセージを検索
      const response = await chatApi.searchMessages(workspaceId, query, options);
      return response;
    } catch (err) {
      console.error('メッセージ検索エラー:', err);
      setError('メッセージの検索に失敗しました');
      return { results: [], count: 0 };
    }
  }, []);
  
  // ユーザー情報が変更されたときにチャンネル一覧を読み込む
  useEffect(() => {
    if (currentUser) {
      loadChannels();
    }
  }, [currentUser, loadChannels]);
  
  // アクティブチャンネルが変更されたときに未読カウントを更新
  useEffect(() => {
    if (!activeChannel) return;
    
    // メッセージが届いたとき、他のチャンネルの場合は未読カウントを増やす
    const handleNewMessage = (message) => {
      if (message.user && message.user.id !== currentUser?.id && 
          String(message.channel_id) !== String(activeChannel.id)) {
        
        setChannels(prev => prev.map(channel => {
          if (String(channel.id) === String(message.channel_id)) {
            return {
              ...channel,
              unread_count: (channel.unread_count || 0) + 1
            };
          }
          return channel;
        }));
        
        setDirectMessages(prev => prev.map(dm => {
          if (String(dm.id) === String(message.channel_id)) {
            return {
              ...dm,
              unread_count: (dm.unread_count || 0) + 1
            };
          }
          return dm;
        }));
      }
    };
    
    // メッセージ受信時の未読カウント処理を設定
    window.addEventListener('new-chat-message', (e) => handleNewMessage(e.detail));
    
    return () => {
      window.removeEventListener('new-chat-message', (e) => handleNewMessage(e.detail));
    };
  }, [activeChannel, currentUser]);
  
  /**
   * WebSocket接続を再確立する
   */
  const handleReconnect = useCallback(() => {
    try {
      // リソース不足エラーが発生する可能性を考慮して
      // 明示的な接続を最小限にする
      
      // 現在の接続状態をチェック
      if (isConnected) {
        console.log('既に接続済みのため再接続をスキップします');
        return true;
      }
      
      // 既に接続試行中かどうかをチェック
      const reconnectCount = window._socketReconnectCount || 0;
      window._socketReconnectCount = reconnectCount + 1;
      
      if (reconnectCount >= 3) {
        console.log('接続試行回数が上限に達したため、再接続をスキップします');
        
        // ユーザーに通知
        setError('チャットサーバーに接続できません。ページを再読み込みしてみてください。');
        
        // 10秒後にカウンターをリセット
        setTimeout(() => {
          window._socketReconnectCount = 0;
        }, 10000);
        
        return false;
      }
      
      // 既存のSocket.IO接続を解除して再接続
      disconnect();
      
      // 短い遅延後に接続試行
      setTimeout(() => {
        connect();
        
        // アクティブチャンネルがある場合は再選択
        if (activeChannel && isConnected) {
          setTimeout(() => {
            selectChannelSocket(activeChannel);
          }, 1000);
        }
      }, 300);
      
      return true;
    } catch (err) {
      console.error('WebSocket再接続エラー:', err);
      setError('チャットサーバーへの接続に失敗しました。ローカルメッセージのみ表示しています。');
      return false;
    }
  }, [activeChannel, connect, disconnect, selectChannelSocket, isConnected]);

  // コンテキスト値
  const value = {
    // チャンネル一覧
    channels,
    directMessages,
    
    // アクティブチャンネルと関連状態
    activeChannel,
    messages,
    typingUsers,
    
    // 読み込み状態
    loading,
    error,
    
    // 接続状態
    isConnected,
    connectionAttempts: 0, // 接続試行回数（将来的に実装）
    
    // チャンネル管理関数
    loadChannels,
    loadMessages,
    selectChannel,
    createChannel,
    startDirectMessage,
    
    // メッセージ関連関数
    sendMessage,
    sendTypingIndicator,
    sendReadStatus,
    searchMessages,
    
    // 接続管理関数
    connect,
    disconnect,
    handleReconnect
  };
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

/**
 * チャットコンテキストを使用するためのフック
 */
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;