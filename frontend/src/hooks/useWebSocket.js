import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  const { 
    onOpen,
    onMessage,
    onClose,
    onError,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
    automaticOpen = true,
  } = options;
  
  // Current reconnect attempt count
  const reconnectCount = useRef(0);
  
  // Connect function
  const connect = useCallback(() => {
    // Don't attempt to connect if no URL
    if (!url) {
      console.error('Cannot connect: WebSocket URL is undefined or null');
      return;
    }
    
    // WebSocket接続の準備 - 複数の接続方法を用意
    if (!url) {
      console.error('❌ WebSocket URL が指定されていません');
      return;
    }
    
    // URLはそのまま使用
    let wsUrl = url;
    
    // URLからチャンネルIDを抽出
    let channelId = '1'; // デフォルト値
    try {
      const match = url.match(/\/chat\/(\d+)\/?$/);
      if (match && match[1]) {
        channelId = match[1];
      }
    } catch (e) {
      console.warn('⚠️ チャンネルID抽出エラー:', e);
    }

    // 代替接続URLのリスト（接続失敗時に順番に試行）
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const fallbackUrls = [
      // 現在のURLをそのまま使用（最初の試行）
      wsUrl,
      
      // プロキシ経由での接続
      `${protocol}//${window.location.host}/ws/chat/${channelId}/`,
      
      // 直接WebSocketサーバーに接続
      `${protocol}//localhost:8001/ws/chat/${channelId}/`,
      
      // IPアドレスで直接接続
      `${protocol}//127.0.0.1:8001/ws/chat/${channelId}/`
    ];
    
    // グローバル変数に保存（デバッグ用）
    window.wsConnectionOptions = {
      primary: wsUrl,
      fallbacks: fallbackUrls,
      channelId,
      timestamp: new Date().toISOString()
    };
    
    console.log('🔌 WebSocket接続開始:', wsUrl);
    console.log('🔄 フォールバックオプション:', fallbackUrls);
    
    console.log(`Connecting to WebSocket URL: ${wsUrl}`);
    
    // 既存の接続を閉じる（ある場合）
    try {
      if (websocketRef.current) {
        const ws = websocketRef.current;
        console.log(`Closing existing WebSocket connection`);
        
        // コールバックをnull設定して、現在の処理が再び呼ばれないようにする
        if (ws.onclose) ws.onclose = null;
        if (ws.onerror) ws.onerror = null;
        if (ws.onmessage) ws.onmessage = null;
        if (ws.onopen) ws.onopen = null;
        
        // 既存の接続を閉じる
        ws.close();
        
        // 参照をすぐにクリア
        websocketRef.current = null;
      }
    } catch (e) {
      console.warn('Error during WebSocket cleanup:', e);
      websocketRef.current = null;
    }
    
    // 新しい接続を作成（100ms待機して既存接続の解放を確保）
    setTimeout(() => {
      try {
        console.log(`Creating new WebSocket connection to ${wsUrl}`);
        
        // タイムアウト処理の設定
        const connectionTimeout = setTimeout(() => {
          console.error('WebSocket connection timeout after 8 seconds');
          if (websocketRef.current) {
            try {
              websocketRef.current.close();
            } catch (err) {
              console.warn('Error closing timed out connection:', err);
            }
            websocketRef.current = null;
            setError(new Error('WebSocket connection timeout'));
            
            // タイムアウト後に再接続を開始 - フォールバックURLを使用
            if (reconnectCount.current < reconnectAttempts) {
              reconnectCount.current += 1;
              console.log(`⏱️ 接続タイムアウト。再接続を試みます (${reconnectCount.current}/${reconnectAttempts})...`);
              
              // フォールバックURLを順番に試す
              try {
                if (window.wsConnectionOptions && window.wsConnectionOptions.fallbacks) {
                  const fallbacks = window.wsConnectionOptions.fallbacks;
                  const fallbackIndex = reconnectCount.current % fallbacks.length;
                  const fallbackUrl = fallbacks[fallbackIndex];
                  
                  console.log(`🔄 フォールバックURL使用: ${fallbackUrl} (${fallbackIndex + 1}/${fallbacks.length})`);
                  
                  // グローバル変数でURLを上書き（次回接続用）
                  wsUrl = fallbackUrl;
                }
              } catch (err) {
                console.error('❌ フォールバックURL選択エラー:', err);
              }
              
              reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
            }
          }
        }, 8000); // 8秒のタイムアウト

        // WebSocket接続を作成
        websocketRef.current = new WebSocket(wsUrl);
        
        // 接続完了ハンドラ
        websocketRef.current.onopen = (event) => {
          clearTimeout(connectionTimeout);
          
          // 念のためwebsocketRef.currentがnullではないことを確認
          if (!websocketRef.current) {
            console.error('WebSocket reference is null in onopen handler');
            return;
          }
          
          console.log(`WebSocket Connected successfully to ${url}`);
          setIsConnected(true);
          setError(null);
          reconnectCount.current = 0;
          
          // 接続成功時にpingメッセージを送信（接続テスト用）
          setTimeout(() => {
            try {
              if (websocketRef.current) {
                const pingMessage = JSON.stringify({
                  type: 'ping',
                  data: { timestamp: new Date().toISOString() }
                });
                websocketRef.current.send(pingMessage);
                console.log('Initial ping sent to test connection');
              }
            } catch (e) {
              console.warn('Failed to send initial ping message', e);
            }
          }, 500);
          
          if (onOpen) onOpen(event);
        };
        
        // メッセージ受信ハンドラ - 接続状態を積極的に更新
        websocketRef.current.onmessage = (event) => {
          // 接続状態をすぐに更新（メッセージを受信できている = 接続済み）
          setIsConnected(true);
          setError(null);
          
          try {
            // データがある場合のみ処理
            if (event.data) {
              let data;
              try {
                data = JSON.parse(event.data);
              } catch (parseErr) {
                console.error('❌ WebSocketメッセージ解析エラー:', parseErr);
                console.log('受信データ:', event.data);
                // 解析できなくても接続状態は更新
                setIsConnected(true);
                return;
              }
              
              console.log('📩 WebSocketデータ受信:', data);
              
              // コンポーネント間で共有されるメッセージ履歴を更新
              if (data.type !== 'ping' && data.type !== 'pong') {
                setMessages(prevMessages => [...prevMessages, data]);
              }
              
              // 接続確立メッセージの処理 - 最も重要
              if (data.type === 'connection_established') {
                console.log('🎉 WebSocket接続確立:', data);
                
                // UI状態を更新 - ステータス更新を複数の場所で強制
                setIsConnected(true);
                setError(null);
                
                // ローカル接続フラグも設定（画面描画に使用）
                window.isWebSocketConnected = true;
                localStorage.setItem('websocket_connected', 'true');
                localStorage.setItem('websocket_last_connected', new Date().toISOString());
                
                // システムメッセージとして表示
                setMessages(prevMessages => [
                  ...prevMessages, 
                  {
                    id: `system-${Date.now()}`,
                    type: 'system',
                    content: '✅ WebSocket接続が確立されました',
                    timestamp: new Date().toISOString()
                  }
                ]);
                
                // グローバルイベントを発行
                try {
                  const event = new CustomEvent('websocket-connected', { 
                    detail: { 
                      connectionId: data.connection_id || 'unknown',
                      timestamp: new Date().toISOString(),
                      success: true
                    } 
                  });
                  window.dispatchEvent(event);
                  console.log('📢 WebSocket接続イベント発行');
                  
                  // React開発ツールでも確認できるよう状態更新
                  setTimeout(() => setIsConnected(true), 100);
                  setTimeout(() => setError(null), 100);
                } catch (evtErr) {
                  console.warn('❌ イベント発行エラー:', evtErr);
                }
                
                // 確認応答を返信
                try {
                  if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                    websocketRef.current.send(JSON.stringify({
                      type: 'connection_ack',
                      data: { 
                        timestamp: new Date().toISOString(), 
                        status: 'received',
                        client_info: { 
                          url: window.location.href,
                          userAgent: navigator.userAgent
                        }
                      }
                    }));
                    console.log('✅ 接続確認応答送信');
                  }
                } catch (err) {
                  console.warn('❌ 確認応答エラー:', err);
                }
              }
              
              // pingメッセージへの応答
              if (data.type === 'ping') {
                console.log('🏓 Ping受信:', data);
                
                // 接続状態を更新（pingが来ている = 接続は生きている）
                setIsConnected(true);
                setError(null);
                window.isWebSocketConnected = true;
                
                // Pongで応答
                try {
                  if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                    websocketRef.current.send(JSON.stringify({
                      type: 'pong',
                      data: { 
                        timestamp: new Date().toISOString(),
                        received: data.timestamp,
                        client_status: 'healthy'
                      }
                    }));
                    console.log('✅ Pong応答送信');
                  }
                } catch (err) {
                  console.warn('❌ Pong応答エラー:', err);
                }
              }
              
              if (onMessage) onMessage(data);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };
        
        // 接続切断ハンドラ
        websocketRef.current.onclose = (event) => {
          console.log('WebSocket Disconnected', event);
          setIsConnected(false);
          
          if (onClose) onClose(event);
          
          // 再接続を試みる - フォールバックURLも使用
          if (reconnectCount.current < reconnectAttempts) {
            reconnectCount.current += 1;
            
            // フォールバックURLを試す
            try {
              if (window.wsConnectionOptions && window.wsConnectionOptions.fallbacks) {
                const fallbacks = window.wsConnectionOptions.fallbacks;
                const fallbackIndex = reconnectCount.current % fallbacks.length;
                
                // フォールバックURLを選択
                const fallbackUrl = fallbacks[fallbackIndex];
                console.log(`🔄 切断後の再接続: フォールバックURL使用 ${fallbackUrl} (${fallbackIndex + 1}/${fallbacks.length})`);
                
                // URL変数を書き換えて次回の接続に使用
                url = fallbackUrl;
              }
            } catch (err) {
              console.error('❌ フォールバックURL選択エラー:', err);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`🔄 再接続試行 ${reconnectCount.current}/${reconnectAttempts}...`);
              connect();
            }, reconnectInterval);
          } else {
            setError(new Error('最大再接続試行回数に達しました'));
            console.error('❌ WebSocket接続失敗: 最大再接続試行回数に達しました');
          }
        };
        
        // エラーハンドラ
        websocketRef.current.onerror = (event) => {
          console.error('WebSocket Error:', event);
          setError(new Error('WebSocket connection error'));
          
          if (onError) onError(event);
        };
      } catch (err) {
        console.error('Error creating WebSocket connection:', err);
        setError(err);
      }
    }, 100);
  }, [url, onOpen, onMessage, onClose, onError, reconnectInterval, reconnectAttempts]);
  
  // メッセージ送信関数
  const sendMessage = useCallback((data) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      try {
        console.log('Sending WebSocket message:', data);
        // データがオブジェクトでまだシリアライズされていない場合
        const messageStr = typeof data === 'string' ? data : JSON.stringify(data);
        websocketRef.current.send(messageStr);
        return true;
      } catch (err) {
        console.error('Error serializing or sending WebSocket message:', err);
        return false;
      }
    }
    console.warn('Cannot send message: WebSocket not connected (readyState: ' + 
      (websocketRef.current ? websocketRef.current.readyState : 'undefined') + ')');
    return false;
  }, []);
  
  // 切断関数
  const disconnect = useCallback(() => {
    if (websocketRef.current) {
      console.log('Manually disconnecting WebSocket');
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);
  
  // URL変更時に接続/切断
  useEffect(() => {
    if (automaticOpen && url) {
      connect();
    } else if (!url && websocketRef.current) {
      disconnect();
    }
    
    // コンポーネントのアンマウント時や URL 変更時にクリーンアップ
    return () => {
      disconnect();
    };
  }, [url, automaticOpen, connect, disconnect]);
  
  return {
    isConnected,
    error,
    messages,
    sendMessage,
    connect,
    disconnect
  };
};

export default useWebSocket;