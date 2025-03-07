import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * シンプルなSocket.IOクライアント接続を管理するカスタムフック
 * @returns {Object} Socket.IO関連の状態と関数
 */
const useSimpleSocketIO = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastPong, setLastPong] = useState(null);
  
  const connectCounter = useRef(0);
  
  useEffect(() => {
    // クリーンアップ関数
    let cleanup = () => {};
    
    console.log('Socket.IO接続を試行します...');
    
    try {
      // 接続URLs (優先度順)
      const urls = [
        'http://localhost:8001', // 直接WebSocketサーバーへ
        window.location.protocol + '//' + window.location.hostname + ':8001', // フルURL
        '/socket.io' // プロキシ経由
      ];
      
      // 試す接続URL (最初のURLから開始)
      const useUrl = urls[0];
      console.log(`Socket.IO接続URL: ${useUrl}`);
      
      // 接続カウンターをインクリメント
      connectCounter.current += 1;
      
      // 新しいSocket.IOインスタンスを作成 - Pollingを優先
      let socketOptions = {
        transports: ['polling', 'websocket'], // pollingを優先
        reconnection: true,
        reconnectionAttempts: 5, // 回数を減らす
        reconnectionDelay: 1000,
        reconnectionDelayMax: 3000, // 最大遅延を短縮
        timeout: 10000, // タイムアウトを短縮
        autoConnect: true,
        forceNew: true,
        upgrade: false // WebSocketへのアップグレードを無効化
      };
      
      // URL形式に基づいてパスを設定
      if (useUrl.startsWith('http://localhost:8001') || useUrl.includes('localhost:8001')) {
        // localhost:8001への直接接続の場合
        socketOptions.path = '/socket.io/';
        console.log('Socket.IO: localhostへの直接接続を使用');
      } else if (useUrl.startsWith('/')) {
        // 相対パスの場合
        socketOptions.path = useUrl;
        // 実際の接続URLをwindow.locationから取得
        useUrl = window.location.origin;
        console.log('Socket.IO: 相対パス接続を使用', useUrl);
      } else {
        // その他の接続
        socketOptions.path = '/socket.io/';
        console.log('Socket.IO: デフォルト設定で接続');
      }
      
      console.log('Socket.IO接続:', useUrl, socketOptions);
      const socketInstance = io(useUrl, socketOptions);
      
      // 接続イベント
      socketInstance.on('connect', () => {
        console.log('Socket.IO: 接続成功!', socketInstance.id);
        setIsConnected(true);
        setError(null);
        
        // ping/pongテスト
        socketInstance.emit('ping');
      });
      
      // 切断イベント
      socketInstance.on('disconnect', (reason) => {
        console.log(`Socket.IO: 切断されました (理由: ${reason})`);
        setIsConnected(false);
      });
      
      // エラーイベント
      socketInstance.on('connect_error', (err) => {
        console.error('Socket.IO接続エラー:', err.message);
        setError(err.message);
      });
      
      // Pingテスト用
      socketInstance.on('pong', () => {
        console.log('Socket.IO: Pongを受信しました');
        setLastPong(new Date().toISOString());
      });
      
      // ソケットインスタンスを状態にセット
      setSocket(socketInstance);
      
      // クリーンアップ関数を設定
      cleanup = () => {
        console.log('Socket.IO: 切断します');
        socketInstance.disconnect();
      };
    } catch (err) {
      console.error('Socket.IO初期化エラー:', err);
      setError(err.message);
    }
    
    // コンポーネントアンマウント時に切断
    return cleanup;
  }, []);
  
  // 接続状態をテスト
  const testConnection = useCallback(() => {
    if (socket && isConnected) {
      console.log('Socket.IO: 接続テスト');
      socket.emit('ping');
      return true;
    } else {
      console.log('Socket.IO: 未接続');
      return false;
    }
  }, [socket, isConnected]);
  
  return { 
    socket, 
    isConnected,
    error,
    lastPong,
    testConnection
  };
};

export default useSimpleSocketIO;