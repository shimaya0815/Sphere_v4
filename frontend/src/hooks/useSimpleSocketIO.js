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
        '/socket.io', // プロキシ経由
        window.location.protocol + '//' + window.location.hostname + ':8001', // 直接
        'http://websocket:8001' // Docker内部
      ];
      
      // 試す接続URL (最初のURLから開始)
      const useUrl = urls[0];
      console.log(`Socket.IO接続URL: ${useUrl}`);
      
      // 接続カウンターをインクリメント
      connectCounter.current += 1;
      
      // 新しいSocket.IOインスタンスを作成
      const socketInstance = io(useUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        autoConnect: true,
        forceNew: true,
        path: '/socket.io/'
      });
      
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