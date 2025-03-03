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
      return;
    }
    
    // Clear any existing connection
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    
    try {
      console.log(`Connecting to WebSocket: ${url}`);
      // Create new WebSocket connection
      websocketRef.current = new WebSocket(url);
      
      // Connection opened
      websocketRef.current.onopen = (event) => {
        console.log('WebSocket Connected', event);
        setIsConnected(true);
        setError(null);
        reconnectCount.current = 0;
        
        if (onOpen) onOpen(event);
      };
      
      // Listen for messages
      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          setMessages(prevMessages => [...prevMessages, data]);
          
          if (onMessage) onMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      // Connection closed
      websocketRef.current.onclose = (event) => {
        console.log('WebSocket Disconnected', event);
        setIsConnected(false);
        
        if (onClose) onClose(event);
        
        // Attempt to reconnect unless max attempts reached
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
      
      // Error handler
      websocketRef.current.onerror = (event) => {
        console.error('WebSocket Error:', event);
        setError(new Error('WebSocket connection error'));
        
        if (onError) onError(event);
      };
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      setError(err);
    }
  }, [url, onOpen, onMessage, onClose, onError, reconnectInterval, reconnectAttempts]);
  
  // Send message
  const sendMessage = useCallback((data) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', data);
      websocketRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn('Cannot send message: WebSocket not connected');
    return false;
  }, []);
  
  // Disconnect
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
  
  // Connect/disconnect when URL changes
  useEffect(() => {
    if (automaticOpen && url) {
      connect();
    } else if (!url && websocketRef.current) {
      disconnect();
    }
    
    // Cleanup on unmount or URL change
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