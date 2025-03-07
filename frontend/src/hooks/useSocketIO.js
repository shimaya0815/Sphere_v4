import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * Socket.IOクライアント接続を管理するカスタムフック
 * @param {Object} options - 設定オプション
 * @returns {Object} Socket.IO関連の状態と関数
 */
const useSocketIO = (options = {}) => {
  // 状態管理
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // 再接続管理
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  
  // オプション
  const {
    // 接続URL
    url = 'http://localhost:8001',  // 開発環境のデフォルト値
    
    // 自動接続するかどうか
    autoConnect = true,
    
    // 最大再接続試行回数
    maxReconnectAttempts = 10,
    
    // 再接続間隔 (ミリ秒)
    reconnectInterval = 3000,
    
    // Socket.IOオプション
    socketOptions = {
      transports: ['polling', 'websocket'],  // pollingを優先して互換性を確保
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      autoConnect: false, // 手動で接続管理するため
    },
    
    // イベントハンドラー
    onConnect = null,
    onDisconnect = null,
    onError = null,
    onReconnect = null,
    
    // デバッグモード
    debug = process.env.NODE_ENV === 'development',
  } = options;
  
  /**
   * ログ出力関数
   */
  const log = useCallback((message, ...args) => {
    if (debug) {
      console.log(`[Socket.IO] ${message}`, ...args);
    }
  }, [debug]);
  
  /**
   * Socket.IO接続を確立する
   */
  const connect = useCallback(() => {
    // 既存のソケットがある場合は切断
    if (socket) {
      log('既存のSocket接続を切断');
      socket.disconnect();
    }
    
    try {
      log(`Socket.IO接続開始: ${url}`);
      
      // 新しいSocket.IOインスタンスを作成
      const newSocket = io(url, socketOptions);
      
      // イベントハンドラーを設定
      newSocket.on('connect', () => {
        log(`接続成功 - Socket ID: ${newSocket.id}`);
        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
        
        // 接続確立コールバック
        if (onConnect) {
          onConnect(newSocket);
        }
      });
      
      newSocket.on('connect_error', (err) => {
        log('接続エラー:', err.message);
        setError(err);
        
        // 再接続を試行
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current++;
          
          // 既存のタイマーをクリア
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
          }
          
          log(`再接続を試みます (${reconnectAttemptRef.current}/${maxReconnectAttempts})`);
          
          // 再接続タイマーを設定
          reconnectTimerRef.current = setTimeout(() => {
            log('再接続処理実行');
            newSocket.connect();
          }, reconnectInterval);
        } else {
          log('最大再接続試行回数に達しました');
        }
        
        // エラーコールバック
        if (onError) {
          onError(err);
        }
      });
      
      newSocket.on('disconnect', (reason) => {
        log(`切断: ${reason}`);
        setIsConnected(false);
        
        // 切断コールバック
        if (onDisconnect) {
          onDisconnect(reason);
        }
      });
      
      newSocket.on('reconnect', (attemptNumber) => {
        log(`再接続成功 (試行回数: ${attemptNumber})`);
        
        // 再接続コールバック
        if (onReconnect) {
          onReconnect(newSocket, attemptNumber);
        }
      });
      
      // ソケットインスタンスを状態にセット
      setSocket(newSocket);
      
      // 接続開始
      newSocket.connect();
      
      return () => {
        // クリーンアップ処理
        log('ソケット接続のクリーンアップ');
        newSocket.disconnect();
        
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };
    } catch (err) {
      console.error('[Socket.IO] 接続作成エラー:', err);
      setError(err);
      setIsConnected(false);
    }
  }, [url, socketOptions, socket, log, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onReconnect]);
  
  /**
   * Socket.IO接続を切断する
   */
  const disconnect = useCallback(() => {
    if (!socket) return;
    
    log('Socket.IO接続を切断');
    socket.disconnect();
    
    // 再接続タイマーをクリア
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, [socket, log]);
  
  /**
   * イベントをSocket.IOサーバーへ送信する
   * @param {string} eventName - イベント名
   * @param {any} data - 送信データ
   * @param {Function} callback - レスポンスコールバック
   * @returns {boolean} 送信成功かどうか
   */
  const emit = useCallback((eventName, data, callback) => {
    if (!socket || !isConnected) {
      log(`イベント送信エラー: Socket未接続 (イベント: ${eventName})`);
      return false;
    }
    
    try {
      log(`イベント送信: ${eventName}`, data);
      
      if (callback) {
        socket.emit(eventName, data, callback);
      } else {
        socket.emit(eventName, data);
      }
      
      return true;
    } catch (err) {
      console.error(`[Socket.IO] イベント送信エラー (${eventName}):`, err);
      return false;
    }
  }, [socket, isConnected, log]);
  
  /**
   * Socket.IOイベントのリスナーを登録する
   * @param {string} eventName - イベント名
   * @param {Function} callback - イベントハンドラー
   * @returns {Function} リスナー解除関数
   */
  const on = useCallback((eventName, callback) => {
    if (!socket) {
      log(`イベントリスナー登録エラー: Socket未初期化 (イベント: ${eventName})`);
      return () => {};
    }
    
    log(`イベントリスナー登録: ${eventName}`);
    socket.on(eventName, callback);
    
    // リスナー解除関数を返す
    return () => {
      log(`イベントリスナー解除: ${eventName}`);
      socket.off(eventName, callback);
    };
  }, [socket, log]);
  
  /**
   * 一度だけ実行されるイベントリスナーを登録する
   * @param {string} eventName - イベント名
   * @param {Function} callback - イベントハンドラー
   * @returns {Function} リスナー解除関数
   */
  const once = useCallback((eventName, callback) => {
    if (!socket) {
      log(`一度だけのイベントリスナー登録エラー: Socket未初期化 (イベント: ${eventName})`);
      return () => {};
    }
    
    log(`一度だけのイベントリスナー登録: ${eventName}`);
    socket.once(eventName, callback);
    
    // リスナー解除関数を返す
    return () => {
      log(`一度だけのイベントリスナー解除: ${eventName}`);
      socket.off(eventName, callback);
    };
  }, [socket, log]);
  
  // 自動接続が有効な場合、コンポーネントマウント時に接続
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    // クリーンアップ時に切断
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);
  
  // 公開インターフェース
  return {
    // 状態
    socket,
    isConnected,
    error,
    
    // 接続管理
    connect,
    disconnect,
    
    // イベント管理
    emit,
    on,
    once,
  };
};

export default useSocketIO;