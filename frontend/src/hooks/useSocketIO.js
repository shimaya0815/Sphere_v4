import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// クライアント間で共有するシンプルなグローバル状態
const SHARED_SOCKET = {
  instance: null,     // 実際のSocket.IOインスタンス
  connected: false,   // 接続状態
  lastAttempt: 0,     // 最後の接続試行時間
  useCount: 0         // 使用中のクライアント数
};

// 接続URL取得のヘルパー関数
function getSocketServerUrl() {
  if (process.env.NODE_ENV === 'development') {
    return 'http://websocket:8001';
  } else if (window.ENV && window.ENV.REACT_APP_WS_URL) {
    return window.ENV.REACT_APP_WS_URL;
  } else if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  } else {
    return window.location.protocol + '//' + window.location.hostname + ':8001';
  }
}

/**
 * シンプルで堅牢なSocket.IOクライアント接続を管理するカスタムフック
 * @param {Object} options - 設定オプション
 * @returns {Object} Socket.IO関連の状態と関数
 */
const useSocketIO = (options = {}) => {
  // ローカルの状態管理
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false); 
  const [error, setError] = useState(null);
  
  // オプション
  const {
    // 接続するかどうか
    autoConnect = true,
    
    // イベントハンドラー
    onConnect = null,
    onDisconnect = null,
    onError = null,
    
    // デバッグモード
    debug = true,
  } = options;
  
  // 接続試行のトラッキング
  const connectAttemptRef = useRef(0);
  const timerRef = useRef(null);
  
  /**
   * シンプルなログ関数
   */
  const log = useCallback((message, ...args) => {
    if (debug) {
      console.log(`[Socket.IO] ${message}`, ...args);
    }
  }, [debug]);

  /**
   * 接続関数 - シンプルに実装
   */
  const connect = useCallback(() => {
    log('接続関数が呼び出されました');
    
    // すでに接続済みなら何もしない
    if (isConnected && socket) {
      log('すでに接続済みです');
      return;
    }
    
    // グローバル接続が有効なら再利用
    if (SHARED_SOCKET.instance?.connected) {
      log('既存の共有ソケットを再利用します');
      
      // ローカルの状態を更新
      setSocket(SHARED_SOCKET.instance);
      setIsConnected(true);
      setError(null);
      
      // 使用カウントを増やす
      SHARED_SOCKET.useCount++;
      
      // 接続コールバックを呼び出す
      if (onConnect) {
        onConnect(SHARED_SOCKET.instance);
      }
      
      return;
    }
    
    // 接続試行の間隔制限 (1秒)
    const now = Date.now();
    if (now - SHARED_SOCKET.lastAttempt < 1000) {
      log('接続試行間隔が短すぎます。スキップします');
      return;
    }
    
    // 接続試行を記録
    SHARED_SOCKET.lastAttempt = now;
    connectAttemptRef.current++;
    
    try {
      // Socket.IOオプション
      const options = {
        transports: ['polling', 'websocket'],  // pollingから開始して安定性を確保
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 10000,
        autoConnect: true,
      };
      
      // URL取得とログ出力
      const serverUrl = getSocketServerUrl();
      log(`接続開始: ${serverUrl} (試行: ${connectAttemptRef.current})`);
      
      // Socket.IOインスタンス作成
      const socketInstance = io(serverUrl, options);
      
      // イベントハンドラーを設定
      socketInstance.on('connect', () => {
        log('接続成功:', socketInstance.id);
        
        // ローカル状態更新
        setSocket(socketInstance);
        setIsConnected(true);
        setError(null);
        
        // グローバル状態を更新
        SHARED_SOCKET.instance = socketInstance;
        SHARED_SOCKET.connected = true;
        SHARED_SOCKET.useCount++;
        
        // 接続コールバック
        if (onConnect) {
          onConnect(socketInstance);
        }
      });
      
      socketInstance.on('disconnect', (reason) => {
        log('切断:', reason);
        setIsConnected(false);
        
        // グローバル状態更新
        SHARED_SOCKET.connected = false;
        
        // 切断コールバック
        if (onDisconnect) {
          onDisconnect(reason);
        }
      });
      
      socketInstance.on('connect_error', (err) => {
        log('接続エラー:', err.message);
        setError(err);
        
        // エラーコールバック
        if (onError) {
          onError(err);
        }
      });
      
      // ローカル状態にセット
      setSocket(socketInstance);
      
      return socketInstance;
    } catch (err) {
      log('接続作成エラー:', err);
      setError(err);
      return null;
    }
  }, [isConnected, socket, onConnect, onDisconnect, onError, log]);
  /**
   * Socket.IO接続を切断する
   */
  const disconnect = useCallback(() => {
    log('切断関数が呼び出されました');
    
    // すでに切断済みなら何もしない
    if (!isConnected || !socket) {
      log('すでに切断済みまたはソケットがありません');
      return;
    }
    
    try {
      // 使用カウントを減らす
      if (SHARED_SOCKET.useCount > 0) {
        SHARED_SOCKET.useCount--;
      }
      
      // まだ他のクライアントが使用中なら、実際の切断はスキップ
      if (SHARED_SOCKET.useCount > 0) {
        log(`他のクライアント(${SHARED_SOCKET.useCount})が使用中のため、実際の切断はスキップします`);
        setIsConnected(false);
        return;
      }
      
      log('最後のクライアントなので切断を実行します');
      
      // 自分自身のリスナーを解除
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        
        // 切断を実行
        socket.disconnect();
        
        // グローバル状態をリセット
        SHARED_SOCKET.instance = null;
        SHARED_SOCKET.connected = false;
        
        // ローカル状態を更新
        setSocket(null);
        setIsConnected(false);
        
        log('切断完了');
      }
    } catch (err) {
      log('切断処理中にエラーが発生しました:', err);
    }
  }, [socket, isConnected, log]);
  
  /**
   * イベント送信関数
   */
  const emit = useCallback((eventName, data, callback) => {
    try {
      // アクティブなソケットを選択
      const activeSocket = socket || SHARED_SOCKET.instance;
      
      // 接続チェック
      if (!activeSocket || !activeSocket.connected) {
        log(`イベント「${eventName}」送信失敗: 接続がありません`);
        return false;
      }
      
      log(`イベント送信: ${eventName}`);
      
      // コールバック付きかどうかで処理を分ける
      if (callback) {
        activeSocket.emit(eventName, data, callback);
      } else {
        activeSocket.emit(eventName, data);
      }
      
      return true;
    } catch (err) {
      log(`イベント送信エラー (${eventName}):`, err);
      return false;
    }
  }, [socket, log]);
  
  /**
   * イベントリスナー登録関数
   */
  const on = useCallback((eventName, callback) => {
    // ソケットチェック
    if (!socket) {
      log(`イベントリスナー登録失敗(${eventName}): ソケットが存在しません`);
      return () => {};
    }
    
    // リスナー登録
    log(`イベントリスナー登録: ${eventName}`);
    socket.on(eventName, callback);
    
    // 解除関数を返す
    return () => {
      if (socket) {
        socket.off(eventName, callback);
        log(`イベントリスナー解除: ${eventName}`);
      }
    };
  }, [socket, log]);
  
  /**
   * 一度だけ実行されるイベントリスナー
   */
  const once = useCallback((eventName, callback) => {
    if (!socket) {
      log(`一度だけのイベントリスナー登録失敗(${eventName}): ソケットがありません`);
      return () => {};
    }
    
    log(`一度だけのイベントリスナー登録: ${eventName}`);
    socket.once(eventName, callback);
    
    return () => {
      if (socket) {
        socket.off(eventName, callback);
        log(`一度だけのイベントリスナー解除: ${eventName}`);
      }
    };
  }, [socket, log]);
  
  // 自動接続処理
  useEffect(() => {
    if (autoConnect) {
      // 短い遅延を入れて接続
      const timer = setTimeout(() => {
        log('自動接続実行');
        connect();
      }, 100);
      
      // クリーンアップ
      return () => {
        clearTimeout(timer);
        
        // コンポーネントのアンマウント時に切断
        disconnect();
      };
    }
    
    return () => {};
  }, [connect, disconnect, autoConnect, log]);
  
  // 公開インターフェース - シンプルに必要なものだけ
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
    once
  };
};

export default useSocketIO;