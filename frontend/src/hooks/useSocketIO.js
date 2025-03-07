import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const useSocketIO = (options = {}) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectCountRef = useRef(0);
  
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 10,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
    enableLogging = process.env.NODE_ENV === 'development',
  } = options;
  
  // Get the Socket.IO server URL based on environment
  const getSocketServer = useCallback(() => {
    // Logging for debugging
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Location:', window.location.hostname);
    
    // For Docker environment - direct connection
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Direct connection to Socket.IO server - this avoids proxy issues
      return 'http://localhost:8001';
    }
    
    // For production - use the current host with socket.io path
    return window.location.origin;
  }, []);

  // Connect to Socket.IO server
  const connect = useCallback(() => {
    if (socket) {
      if (enableLogging) console.log('🔌 Socket already exists, disconnecting first');
      socket.disconnect();
    }
    
    const socketUrl = getSocketServer();
    if (enableLogging) console.log(`🔄 Connecting to Socket.IO server: ${socketUrl}`);
    
    try {
      // Create Socket.IO client with automatic reconnection
      const socketClient = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: reconnectAttempts,
        reconnectionDelay: reconnectInterval,
        reconnectionDelayMax: reconnectInterval * 5,
        timeout: 20000,
        autoConnect: false, // We'll connect manually
      });
      
      // Set up event listeners
      socketClient.on('connect', () => {
        setIsConnected(true);
        setError(null);
        reconnectCountRef.current = 0;
        
        if (enableLogging) console.log(`✅ Connected to Socket.IO server with ID: ${socketClient.id}`);
        
        // Call the onConnect callback if provided
        if (onConnect) onConnect(socketClient);
        
        // Show toast on reconnect (not first connect)
        if (reconnectCountRef.current > 0 && onReconnect) {
          toast.success('リアルタイム接続が復旧しました');
          onReconnect(socketClient);
        }
      });
      
      socketClient.on('connection_status', (data) => {
        if (enableLogging) console.log('🔄 Socket.IO connection status:', data);
      });
      
      socketClient.on('disconnect', (reason) => {
        setIsConnected(false);
        
        if (enableLogging) console.log(`❌ Disconnected from Socket.IO server: ${reason}`);
        
        // Call the onDisconnect callback if provided
        if (onDisconnect) onDisconnect(reason);
        
        // Show toast on disconnect
        if (reason !== 'io client disconnect') {
          toast.error('リアルタイム接続が切断されました');
        }
      });
      
      socketClient.on('connect_error', (err) => {
        setIsConnected(false);
        setError(err);
        reconnectCountRef.current += 1;
        
        if (enableLogging) console.error(`❌ Socket.IO connection error: ${err.message}`);
        
        // Call the onError callback if provided
        if (onError) onError(err);
        
        // Handle reconnection
        if (reconnectCountRef.current < reconnectAttempts) {
          if (enableLogging) console.log(`🔄 Trying to reconnect: attempt ${reconnectCountRef.current}/${reconnectAttempts}`);
          
          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          // Set a timeout for the next reconnection attempt with exponential backoff
          const delay = reconnectInterval * Math.pow(1.5, reconnectCountRef.current - 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (enableLogging) console.log(`🔄 Reconnecting to Socket.IO server...`);
            socketClient.connect();
          }, delay);
        } else {
          if (enableLogging) console.error(`❌ Maximum reconnection attempts reached`);
          
          // Show toast on maximum reconnection attempts
          toast.error('サーバーに接続できません。更新してください。');
        }
      });
      
      // Set the socket
      setSocket(socketClient);
      
      // Connect to the server
      socketClient.connect();
      
      // Clean up function
      return () => {
        if (enableLogging) console.log('🧹 Cleaning up Socket.IO connection');
        socketClient.disconnect();
        
        // Clear any reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
    } catch (err) {
      console.error('Error creating Socket.IO connection:', err);
      setError(err);
      return null;
    }
  }, [socket, getSocketServer, enableLogging, reconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onReconnect]);
  
  // Disconnect from Socket.IO server
  const disconnect = useCallback(() => {
    if (socket) {
      if (enableLogging) console.log('🔌 Disconnecting from Socket.IO server');
      socket.disconnect();
      setIsConnected(false);
    }
    
    // Clear any reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [socket, enableLogging]);
  
  // Emit event to Socket.IO server
  const emit = useCallback((event, data, callback) => {
    if (!socket || !isConnected) {
      if (enableLogging) console.warn(`❌ Cannot emit event "${event}": Socket is not connected`);
      return false;
    }
    
    try {
      if (enableLogging) console.log(`📤 Emitting event "${event}":`, data);
      
      if (callback) {
        socket.emit(event, data, callback);
      } else {
        socket.emit(event, data);
      }
      
      return true;
    } catch (err) {
      console.error(`❌ Error emitting event "${event}":`, err);
      return false;
    }
  }, [socket, isConnected, enableLogging]);
  
  // Subscribe to Socket.IO events
  const on = useCallback((event, callback) => {
    if (!socket) {
      if (enableLogging) console.warn(`❌ Cannot subscribe to event "${event}": Socket is not initialized`);
      return () => {};
    }
    
    if (enableLogging) console.log(`👂 Subscribing to event "${event}"`);
    socket.on(event, callback);
    
    // Return unsubscribe function
    return () => {
      if (enableLogging) console.log(`🔇 Unsubscribing from event "${event}"`);
      socket.off(event, callback);
    };
  }, [socket, enableLogging]);
  
  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);
  
  return {
    socket,
    isConnected,
    error,
    connect,
    disconnect,
    emit,
    on,
  };
};

export default useSocketIO;