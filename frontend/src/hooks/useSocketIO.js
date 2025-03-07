import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// 接続管理のためのシングルトン
const createSocketManager = () => {
  let instance = null;
  
  return () => {
    if (!instance) {
      instance = {
        // 接続状態
        socket: null,
        isConnecting: false,
        connectionId: null,
        
        // タイミング制御
        lastAttempt: 0,
        lastDisconnect: 0,
        nextConnect: 0,
        
        // クライアント管理
        clients: 0,
        
        // ロック状態
        connectionLock: false,
        
        // メソッド
        lockConnection() {
          this.connectionLock = true;
          // 10秒後に自動解除
          setTimeout(() => {
            this.connectionLock = false;
          }, 10000);
        },
        
        isLocked() {
          return this.connectionLock;
        }
      };
    }
    
    return instance;
  };
};

// シングルトンマネージャーのインスタンスを取得
const socketManagerFactory = createSocketManager();
const GLOBAL_CONNECTION = socketManagerFactory();

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
    
    // 接続ロック管理 - 競合状態を排除
    if (GLOBAL_CONNECTION.isLocked()) {
      log('接続ロック中です。現在の接続操作が完了するまで待機します');
      return;
    }
    
    // 接続をロックして排他制御
    GLOBAL_CONNECTION.lockConnection();
    
    // 既存の安定した接続があれば再利用
    if (GLOBAL_CONNECTION.socket?.connected) {
      log('既に接続済みのソケットが存在します。再利用します');
      setSocket(GLOBAL_CONNECTION.socket);
      setIsConnected(true);
      GLOBAL_CONNECTION.clients++;
      return;
    }
    
    // 接続が進行中なら待機
    if (GLOBAL_CONNECTION.isConnecting) {
      log('別の接続処理が進行中です。完了を待ちます');
      return;
    }
    
    // 切断後5秒は再接続を避ける - 接続サイクルを防止
    const now = Date.now();
    if (GLOBAL_CONNECTION.lastDisconnect && now - GLOBAL_CONNECTION.lastDisconnect < 5000) {
      log('前回の切断から十分な時間が経っていません。接続は行いません');
      return;
    }
    
    // 最後の接続試行から3秒以内なら、再接続をスキップ
    if (now - GLOBAL_CONNECTION.lastAttempt < 3000) {
      log('前回の接続試行から十分な時間が経っていません。接続は行いません');
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
   * Socket.IO接続を安全に切断する
   * - 単一の安全な切断処理を実装
   * - グローバル接続状態を管理
   * - イベントリスナーのクリーンアップを確実に実行
   */
  const disconnect = useCallback(() => {
    // ローカルの接続状態を更新
    setIsConnected(false);
    
    // 常に進行中のタイマーをクリア
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    // クライアント数を減らす
    if (GLOBAL_CONNECTION.clients > 0) {
      GLOBAL_CONNECTION.clients--;
    }
    
    // 他のクライアントが接続を使用中の場合は実際の切断は行わない
    if (GLOBAL_CONNECTION.clients > 0) {
      log(`他のクライアント(${GLOBAL_CONNECTION.clients})が接続中のためソケットは維持します`);
      return;
    }
    
    // ロック確認 - 別の操作中なら待機
    if (GLOBAL_CONNECTION.isLocked()) {
      log('接続操作がロック中です。切断をスキップします');
      return;
    }
    
    // ソケットが存在しない場合は何もしない
    if (!socket && !GLOBAL_CONNECTION.socket) {
      log('切断対象のソケットが存在しません');
      return;
    }
    
    try {
      // 使用するソケットを決定（ローカルまたはグローバル）
      const socketToDisconnect = socket || GLOBAL_CONNECTION.socket;
      
      if (!socketToDisconnect) {
        log('切断対象のソケットがnullです');
        return;
      }
      
      log('ソケット切断処理を実行します');
      
      // イベントリスナーを全て手動で解除（メモリリーク防止）
      const events = ['chat_message', 'typing', 'user_joined', 'user_left', 
                    'connect', 'disconnect', 'connect_error', 'reconnect', 
                    'reconnect_error', 'reconnect_failed', 'error', 'ping', 'pong'];
      
      events.forEach(event => {
        try {
          if (socketToDisconnect.hasListeners && socketToDisconnect.hasListeners(event)) {
            log(`イベントリスナー解除: ${event}`);
            socketToDisconnect.off(event);
          }
        } catch (e) {
          // 特定のイベントリスナー解除でエラーが発生しても続行
          console.warn(`イベント ${event} のリスナー解除に失敗: ${e.message}`);
        }
      });
      
      // リスナー解除のための短い遅延
      setTimeout(() => {
        try {
          // 切断
          socketToDisconnect.disconnect();
          log('ソケット切断完了');
          
          // グローバル接続状態をリセット
          GLOBAL_CONNECTION.socket = null;
          GLOBAL_CONNECTION.isConnecting = false;
          GLOBAL_CONNECTION.connectionId = null;
          
          // 最終切断時間を記録（再接続クールダウン）
          GLOBAL_CONNECTION.lastDisconnect = Date.now();
        } catch (err) {
          console.error('最終切断処理でエラーが発生:', err);
        }
      }, 100);
    } catch (error) {
      console.error('Socket切断中にエラーが発生しました:', error);
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
  
  /**
   * 単一のソケット接続を安全に管理する
   */
  useEffect(() => {
    // ローカル状態変数
    let mounted = true;
    let connectTimeout = null;
    
    // 一度だけ行う初期化処理
    if (autoConnect && mounted) {
      // シンプルな接続試行
      const safeConnect = () => {
        if (!mounted) return;
        
        // 現在のクライアント数をチェック - 最適化
        if (GLOBAL_CONNECTION.clients > 3) {
          log(`既に多数のクライアント(${GLOBAL_CONNECTION.clients})が存在します。接続をスキップします`);
          return;
        }
        
        if (GLOBAL_CONNECTION.socket?.connected) {
          log('既存の接続を再利用します: ' + GLOBAL_CONNECTION.socket.id);
          setSocket(GLOBAL_CONNECTION.socket);
          setIsConnected(true);
          GLOBAL_CONNECTION.clients++;
          
          if (onConnect) {
            onConnect(GLOBAL_CONNECTION.socket);
          }
        } else if (!GLOBAL_CONNECTION.isConnecting) {
          // 接続試行中でなければ接続を試みる
          connect();
        }
      };
      
      // 0.5秒後に初期接続を試行
      connectTimeout = setTimeout(() => {
        safeConnect();
      }, 500);
    }
    
    // クリーンアップ処理
    return () => {
      mounted = false;
      
      if (connectTimeout) {
        clearTimeout(connectTimeout);
      }
      
      // クライアント数の管理（絶対に0未満にはならない）
      if (GLOBAL_CONNECTION.clients > 0) {
        GLOBAL_CONNECTION.clients--;
      }
      
      // 最後のクライアントだけが切断処理を実行
      if (GLOBAL_CONNECTION.clients === 0 && socket) {
        log('最後のクライアントが終了。接続を切断します');
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect, log, onConnect, socket]);
  
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