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
    
    // URLを処理して適切なWebSocketアドレスに変換
    let wsUrl = url;
    // Dockerコンテナ内で実行されている場合、localhostではなくwebsocketサービス名を使用
    if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
      // Dockerコンテナの内外に関わらず接続できるようにする
      wsUrl = url.replace('localhost:8001', 'websocket:8001');
      console.log(`Modified WebSocket URL for Docker compatibility: ${wsUrl}`);
    }
    
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
            
            // タイムアウト後に再接続を開始
            if (reconnectCount.current < reconnectAttempts) {
              reconnectCount.current += 1;
              console.log(`Connection timed out. Attempting to reconnect (${reconnectCount.current}/${reconnectAttempts})...`);
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
        
        // メッセージ受信ハンドラ
        websocketRef.current.onmessage = (event) => {
          try {
            // データがある場合のみ処理
            if (event.data) {
              const data = JSON.parse(event.data);
              console.log('WebSocket message received:', data);
              setMessages(prevMessages => [...prevMessages, data]);
              
              // 接続確立メッセージを受信した場合、接続状態を確実に更新
              if (data.type === 'connection_established') {
                setIsConnected(true);
                setError(null);
                console.log('Received connection confirmation from server');
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
          
          // 再接続を試みる
          if (reconnectCount.current < reconnectAttempts) {
            reconnectCount.current += 1;
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`Attempting to reconnect (${reconnectCount.current}/${reconnectAttempts})...`);
              connect();
            }, reconnectInterval);
          } else {
            setError(new Error('Maximum reconnect attempts reached'));
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