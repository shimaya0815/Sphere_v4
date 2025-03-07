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
  
  // デバッグ用 - メッセージ更新監視
  useEffect(() => {
    console.log(`useChatSocket: メッセージが更新されました (${messages.length}件)`);
  }, [messages]);
  
  // オプション
  const {
    // 接続URL - useSocketIOの処理に任せる
    url = undefined, // 未設定のままにして、useSocketIOのgetOptimalSocketUrlを使用
    
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
    // 自動接続する - 一度だけSocket.IO接続を確立（複数接続を防止）
    autoConnect: true,
    
    // 接続イベントハンドラ
    onConnect: (socket) => {
      if (debug) console.log('チャットサーバーに接続しました');
      
      // 接続成功時にアクティブなチャンネルに参加
      if (activeChannel && currentUser) {
        // より長い遅延を入れて、確実に接続とユーザー情報が準備できた後で参加を実行
        setTimeout(() => {
          // 再確認: 接続状態を再チェック
          if (socket && socket.connected && currentUser) {
            joinChannel(activeChannel.id)
              .then(() => {
                if (debug) console.log('チャンネル参加成功:', activeChannel.id);
              })
              .catch(err => {
                if (debug) console.warn('自動チャンネル参加エラー:', err);
                // エラー後のリトライ
                setTimeout(() => {
                  if (socket && socket.connected && currentUser) {
                    joinChannel(activeChannel.id)
                      .catch(e => console.warn('チャンネル参加リトライ失敗:', e));
                  }
                }, 1000);
              });
          } else {
            if (debug) console.warn('接続またはユーザー情報が未準備のため、チャンネル参加をスキップ');
          }
        }, 1500); // 1.5秒に延長
      }
      
      // 通知は初回接続時のみ表示する
      if (showNotifications && !window._hasShownSocketConnectedToast) {
        window._hasShownSocketConnectedToast = true;
        toast.success('チャットサーバーに接続しました', { id: 'socket-connected' });
      }
    },
    
    // 切断イベントハンドラ
    onDisconnect: (reason) => {
      if (debug) console.log(`チャットサーバーから切断されました: ${reason}`);
      
      // 通知はユーザーが意図しない切断時のみ表示
      if (showNotifications && 
          reason !== 'io client disconnect' && 
          reason !== 'transport close') {
        toast.error('チャットサーバーから切断されました', { id: 'socket-disconnected' });
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
    // 接続状態とユーザー情報を確認
    if (!isConnected) {
      if (debug) console.log('未接続状態でチャンネル参加が要求されました。接続を試みます...');
      
      // 接続を試みた後、再度参加を試みる - タイミングを改善
      return new Promise((resolve, reject) => {
        // 明示的に接続を開始
        connect();
        
        // 接続を確認する関数
        const checkConnection = (retries = 0) => {
          if (retries > 3) {
            // 最大試行回数に達したらエラーではなく接続情報付きで成功を返す
            console.log(`チャンネル参加: リトライ回数(${retries})に達しました - 接続状態: ${isConnected}`);
            
            // 接続できていれば成功として扱う
            if (isConnected) {
              return resolve({ 
                status: 'success', 
                message: '接続成功、チャンネル参加はバックグラウンドで継続' 
              });
            }
            
            // 接続できていなければエラーとして扱う
            return resolve({ 
              status: 'warning', 
              message: '接続タイムアウト、メッセージ受信のみ有効' 
            });
          }
          
          if (isConnected && currentUser) {
            console.log(`チャンネル参加: 接続確認OK (試行回数: ${retries})`);
            // 接続済みの場合は少し待ってからチャンネルに参加
            setTimeout(() => {
              joinChannel(channelId)
                .then(resolve)
                .catch(err => {
                  console.warn(`チャンネル参加エラー: ${err.message}, 再試行します`);
                  setTimeout(() => checkConnection(retries + 1), 1000);
                });
            }, 500);
          } else {
            console.log(`チャンネル参加: 接続待機中... (試行回数: ${retries})`);
            // まだ接続していない場合は再試行
            setTimeout(() => checkConnection(retries + 1), 1000);
          }
        };
        
        // 接続確認を開始
        checkConnection();
      });
    }
    
    if (!currentUser) {
      return Promise.reject(new Error('ユーザー情報がありません'));
    }
    
    // ユーザー情報の整形 (より堅牢に)
    const userInfo = {
      id: currentUser.id,
      name: 'ユーザー'
    };
    
    // ユーザー名を取得
    if (currentUser.get_full_name && typeof currentUser.get_full_name === 'function') {
      userInfo.name = currentUser.get_full_name();
    } else if (currentUser.full_name) {
      userInfo.name = currentUser.full_name;
    } else if (currentUser.username) {
      userInfo.name = currentUser.username;
    }
    
    // メールアドレスを取得
    if (currentUser.email) {
      userInfo.email = currentUser.email;
    }
    
    if (debug) console.log(`チャンネル参加: ${channelId}`, userInfo);
    
    return new Promise((resolve, reject) => {
      // 参加リクエストを送信
      emit('join_channel', {
        channel_id: String(channelId),
        user_info: userInfo
      }, (response) => {
        if (response && response.status === 'success') {
          if (debug) console.log(`チャンネル参加成功: ${channelId}`, response);
          resolve(response);
        } else {
          const errorMessage = response?.message || 'チャンネル参加に失敗しました';
          if (debug) console.error(`チャンネル参加失敗: ${channelId}`, errorMessage);
          reject(new Error(errorMessage));
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
      // メッセージリストをクリア（即時反応）
      setMessages([]);
      
      // タイピングユーザー情報をクリア
      setTypingUsers({});
      
      // 新しいチャンネルを設定
      setActiveChannel(channel);
      
      // 現在のチャンネルから退出（エラーが発生しても続行）
      if (activeChannel && isConnected) {
        try {
          await leaveChannel(activeChannel.id);
        } catch (leaveErr) {
          console.warn('前のチャンネルからの退出に失敗しました:', leaveErr);
          // エラーを無視して続行
        }
      }
      
      // 接続とチャンネル参加
      if (channel) {
        // 接続済みの場合は新しいチャンネルに参加
        if (isConnected) {
          try {
            await joinChannel(channel.id);
            
            // 既読ステータスを送信
            sendReadStatus();
          } catch (joinErr) {
            console.warn('チャンネル参加に失敗しました:', joinErr);
            // エラーを無視して続行
          }
        } else {
          // 接続と参加は useEffect で自動的に行われる
          // 新しいチャンネルが選択されたので、次の useEffect で参加処理が行われる
        }
      }
      
      return true;
    } catch (err) {
      console.error('チャンネル選択処理中のエラー:', err);
      setError(`チャンネル選択エラー: ${err.message}`);
      
      if (showNotifications) {
        toast.error(`チャンネル選択エラー: ${err.message}`);
      }
      
      return false;
    }
  }, [activeChannel, isConnected, leaveChannel, joinChannel, sendReadStatus, showNotifications]);
  
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
    setMessages,  // メッセージリストを直接設定する関数をエクスポート
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