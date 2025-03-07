import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

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
   * Socket.IO接続を確立する
   */
  const connect = useCallback(() => {
    // すでに接続中なら処理しない
    if (socket && isConnected) {
      log('すでに接続中です');
      return;
    }
    
    // 既存のソケットがある場合、完全にクリーンアップ
    if (socket) {
      try {
        log('既存のSocket接続をクリーンアップ');
        socket.removeAllListeners();
        socket.disconnect();
        // cleanup timeout
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      } catch (err) {
        console.warn('[Socket.IO] 既存接続のクリーンアップエラー:', err);
      }
    }
    
    try {
      // 接続URLを確認
      const finalUrl = typeof url === 'function' ? url() : url;
      log(`Socket.IO接続開始: ${finalUrl}`);
      
      // Socket.IOオプションの確認と設定
      const finalOptions = {
        ...socketOptions,
        // 直近の接続問題に対応するため、パスを明示
        path: '/socket.io/',
      };
      
      // 新しいSocket.IOインスタンスを作成
      const newSocket = io(finalUrl, finalOptions);
      
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
        
        // 最初のトランスポート設定がwebsocketの場合、pollingにフォールバック
        if (newSocket.io.opts.transports[0] === 'websocket' && 
            reconnectAttemptRef.current === 2) {
          log('WebSocketトランスポートでの接続に失敗しました。Polling方式に切り替えます...');
          newSocket.io.opts.transports = ['polling', 'websocket'];
        }
        
        // 再接続を試行
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current++;
          
          // 既存のタイマーをクリア
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
          }
          
          // 指数バックオフで再接続間隔を計算
          const backoffTime = Math.min(
            reconnectInterval * Math.pow(1.5, reconnectAttemptRef.current - 1),
            10000 // 最大10秒まで
          );
          
          log(`再接続を試みます (${reconnectAttemptRef.current}/${maxReconnectAttempts}) - ${backoffTime}ms後`);
          
          // 再接続タイマーを設定
          reconnectTimerRef.current = setTimeout(() => {
            if (newSocket.connected) return; // すでに接続されていれば何もしない
            
            log('再接続処理実行');
            
            // すでに接続試行中でなければ、再接続試行
            if (!newSocket.connecting) {
              newSocket.connect();
            }
          }, backoffTime);
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
        
        // Socket.IOの自動クリーンアップに任せる
      };
    } catch (err) {
      console.error('[Socket.IO] 接続作成エラー:', err);
      setError(err);
      setIsConnected(false);
    }
  }, [url, socketOptions, socket, isConnected, log, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onReconnect]);
  
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
    let mounted = true;
    
    if (autoConnect && mounted) {
      // 少し遅延を入れて接続することで、
      // 短時間での接続/切断サイクルを防止
      const timer = setTimeout(() => {
        if (mounted) {
          connect();
        }
      }, 100);
      
      return () => {
        mounted = false;
        clearTimeout(timer);
        // 切断処理は行わない - Socket.IOのクリーンアップに任せる
      };
    }
    
    return () => {
      mounted = false;
    };
  }, [autoConnect, connect]);
  
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