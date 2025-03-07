import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ChatProvider, useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePaperClip,
  HiOutlineEmojiHappy,
  HiOutlineDotsVertical,
  HiOutlineInformationCircle,
  HiOutlineRefresh,
  HiOutlineX,
  HiOutlineReply,
  HiOutlineClipboardCopy,
  HiOutlineExclamation
} from 'react-icons/hi';

// Inner component that uses the chat context
const ChatContent = () => {
  const { 
    channels, 
    directMessages, 
    activeChannel, 
    messages,
    loading,
    error,
    isConnected,
    connectionAttempts,
    selectChannel,
    sendMessage,
    createChannel,
    startDirectMessage,
    loadChannels,
    handleReconnect
  } = useChat();
  
  const { currentUser } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  
  // メッセージ選択ハンドラー
  const handleMessageSelect = useCallback((message) => {
    setSelectedMessage(message);
  }, []);
  
  // メッセージのコピー
  const copyMessageContent = useCallback(() => {
    if (selectedMessage?.content) {
      navigator.clipboard.writeText(selectedMessage.content)
        .then(() => {
          alert('メッセージをクリップボードにコピーしました');
        })
        .catch(() => {
          alert('コピーに失敗しました');
        });
    }
  }, [selectedMessage]);
  
  // 返信機能
  const replyToMessage = useCallback(() => {
    if (selectedMessage) {
      // 返信フォーマットを入力欄に入れる
      const replyPrefix = `> ${selectedMessage.content}\n\n`;
      setMessageText(replyPrefix);
      setSelectedMessage(null);
      messageInputRef.current?.focus();
    }
  }, [selectedMessage]);
  
  // Filter channels by search query
  const filteredChannels = channels.filter(channel => 
    channel.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter direct messages by search query
  const filteredDMs = directMessages.filter(dm => 
    dm.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // チャンネル初期選択/接続処理のためのフラグ
  const initialSetupDone = useRef(false);
  const retryAttempts = useRef(0);
  const MAX_RETRY_ATTEMPTS = 3;
  
  // ページ読み込み時に必ずチャンネルを選択し、WebSocket接続を確立
  useEffect(() => {
    // すでに初期設定が完了している場合は何もしない
    if (initialSetupDone.current) {
      return;
    }
    
    // チャンネルが読み込まれていない場合は、まだ処理しない
    if (channels.length === 0) {
      return;
    }
    
    console.log('🔄 チャンネル初期化 (試行:', retryAttempts.current, '/', MAX_RETRY_ATTEMPTS, ')');
    
    // アクティブチャンネルがない場合は最初のチャンネルを選択
    if (!activeChannel) {
      console.log('📌 初回選択: 最初のチャンネルを選択');
      // 選択を一度だけ行う
      selectChannel(channels[0]);
      
      // 接続が確立されていない場合は再試行するが、最大回数を制限
      if (!isConnected && retryAttempts.current < MAX_RETRY_ATTEMPTS) {
        retryAttempts.current += 1;
        
        // 遅延を増やして再試行
        const delay = 1000 + (retryAttempts.current * 1000);
        console.log(`🔌 WebSocket接続を ${delay}ms 後に再試行... (${retryAttempts.current}/${MAX_RETRY_ATTEMPTS})`);
        
        setTimeout(() => {
          if (!isConnected) {
            handleReconnect();
          }
        }, delay);
      } else if (retryAttempts.current >= MAX_RETRY_ATTEMPTS) {
        // 最大試行回数に達したら、それ以上試行しない
        console.log('⚠️ 最大再試行回数に達しました。');
        initialSetupDone.current = true;
      } else if (isConnected) {
        // 接続が確立されている場合は初期設定完了とマーク
        console.log('✅ 接続が確立されました。初期設定完了。');
        initialSetupDone.current = true;
      }
    } else {
      // アクティブチャンネルがすでに選択されている
      console.log('✅ チャンネルは既に選択されています:', activeChannel.name);
      initialSetupDone.current = true;
    }
  }, [channels, activeChannel, selectChannel, isConnected, handleReconnect]);
  
  // Focus input field when channel changes and debug messages
  useEffect(() => {
    if (activeChannel && messageInputRef.current) {
      messageInputRef.current.focus();
    }
    
    // メッセージデータのデバッグ
    console.log('ChatPage: messages状態', {
      count: messages.length,
      activeChannel
    });
    
    if (messages.length > 0) {
      console.log('メッセージ描画:', messages);
    }
  }, [activeChannel, messages]);
  
  // メッセージロード完了イベントを監視
  useEffect(() => {
    const handleMessagesLoaded = (event) => {
      console.log('メッセージロード完了イベント検知:', event.detail);
      // メッセージの表示状態を確認
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    };
    
    window.addEventListener('messages-loaded', handleMessagesLoaded);
    return () => {
      window.removeEventListener('messages-loaded', handleMessagesLoaded);
    };
  }, []);
  
  // Handler to refresh channels
  const handleRefreshChannels = useCallback(() => {
    setIsRefreshing(true);
    loadChannels()
      .finally(() => {
        setTimeout(() => {
          setIsRefreshing(false);
        }, 500);
      });
  }, [loadChannels]);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    // Capture message text and clear input immediately for responsiveness
    const messageToSend = messageText.trim();
    setMessageText('');
    
    // Send the message
    sendMessage(messageToSend)
      .then(() => {
        // Focus back on input after sending
        messageInputRef.current?.focus();
      })
      .catch(error => {
        console.error('Failed to send message:', error);
        // Restore message text if sending failed completely
        setMessageText(messageToSend);
      });
  };
  
  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    
    // Find the default workspace
    const workspace = channels.length > 0 
      ? channels[0].workspace.id 
      : 1; // Default to workspace ID 1 if no channels exist
    
    createChannel({
      name: channelName,
      description: channelDescription,
      workspace,
      channel_type: 'public'
    })
      .then(newChannel => {
        setShowNewChannelModal(false);
        setChannelName('');
        setChannelDescription('');
        selectChannel(newChannel);
      })
      .catch(error => {
        console.error('Failed to create channel:', error);
        alert('チャンネルの作成に失敗しました。もう一度お試しください。');
      });
  };
  
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid time';
    }
  };
  
  // Get initials for avatar
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    try {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    } catch (error) {
      return '?';
    }
  };
  
  // Helper function to safely access nested properties
  const safe = (fn, fallback = '') => {
    try {
      return fn() || fallback;
    } catch (e) {
      return fallback;
    }
  };
  
  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search..."
              className="w-full py-2 pl-8 pr-3 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-2">
              <HiOutlineSearch className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Connection status with refresh button */}
        <div className="px-4 py-2 flex justify-between items-center">
          <div className={`text-xs font-medium flex items-center ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? '接続済み' : '未接続'} 
            <span className={`inline-block w-2 h-2 ml-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            
            {/* 接続ボタンは常に表示 */}
            <button 
              className={`ml-2 text-xs ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-1.5 py-0.5 rounded hover:bg-green-200`}
              onClick={handleReconnect}
              title="WebSocket接続状態の更新"
            >
              {isConnected ? '再確認' : '接続する'}
            </button>
          </div>
          
          <div className="flex items-center space-x-1">
            <button 
              className={`text-gray-500 hover:text-gray-900 p-1 rounded ${isRefreshing ? 'animate-spin' : ''}`}
              onClick={handleRefreshChannels}
              disabled={isRefreshing}
              title="チャンネル一覧を更新"
            >
              <HiOutlineRefresh className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Channels */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</h3>
            <button 
              className="text-gray-500 hover:text-gray-900"
              onClick={() => setShowNewChannelModal(true)}
            >
              <HiOutlinePlus className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {filteredChannels.map(channel => (
              <li key={channel.id}>
                <button 
                  className={`flex items-center w-full px-2 py-1 text-sm rounded-md ${activeChannel?.id === channel.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200'}`}
                  onClick={() => selectChannel(channel)}
                >
                  <span className="mr-1">#</span>
                  <span className="flex-1 text-left">{channel.name}</span>
                  {channel.unread_count > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                      {channel.unread_count}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {filteredChannels.length === 0 && !loading && (
              <li className="text-gray-500 text-xs italic px-2 py-1">
                {searchQuery ? 'No matching channels' : 'No channels'}
              </li>
            )}
            {loading && (
              <li className="text-gray-500 text-xs px-2 py-1">
                Loading...
              </li>
            )}
          </ul>
        </div>
        
        {/* Direct Messages */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direct Messages</h3>
            <button className="text-gray-500 hover:text-gray-900">
              <HiOutlinePlus className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {filteredDMs.map(dm => (
              <li key={dm.id}>
                <button 
                  className={`flex items-center w-full px-2 py-1 text-sm rounded-md ${activeChannel?.id === dm.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200'}`}
                  onClick={() => selectChannel(dm)}
                >
                  <div className="relative mr-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs font-medium">
                      {getInitials(dm.name)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white bg-gray-400"></div>
                  </div>
                  <span className="flex-1 text-left">{dm.name}</span>
                  {dm.unread_count > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                      {dm.unread_count}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {filteredDMs.length === 0 && !loading && (
              <li className="text-gray-500 text-xs italic px-2 py-1">
                {searchQuery ? 'No matching direct messages' : 'No direct messages'}
              </li>
            )}
          </ul>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        {activeChannel && (
          <div className="px-6 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold">
                {activeChannel.is_direct_message 
                  ? activeChannel.name
                  : `#${activeChannel.name}`}
              </h2>
              <div className="ml-auto flex items-center space-x-3">
                <button className="text-gray-500 hover:text-gray-900">
                  <HiOutlineSearch className="w-5 h-5" />
                </button>
                <button className="text-gray-500 hover:text-gray-900">
                  <HiOutlineInformationCircle className="w-5 h-5" />
                </button>
                <button className="text-gray-500 hover:text-gray-900">
                  <HiOutlineDotsVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 mb-4 rounded">
              {error}
            </div>
          )}
          
          {loading && !messages.length ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.isArray(messages) && messages.length > 0 ? (
                <>
                  {messages.map(msg => {
                    if (!msg) {
                      console.warn('空のメッセージをスキップ');
                      return null; // nullメッセージをスキップ
                    }
                    
                    // メッセージキーの生成 (id, message_id, または一時的なキー)
                    const messageKey = msg.id || msg.message_id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    
                    // ユーザー情報の安全な取得
                    const userId = safe(() => msg.user?.id || (msg.user ? msg.user : null));
                    const isCurrentUser = userId === currentUser?.id;
                    const isSelected = selectedMessage?.id === msg.id;
                    
                    return (
                      <div 
                        key={messageKey} 
                        className={`flex ${isCurrentUser ? 'justify-end' : 'items-start'} mb-4 ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        } p-2 rounded-lg cursor-pointer transition-colors relative group`}
                        onClick={() => handleMessageSelect(msg)}
                      >
                        {!isCurrentUser && (
                          <div className="flex-shrink-0 mr-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800">
                              {getInitials(safe(() => msg.user.full_name))}
                            </div>
                          </div>
                        )}
                        <div className={`flex flex-col max-w-[70%] ${isCurrentUser ? 'items-end' : ''}`}>
                          {!isCurrentUser && (
                            <div className="flex items-center mb-1">
                              <span className="font-medium text-gray-900 mr-2">{safe(() => msg.user.full_name, 'Unknown')}</span>
                              <span className="text-xs text-gray-500">{formatTime(msg.created_at || msg.timestamp)}</span>
                            </div>
                          )}
                          <div 
                            className={`px-4 py-2 rounded-lg break-words ${
                              isCurrentUser 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {/* メッセージ内容の表示（コンテンツが存在する場合のみ） */}
                            {msg.content ? (
                              msg.content.split('\n').map((line, i) => 
                                line.startsWith('>') ? (
                                  <div key={i} className="pl-2 border-l-2 border-gray-400 italic text-gray-500 dark:text-gray-400">
                                    {line.substring(1)}
                                  </div>
                                ) : (
                                  <div key={i}>{line || ' '}</div>
                                )
                              )
                            ) : (
                              <div className="italic text-gray-400">[空のメッセージ]</div>
                            )}
                          </div>
                          {isCurrentUser && (
                            <span className="text-xs text-gray-500 mt-1">{formatTime(msg.created_at || msg.timestamp)}</span>
                          )}
                          
                          {/* メッセージ操作メニュー（選択時） */}
                          {isSelected && (
                            <div className="absolute top-0 right-0 bg-white shadow-md rounded-md p-1 flex space-x-1 border border-gray-200">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  replyToMessage();
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="返信"
                              >
                                <HiOutlineReply className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyMessageContent();
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="コピー"
                              >
                                <HiOutlineClipboardCopy className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMessage(null);
                                }}
                                className="p-1 text-gray-500 hover:bg-gray-50 rounded"
                                title="閉じる"
                              >
                                <HiOutlineX className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : activeChannel ? (
                <div className="text-center text-gray-500">
                  No messages in this channel yet.
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  Select a channel to start chatting.
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message Input */}
        {activeChannel && (
          <div className="p-4 border-t border-gray-200 bg-white">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <button 
                type="button" 
                className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100"
                onClick={() => alert('添付機能は準備中です')}
              >
                <HiOutlinePaperClip className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder={`${activeChannel.name ? (activeChannel.is_direct_message ? activeChannel.name : `#${activeChannel.name}`) : 'チャンネル'} にメッセージを送信`}
                className="flex-1 py-2 px-4 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  // Enterキーでフォーム送信（Shift+Enterは改行）
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (messageText.trim()) {
                      handleSendMessage(e);
                    }
                  }
                }}
                // 常に入力可能に（オフライン時もメッセージを書けるようにする）
                disabled={false}
                ref={messageInputRef}
              />
              <button 
                type="button" 
                className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100"
                onClick={() => alert('絵文字機能は準備中です')}
              >
                <HiOutlineEmojiHappy className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={!messageText.trim()}
                className={`p-2 rounded-full ${messageText.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </form>
            
            {!isConnected ? (
              <div className="mt-2 text-xs text-red-600 flex items-center justify-between">
                <div className="flex items-center">
                  <HiOutlineExclamation className="w-4 h-4 mr-1" />
                  <span>WebSocket接続中... しばらくお待ちください</span>
                </div>
                <button
                  type="button"
                  onClick={handleReconnect}
                  className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                >
                  接続する
                </button>
              </div>
            ) : (
              <div className="mt-2 text-xs text-green-600 flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>リアルタイム通信接続中</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* New Channel Modal */}
      {showNewChannelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 transition-opacity bg-black bg-opacity-50" onClick={() => setShowNewChannelModal(false)}></div>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Create a new channel
              </h3>
              
              <form onSubmit={handleCreateChannel} className="mt-4">
                <div className="mb-4">
                  <label htmlFor="channelName" className="block text-sm font-medium text-gray-700">Channel name</label>
                  <input
                    type="text"
                    id="channelName"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="channelDescription" className="block text-sm font-medium text-gray-700">Description (optional)</label>
                  <textarea
                    id="channelDescription"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={channelDescription}
                    onChange={(e) => setChannelDescription(e.target.value)}
                    rows={3}
                  ></textarea>
                </div>
                
                <div className="flex justify-end mt-4 space-x-2">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setShowNewChannelModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={!channelName.trim()}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper component that provides the chat context
const ChatPage = () => {
  return (
    <ChatProvider>
      <ChatContent />
    </ChatProvider>
  );
};

export default ChatPage;