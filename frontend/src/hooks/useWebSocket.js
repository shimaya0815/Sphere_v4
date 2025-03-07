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
    let resourceType = 'chat'; // デフォルトの種類
    
    try {
      // /ws/{type}/{id}/形式のURLを解析
      const matchFull = url.match(/\/ws\/([^\/]+)\/(\d+)\/?$/);
      // /{type}/{id}/形式のURLも解析
      const matchSimple = url.match(/\/([^\/]+)\/(\d+)\/?$/);
      
      if (matchFull && matchFull[1] && matchFull[2]) {
        resourceType = matchFull[1];
        channelId = matchFull[2];
        console.log(`📌 URL解析: タイプ=${resourceType}, ID=${channelId} (フルパス形式)`);
      } else if (matchSimple && matchSimple[1] && matchSimple[2]) {
        resourceType = matchSimple[1];
        channelId = matchSimple[2];
        console.log(`📌 URL解析: タイプ=${resourceType}, ID=${channelId} (シンプル形式)`);
      } else {
        console.warn('⚠️ URL形式が認識できないため、デフォルト値を使用します');
      }
    } catch (e) {
      console.warn('⚠️ チャンネルID抽出エラー:', e);
    }

    // 複数の接続方法を準備（優先度順）
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // 代替接続URLのリスト（接続失敗時に順番に試行）
    const fallbackUrls = [
      // 1. URLがws://またはwss://で始まる場合はそのまま使用
      wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://') ? wsUrl : null,
      
      // 2. フルパスを構築（/ws/プレフィックス付き）- プロキシ経由の推奨方法
      `${protocol}//${window.location.host}/ws/${resourceType}/${channelId}/`,
      
      // 3. フルパスを構築（/wsプレフィックスなし）- 直接WebSocketサーバーへの接続試行
      `${protocol}//${window.location.host}/${resourceType}/${channelId}/`,
      
      // 4. 直接WebSocketサーバーに接続（開発環境用）
      `${protocol}//localhost:8001/ws/${resourceType}/${channelId}/`,
      
      // 5. IPアドレスで直接接続（フォールバック）
      `${protocol}//127.0.0.1:8001/ws/${resourceType}/${channelId}/`
    ].filter(Boolean); // nullの項目を除外
    
    // 重複しているURLを除外
    const uniqueFallbackUrls = [...new Set(fallbackUrls)];
    
    // 最終的なURLはリストの最初の項目
    wsUrl = uniqueFallbackUrls[0];
    
    // グローバル変数に保存（デバッグ用）
    window.wsConnectionOptions = {
      primary: wsUrl,
      fallbacks: uniqueFallbackUrls,
      resourceType,
      channelId,
      timestamp: new Date().toISOString(),
      clientInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };
    
    console.log('🔌 WebSocket接続開始:', wsUrl);
    console.log('🔄 フォールバックオプション:', uniqueFallbackUrls);
    
    console.log(`Connecting to WebSocket URL: ${wsUrl}`);
    
    // WebSocket接続クリーンアップユーティリティ関数
    const cleanupWebSocket = (ws) => {
      if (!ws) return;
      
      console.log(`🧹 既存のWebSocket接続をクリーンアップ中...`);
      
      // コールバックをnull設定して、現在の処理が再び呼ばれないようにする
      if (ws.onclose) ws.onclose = null;
      if (ws.onerror) ws.onerror = null;
      if (ws.onmessage) ws.onmessage = null;
      if (ws.onopen) ws.onopen = null;
      
      // 接続状態に応じた処理
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          console.log(`🔌 WebSocket接続を明示的に閉じます (readyState=${ws.readyState})`);
          ws.close(1000, "Client initiated disconnect - new connection attempt");
        } else {
          console.log(`👍 WebSocket接続は既に閉じられています (readyState=${ws.readyState})`);
        }
      } catch (err) {
        console.warn('⚠️ WebSocket接続クローズ中のエラー:', err);
      }
      
      return null; // 参照をクリアするためnullを返す
    };
    
    // 既存の接続を閉じる（ある場合）
    try {
      if (websocketRef.current) {
        console.log(`🔍 既存のWebSocket接続を閉じています...`);
        websocketRef.current = cleanupWebSocket(websocketRef.current);
      }
      
      // ローカルストレージから古いWebSocket接続の参照をクリア
      localStorage.removeItem('websocket_connected');
      
      // ブラウザの全体的なWebSocketリソースが枯渇している可能性があるため、
      // ガベージコレクタを積極的に促す（間接的な方法）
      setTimeout(() => {
        const memoryCleanupArray = new Array(10000).fill(0);
        memoryCleanupArray.length = 0;
      }, 10);
    } catch (e) {
      console.warn('⚠️ WebSocket接続クリーンアップ中のエラー:', e);
      websocketRef.current = null;
    }
    
    // 新しい接続を作成（200ms待機して既存接続の解放を確保）
    setTimeout(() => {
      try {
        // 既に接続が始まっていないことを確認
        if (websocketRef.current) {
          console.warn('⚠️ 既にWebSocket接続が存在します。重複接続を防止します。');
          return;
        }
        
        console.log(`🔄 WebSocket接続を作成中: ${wsUrl}`);
        
        // タイムアウト処理の設定 - 短めに（5秒）
        const connectionTimeout = setTimeout(() => {
          console.error('⏱️ WebSocket接続タイムアウト（5秒経過）');
          
          if (websocketRef.current) {
            try {
              console.log('🛑 タイムアウトのため接続を閉じています...');
              websocketRef.current = cleanupWebSocket(websocketRef.current);
              setError(new Error('WebSocket接続タイムアウト'));
            } catch (err) {
              console.warn('⚠️ タイムアウト接続クローズ中のエラー:', err);
              websocketRef.current = null;
            }
            
            // タイムアウト後に再接続を開始 - フォールバックURLを使用
            if (reconnectCount.current < reconnectAttempts) {
              reconnectCount.current += 1;
              console.log(`🔁 接続タイムアウト。再接続を試みます (${reconnectCount.current}/${reconnectAttempts})...`);
              
              // フォールバックURLを順番に試す
              try {
                if (window.wsConnectionOptions && window.wsConnectionOptions.fallbacks) {
                  const fallbacks = window.wsConnectionOptions.fallbacks;
                  const fallbackIndex = reconnectCount.current % fallbacks.length;
                  const fallbackUrl = fallbacks[fallbackIndex];
                  
                  console.log(`⭐ フォールバックURL使用: ${fallbackUrl} (${fallbackIndex + 1}/${fallbacks.length})`);
                  
                  // 次回接続用にURLを変更
                  wsUrl = fallbackUrl;
                }
              } catch (err) {
                console.error('❌ フォールバックURL選択エラー:', err);
              }
              
              // 再接続タイマーを設定
              reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
            } else {
              console.error('❌ 最大再接続試行回数に達しました。WebSocket接続を中止します。');
              // リセット処理を24秒後に実行（単純なWebSocketリソースリークを防止）
              setTimeout(() => {
                reconnectCount.current = 0;
                localStorage.removeItem('websocket_connected');
                localStorage.removeItem('websocket_last_connected');
                console.log('🔄 WebSocket接続状態をリセットしました。次回の接続をクリーンな状態で試行できます。');
              }, 24000);
            }
          }
        }, 5000); // 5秒のタイムアウト

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