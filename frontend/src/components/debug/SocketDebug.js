import React, { useState, useEffect } from 'react';
import useSimpleSocketIO from '../../hooks/useSimpleSocketIO';

/**
 * Socket.IO接続のデバッグ用コンポーネント
 */
const SocketDebug = () => {
  const { socket, isConnected, error, lastPong, testConnection } = useSimpleSocketIO();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // 5秒ごとに接続テスト
  useEffect(() => {
    const interval = setInterval(() => {
      testConnection();
      setConnectionAttempts(prev => prev + 1);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [testConnection]);
  
  // メッセージ受信
  useEffect(() => {
    if (!socket) return;
    
    function onChatMessage(data) {
      console.log('メッセージ受信:', data);
      setMessages(prev => [...prev, data]);
    }
    
    socket.on('chat_message', onChatMessage);
    
    return () => {
      socket.off('chat_message', onChatMessage);
    };
  }, [socket]);
  
  // メッセージ送信
  const sendMessage = () => {
    if (!socket || !isConnected || !message.trim()) return;
    
    // テスト用メッセージ形式
    const messageData = {
      channel_id: "debug",
      content: message.trim(),
      timestamp: new Date().toISOString(),
      message_id: `temp-${Date.now()}`
    };
    
    socket.emit('chat_message', messageData, (response) => {
      console.log('送信結果:', response);
    });
    
    setMessage('');
  };
  
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Socket.IO接続デバッグ</h1>
      
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-lg font-semibold mb-2">接続状態</h2>
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <p>{isConnected ? '接続中' : '未接続'}</p>
        </div>
        
        {socket && (
          <p className="text-sm text-gray-600 mb-1">Socket ID: {socket.id || 'なし'}</p>
        )}
        
        <p className="text-sm text-gray-600 mb-1">接続試行回数: {connectionAttempts}</p>
        
        {lastPong && (
          <p className="text-sm text-gray-600 mb-1">最終Pong: {lastPong}</p>
        )}
        
        {error && (
          <p className="text-sm text-red-600 mt-2">エラー: {error}</p>
        )}
        
        <div className="mt-3">
          <button 
            onClick={testConnection}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            接続テスト
          </button>
        </div>
      </div>
      
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-lg font-semibold mb-2">メッセージ送信</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isConnected}
            placeholder={isConnected ? "メッセージを入力" : "未接続"}
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !message.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            送信
          </button>
        </div>
      </div>
      
      <div className="p-4 border rounded max-h-60 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2">受信メッセージ</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">メッセージはありません</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((msg, index) => (
              <li key={index} className="p-2 bg-gray-100 rounded">
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SocketDebug;