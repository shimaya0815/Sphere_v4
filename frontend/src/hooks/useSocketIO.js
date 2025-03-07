import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// グローバルなSocket.IO接続管理 - 複数の接続試行を防止
const GLOBAL_CONNECTION = {
  socket: null,
  isConnecting: false,
  connectionId: null,
  lastAttempt: 0,
  clients: 0
};

/**
 * 最適な Socket.IO 接続 URL を取得する
 * Docker や開発環境など、さまざまな環境に対応
 */
const getOptimalSocketUrl = () => {
  console.log('現在の環境:', {
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    port: window.location.port,
    env: process.env.NODE_ENV
  });
  
  // 開発環境でソケットサーバーに直接接続
  if (process.env.NODE_ENV === 'development') {
    // プロキシではなく直接接続することで問題を回避
    const directUrl = window.location.protocol + '//' + window.location.hostname + ':8001';
    console.log('開発環境: WebSocketサーバーに直接接続', directUrl);
    return directUrl;
  }
  
  // Docker環境
  if (window.ENV && window.ENV.REACT_APP_WS_URL) {
    console.log('Docker環境: window.ENV.REACT_APP_WS_URL使用:', window.ENV.REACT_APP_WS_URL);
    return window.ENV.REACT_APP_WS_URL;
  }
  
  // 環境変数をチェック
  if (process.env.REACT_APP_WS_URL) {
    console.log('環境変数: process.env.REACT_APP_WS_URL使用:', process.env.REACT_APP_WS_URL);
    return process.env.REACT_APP_WS_URL;
  }
  
  if (process.env.REACT_APP_SOCKET_URL) {
    console.log('環境変数: process.env.REACT_APP_SOCKET_URL使用:', process.env.REACT_APP_SOCKET_URL);
    return process.env.REACT_APP_SOCKET_URL;
  }
  
  // 最終フォールバック: 同一オリジンにポート8001で接続
  const wsUrl = window.location.protocol + '//' + window.location.hostname + ':8001';
  console.log('フォールバック: Socketサーバーに直接接続:', wsUrl);
  return wsUrl;
};

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
    // 接続URL - さまざまなソースから最適なURLを取得
    url = getOptimalSocketUrl(),
    
    // 自動接続するかどうか
    autoConnect = true,
    
    // 最大再接続試行回数 - 少なくして無駄な試行を防止
    maxReconnectAttempts = 3,
    
    // 再接続間隔 (ミリ秒) - 短くして早く諦める
    reconnectInterval = 1000,
    
    // Socket.IOオプション - タイムアウト問題解決のための最適化
    socketOptions = {
      transports: ['polling'],  // 安定性のためpollingのみを使用
      reconnection: true,
      reconnectionAttempts: 2,  // 少なく
      reconnectionDelay: 3000,  // 長めのディレイ
      reconnectionDelayMax: 5000,
      timeout: 45000,  // 十分長いタイムアウト
      autoConnect: false,
      forceNew: false,  // 既存の接続を再利用
      withCredentials: false,
      path: '/socket.io/', // パスはデフォルトのまま
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
   * Socket.IO接続を確立する - グローバル接続状態を活用した最適化版
   */
  const connect = useCallback(() => {
    // すでに接続中またはグローバル接続があれば再利用
    if (GLOBAL_CONNECTION.socket && (GLOBAL_CONNECTION.socket.connected || GLOBAL_CONNECTION.isConnecting)) {
      log('既存のグローバル接続を再利用します');
      setSocket(GLOBAL_CONNECTION.socket);
      
      // 既に接続済みなら接続状態を更新
      if (GLOBAL_CONNECTION.socket.connected) {
        log(`既存のSocket.IO接続を再利用: ${GLOBAL_CONNECTION.socket.id}`);
        setIsConnected(true);
        setError(null);
        
        // 接続確立コールバック
        if (onConnect) {
          onConnect(GLOBAL_CONNECTION.socket);
        }
      }
      
      GLOBAL_CONNECTION.clients++;
      return;
    }
    
    // 前回の接続試行から3秒以内または切断から1.5秒以内は試行しない（レート制限）
    const now = Date.now();
    if (now - GLOBAL_CONNECTION.lastAttempt < 3000) {
      log('接続試行間隔が短すぎます。スキップします');
      return;
    }
    
    // 前回の切断から十分な時間が経っていない場合は待機
    if (GLOBAL_CONNECTION.lastDisconnect && now - GLOBAL_CONNECTION.lastDisconnect < 1500) {
      const waitTime = 1500 - (now - GLOBAL_CONNECTION.lastDisconnect);
      log(`前回の切断から十分な時間が経っていません。${waitTime}ms後に再試行します`);
      
      setTimeout(() => {
        connect();
      }, waitTime);
      return;
    }
    
    GLOBAL_CONNECTION.lastAttempt = now;
    GLOBAL_CONNECTION.isConnecting = true;
    GLOBAL_CONNECTION.clients++;
    
    try {
      // 接続URLを確認
      const finalUrl = typeof url === 'function' ? url() : url;
      log(`Socket.IO接続開始: ${finalUrl} (クライアント数: ${GLOBAL_CONNECTION.clients})`);
      
      // Socket.IOオプションの確認と設定
      const finalOptions = {
        ...socketOptions,
        path: '/socket.io/',
        reconnectionDelay: 3000,          // 再接続の間隔(ms)
        reconnectionDelayMax: 5000,       // 最大再接続間隔(ms)
        reconnectionAttempts: 5,          // 再接続の試行回数
        timeout: 20000,                   // 接続タイムアウト(ms)
        autoConnect: true,                // 自動接続を有効に
        transports: ['websocket', 'polling'], // WebSocketを優先するが、ポーリングもフォールバックとして許可
      };
      
      // グローバル共有のSocket.IOインスタンスを作成
      const newSocket = io(finalUrl, finalOptions);
      
      // イベントハンドラーを設定 - シンプル化
      newSocket.on('connect', () => {
        log(`接続成功 - Socket ID: ${newSocket.id}`);
        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
        
        // グローバル接続状態を更新
        GLOBAL_CONNECTION.socket = newSocket;
        GLOBAL_CONNECTION.isConnecting = false;
        GLOBAL_CONNECTION.connectionId = newSocket.id;
        
        // 接続確立コールバック
        if (onConnect) {
          onConnect(newSocket);
        }
      });
      
      newSocket.on('connect_error', (err) => {
        log('接続エラー:', err.message);
        setError(err);
        
        // シンプルな再接続ロジック
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current++;
          
          // 増加する再接続間隔で再試行 (指数バックオフ)
          const retryDelay = Math.min(3000 * Math.pow(1.5, reconnectAttemptRef.current - 1), 10000);
          
          log(`接続エラー後の再接続を試みます (${reconnectAttemptRef.current}/${maxReconnectAttempts}) - ${retryDelay}ms後`);
          
          // タイマークリア
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
          }
          
          // 再接続タイマー
          reconnectTimerRef.current = setTimeout(() => {
            // グローバル状態リセット
            GLOBAL_CONNECTION.isConnecting = false;
            
            // 新しい接続試行
            log('接続エラー後の再接続実行');
            connect();
          }, retryDelay);
        } else {
          // 最大試行回数に達したらグローバル状態をリセット
          log('最大再接続試行回数に達しました');
          GLOBAL_CONNECTION.isConnecting = false;
          
          // エラーコールバック
          if (onError) {
            onError(err);
          }
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
      
      newSocket.on('reconnect_error', (err) => {
        log(`再接続エラー: ${err.message}`);
      });
      
      newSocket.on('reconnect_failed', () => {
        log('再接続失敗: 再接続試行を停止します');
      });
      
      newSocket.on('error', (err) => {
        log(`エラー: ${err.message}`);
        if (onError) {
          onError(err);
        }
      });
      
      // ping/pongイベントをリッスン
      newSocket.on('ping', () => {
        log('Pingメッセージ受信');
      });
      
      newSocket.on('pong', () => {
        log('Pongメッセージ受信');
      });
      
      // ソケットインスタンスを状態にセット
      setSocket(newSocket);
      
      // 接続開始
      if (!newSocket.connected && !newSocket.connecting) {
        newSocket.connect();
      }
      
      return () => {
        // クリーンアップ処理
        log('ソケット接続のクリーンアップ');
        
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };
    } catch (err) {
      console.error('[Socket.IO] 接続作成エラー:', err);
      setError(err);
      setIsConnected(false);
      
      // グローバル状態をリセット
      GLOBAL_CONNECTION.isConnecting = false;
    }
  }, [url, socketOptions, log, maxReconnectAttempts, onConnect, onDisconnect, onError, onReconnect]);
  
  /**
   * Socket.IO接続を切断する - グローバル接続を考慮
   */
  const disconnect = useCallback(() => {
    // クライアント数を減らす
    if (GLOBAL_CONNECTION.clients > 0) {
      GLOBAL_CONNECTION.clients--;
    }
    
    // まだ他のクライアントが接続を使用中の場合、ローカル状態のみクリア
    if (GLOBAL_CONNECTION.clients > 0) {
      log(`他のクライアントが接続を使用中 (残り: ${GLOBAL_CONNECTION.clients})。ローカル状態のみクリア`);
      setIsConnected(false);
      
      // タイマーをクリア
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      return;
    }
    
    // 最後のクライアントの場合、実際に切断
    if (!socket) return;
    
    try {
      log('最後のクライアント。Socket.IO接続を切断');
      
      // イベントリスナーを全て手動で解除（メモリリーク防止）
      if (socket.hasListeners('chat_message')) {
        log('イベントリスナー解除: chat_message');
        socket.off('chat_message');
      }
      if (socket.hasListeners('typing')) {
        log('イベントリスナー解除: typing');
        socket.off('typing');
      }
      if (socket.hasListeners('user_joined')) {
        log('イベントリスナー解除: user_joined');
        socket.off('user_joined');
      }
      if (socket.hasListeners('user_left')) {
        log('イベントリスナー解除: user_left');
        socket.off('user_left');
      }
      
      // 切断
      socket.disconnect();
      
      // グローバル接続状態をリセット
      GLOBAL_CONNECTION.socket = null;
      GLOBAL_CONNECTION.isConnecting = false;
      GLOBAL_CONNECTION.connectionId = null;
      
      // 最終切断時間を記録（再接続クールダウン）
      GLOBAL_CONNECTION.lastDisconnect = Date.now();
    } catch (error) {
      console.error('Socket切断中にエラーが発生しました:', error);
    }
    
    // タイマーをクリア
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
    let mounted = true;
    
    if (autoConnect && mounted) {
      // グローバル接続があれば再利用、なければ新規接続
      if (GLOBAL_CONNECTION.socket && 
          (GLOBAL_CONNECTION.socket.connected || GLOBAL_CONNECTION.isConnecting)) {
        log('既存のグローバル接続を検出。再利用します');
        
        // 接続状態を更新
        if (GLOBAL_CONNECTION.socket.connected) {
          setSocket(GLOBAL_CONNECTION.socket);
          setIsConnected(true);
          GLOBAL_CONNECTION.clients++;
          
          // 接続確立コールバック
          if (onConnect) {
            onConnect(GLOBAL_CONNECTION.socket);
          }
        } else {
          // 接続中の場合は、状態のみ更新
          GLOBAL_CONNECTION.clients++;
        }
      } else {
        // タイマーなしで即時接続
        connect();
      }
      
      // コンポーネントのアンマウント時に切断
      return () => {
        mounted = false;
        // 明示的に切断処理を呼ぶ - グローバル接続状態が適切に管理される
        disconnect();
      };
    }
    
    return () => {
      mounted = false;
    };
  }, [autoConnect, connect, disconnect, log, onConnect]);
  
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