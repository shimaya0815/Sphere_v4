import { useState, useCallback, useEffect } from 'react';
import useSocketIO from './useSocketIO';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * チャット機能に特化したSocket.IO接続を管理するカスタムフック
 * @param {Object} options - 設定オプション
 * @returns {Object} チャット関連の状態と関数
 */
const useChatSocket = (options = {}) => {
  const { currentUser } = useAuth();
  
  // 状態管理
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [error, setError] = useState(null);
  
  // オプション
  const {
    // 接続URL
    url = 'http://localhost:8001',
    
    // 通知を表示するかどうか
    showNotifications = true,
    
    // デバッグモード
    debug = process.env.NODE_ENV === 'development',
  } = options;
  
  // Socket.IO接続を管理するフックを使用
  const {
    isConnected,
    emit,
    on,
    connect,
    disconnect
  } = useSocketIO({
    url,
    debug,
    // 自動接続しない（チャンネル選択時に接続するため）
    autoConnect: false,
    
    // 接続イベントハンドラ
    onConnect: (socket) => {
      if (debug) console.log('チャットサーバーに接続しました');
      
      // 接続成功時にアクティブなチャンネルに参加
      if (activeChannel && currentUser) {
        joinChannel(activeChannel.id);
      }
      
      if (showNotifications) {
        toast.success('チャットサーバーに接続しました');
      }
    },
    
    // 切断イベントハンドラ
    onDisconnect: (reason) => {
      if (debug) console.log(`チャットサーバーから切断されました: ${reason}`);
      
      if (showNotifications && reason !== 'io client disconnect') {
        toast.error('チャットサーバーから切断されました');
      }
    },
    
    // エラーイベントハンドラ
    onError: (err) => {
      setError(`接続エラー: ${err.message}`);
      
      if (showNotifications) {
        toast.error(`接続エラー: ${err.message}`);
      }
    },
    
    // 再接続イベントハンドラ
    onReconnect: (socket) => {
      if (debug) console.log('チャットサーバーに再接続しました');
      
      // 再接続成功時にアクティブなチャンネルに再参加
      if (activeChannel && currentUser) {
        joinChannel(activeChannel.id);
      }
      
      if (showNotifications) {
        toast.success('チャットサーバーに再接続しました');
      }
    }
  });
  
  /**
   * チャンネルに参加する
   * @param {string|number} channelId - チャンネルID
   * @returns {Promise<Object>} 参加結果
   */
  const joinChannel = useCallback((channelId) => {
    if (!isConnected || !currentUser) {
      // 接続していない場合は接続を試みる
      if (!isConnected) {
        connect();
      }
      return Promise.reject(new Error('未接続またはユーザー情報がありません'));
    }
    
    if (debug) console.log(`チャンネル参加: ${channelId}`);
    
    return new Promise((resolve, reject) => {
      // 参加リクエストを送信
      emit('join_channel', {
        channel_id: String(channelId),
        user_info: {
          id: currentUser.id,
          name: currentUser.get_full_name ? currentUser.get_full_name() : 'ユーザー',
          email: currentUser.email
        }
      }, (response) => {
        if (response && response.status === 'success') {
          resolve(response);
        } else {
          reject(new Error(response?.message || 'チャンネル参加に失敗しました'));
        }
      });
    });
  }, [isConnected, currentUser, emit, connect, debug]);
  
  /**
   * チャンネルから退出する
   * @param {string|number} channelId - チャンネルID
   * @returns {Promise<Object>} 退出結果
   */
  const leaveChannel = useCallback((channelId) => {
    if (!isConnected) {
      return Promise.reject(new Error('未接続です'));
    }
    
    if (debug) console.log(`チャンネル退出: ${channelId}`);
    
    return new Promise((resolve, reject) => {
      // 退出リクエストを送信
      emit('leave_channel', {
        channel_id: String(channelId)
      }, (response) => {
        if (response && response.status === 'success') {
          resolve(response);
        } else {
          reject(new Error(response?.message || 'チャンネル退出に失敗しました'));
        }
      });
    });
  }, [isConnected, emit, debug]);
  
  /**
   * メッセージを送信する
   * @param {string} content - メッセージ内容
   * @param {Object} options - 追加オプション
   * @returns {Promise<Object>} 送信結果
   */
  const sendMessage = useCallback((content, options = {}) => {
    if (!isConnected || !activeChannel) {
      return Promise.reject(new Error('未接続またはアクティブなチャンネルがありません'));
    }
    
    // 送信するメッセージデータを作成
    const messageData = {
      channel_id: String(activeChannel.id),
      content: content.trim(),
      timestamp: new Date().toISOString()
    };
    
    // 一時的なメッセージIDを生成
    const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    messageData.message_id = tempId;
    
    // ローカルUIに即座に反映するためのメッセージオブジェクト
    const tempMessage = {
      type: 'chat_message',
      message_id: tempId,
      channel_id: String(activeChannel.id),
      content: content.trim(),
      user: {
        id: currentUser?.id,
        name: currentUser?.get_full_name ? currentUser.get_full_name() : 'ユーザー'
      },
      timestamp: messageData.timestamp,
      pending: true // 送信中フラグ
    };
    
    // 楽観的UIアップデート（即座にメッセージを表示）
    setMessages(prev => [...prev, tempMessage]);
    
    if (debug) console.log(`メッセージ送信: ${content.substring(0, 20)}...`);
    
    return new Promise((resolve, reject) => {
      // メッセージ送信リクエスト
      emit('chat_message', messageData, (response) => {
        if (response && response.status === 'success') {
          // 送信成功時に一時メッセージを更新
          setMessages(prev => 
            prev.map(msg => 
              msg.message_id === tempId 
                ? { ...msg, pending: false, message_id: response.message_id || tempId }
                : msg
            )
          );
          resolve(response);
        } else {
          // 送信失敗時に一時メッセージにエラーフラグを設定
          setMessages(prev => 
            prev.map(msg => 
              msg.message_id === tempId 
                ? { ...msg, pending: false, error: true }
                : msg
            )
          );
          
          const error = new Error(response?.message || 'メッセージ送信に失敗しました');
          setError(error.message);
          reject(error);
          
          if (showNotifications) {
            toast.error('メッセージ送信に失敗しました');
          }
        }
      });
    });
  }, [isConnected, activeChannel, currentUser, emit, debug, showNotifications]);
  
  /**
   * タイピングインジケーターを送信する
   * @param {boolean} isTyping - 入力中かどうか
   */
  const sendTypingIndicator = useCallback((isTyping = true) => {
    if (!isConnected || !activeChannel) return;
    
    emit('typing_indicator', {
      channel_id: String(activeChannel.id),
      is_typing: isTyping
    });
  }, [isConnected, activeChannel, emit]);
  
  /**
   * 既読ステータスを送信する
   */
  const sendReadStatus = useCallback(() => {
    if (!isConnected || !activeChannel) return;
    
    emit('read_status', {
      channel_id: String(activeChannel.id),
      timestamp: new Date().toISOString()
    });
  }, [isConnected, activeChannel, emit]);
  
  /**
   * チャンネルを選択する
   * @param {Object} channel - チャンネル情報
   */
  const selectChannel = useCallback(async (channel) => {
    try {
      // 現在のチャンネルから退出
      if (activeChannel && isConnected) {
        await leaveChannel(activeChannel.id);
      }
      
      // 新しいチャンネルを設定
      setActiveChannel(channel);
      
      // メッセージリストをクリア
      setMessages([]);
      
      // タイピングユーザー情報をクリア
      setTypingUsers({});
      
      // 接続していない場合は接続
      if (!isConnected) {
        connect();
      } else if (channel) {
        // 接続済みの場合は新しいチャンネルに参加
        await joinChannel(channel.id);
      }
      
      // 既読ステータスを送信
      if (isConnected && channel) {
        sendReadStatus();
      }
      
      return true;
    } catch (err) {
      setError(`チャンネル選択エラー: ${err.message}`);
      
      if (showNotifications) {
        toast.error(`チャンネル選択エラー: ${err.message}`);
      }
      
      return false;
    }
  }, [activeChannel, isConnected, leaveChannel, connect, joinChannel, sendReadStatus, showNotifications]);
  
  // Socket.IOイベントリスナーを設定
  useEffect(() => {
    if (!isConnected) return;
    
    // メッセージ受信ハンドラー
    const handleChatMessage = (data) => {
      if (debug) console.log('メッセージ受信:', data);
      
      // メッセージをメッセージリストに追加（重複チェック）
      setMessages(prev => {
        // 既に同じIDのメッセージがあるかチェック
        const exists = prev.some(msg => msg.message_id === data.message_id);
        if (exists) return prev;
        
        return [...prev, data];
      });
      
      // 自分以外のメッセージかつ通知が有効な場合は通知
      if (
        showNotifications && 
        data.user && 
        data.user.id !== currentUser?.id &&
        activeChannel && 
        String(activeChannel.id) === data.channel_id
      ) {
        toast(`${data.user.name || 'ユーザー'}: ${data.content.substring(0, 30)}${data.content.length > 30 ? '...' : ''}`, {
          duration: 3000,
        });
      }
    };
    
    // タイピングインジケーターハンドラー
    const handleTyping = (data) => {
      if (
        data.user && 
        data.user.id !== currentUser?.id &&
        activeChannel && 
        String(activeChannel.id) === data.channel_id
      ) {
        if (data.is_typing) {
          // タイピング開始
          setTypingUsers(prev => ({
            ...prev,
            [data.user.id]: {
              ...data.user,
              timestamp: data.timestamp
            }
          }));
          
          // 5秒後に自動的に削除（タイピング停止がなかった場合）
          setTimeout(() => {
            setTypingUsers(prev => {
              const newState = { ...prev };
              delete newState[data.user.id];
              return newState;
            });
          }, 5000);
        } else {
          // タイピング停止
          setTypingUsers(prev => {
            const newState = { ...prev };
            delete newState[data.user.id];
            return newState;
          });
        }
      }
    };
    
    // ユーザー参加ハンドラー
    const handleUserJoined = (data) => {
      if (debug) console.log('ユーザー参加:', data);
      
      if (
        showNotifications && 
        data.user_info && 
        data.user_info.id !== currentUser?.id &&
        activeChannel && 
        String(activeChannel.id) === data.channel_id
      ) {
        toast.success(`${data.user_info.name || 'ユーザー'} がチャンネルに参加しました`);
      }
    };
    
    // ユーザー退出ハンドラー
    const handleUserLeft = (data) => {
      if (debug) console.log('ユーザー退出:', data);
      
      if (
        showNotifications && 
        data.user_info && 
        data.user_info.id !== currentUser?.id &&
        activeChannel && 
        String(activeChannel.id) === data.channel_id
      ) {
        toast.info(`${data.user_info.name || 'ユーザー'} がチャンネルから退出しました`);
      }
    };
    
    // イベントリスナーを登録
    const unsubscribeMessage = on('chat_message', handleChatMessage);
    const unsubscribeTyping = on('typing', handleTyping);
    const unsubscribeUserJoined = on('user_joined', handleUserJoined);
    const unsubscribeUserLeft = on('user_left', handleUserLeft);
    
    // クリーンアップ時にリスナーを解除
    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
      unsubscribeUserJoined();
      unsubscribeUserLeft();
    };
  }, [isConnected, on, activeChannel, currentUser, debug, showNotifications]);
  
  // コンポーネントアンマウント時の処理
  useEffect(() => {
    // 明示的な切断処理を行わない（リソース枯渇問題を防ぐ）
    // Socket.IOの自動切断に任せる
    return () => {};
  }, []);
  
  // 公開インターフェース
  return {
    // 状態
    isConnected,
    activeChannel,
    messages,
    typingUsers,
    error,
    
    // チャンネル管理
    selectChannel,
    joinChannel,
    leaveChannel,
    
    // メッセージ送信
    sendMessage,
    sendTypingIndicator,
    sendReadStatus,
    
    // 接続管理
    connect,
    disconnect
  };
};

export default useChatSocket;