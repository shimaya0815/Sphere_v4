import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ChatProvider, useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePaperClip,
  HiOutlineEmojiHappy,
  HiOutlineDotsVertical,
  HiOutlineInformationCircle
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
    selectChannel,
    sendMessage,
    createChannel,
    startDirectMessage
  } = useChat();
  
  const { currentUser } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  
  const messagesEndRef = useRef(null);
  
  // Filter channels by search query
  const filteredChannels = channels.filter(channel => 
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter direct messages by search query
  const filteredDMs = directMessages.filter(dm => 
    dm.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Select first channel if none is selected and channels are loaded
  useEffect(() => {
    if (!activeChannel && channels.length > 0) {
      selectChannel(channels[0]);
    }
  }, [channels, activeChannel, selectChannel]);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    sendMessage(messageText)
      .then(() => {
        setMessageText('');
      })
      .catch(error => {
        console.error('Failed to send message:', error);
      });
  };
  
  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    
    // Find the default workspace
    const workspace = channels.length > 0 
      ? channels[0].workspace.id 
      : null;
    
    if (!workspace) {
      alert('No workspace available to create a channel');
      return;
    }
    
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
        
        {/* Connection status */}
        <div className={`px-4 py-2 text-xs font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
          {isConnected ? 'Connected' : 'Disconnected'} 
          <span className={`inline-block w-2 h-2 ml-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
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
              {messages.length > 0 ? (
                messages.map(msg => (
                  <div key={msg.id || `temp-${Date.now()}`} className={`flex ${safe(() => msg.user.id) === currentUser?.id ? 'justify-end' : 'items-start'}`}>
                    {safe(() => msg.user.id) !== currentUser?.id && (
                      <div className="flex-shrink-0 mr-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800">
                          {getInitials(safe(() => msg.user.full_name))}
                        </div>
                      </div>
                    )}
                    <div className={`flex flex-col ${safe(() => msg.user.id) === currentUser?.id ? 'items-end' : ''}`}>
                      {safe(() => msg.user.id) !== currentUser?.id && (
                        <div className="flex items-center mb-1">
                          <span className="font-medium text-gray-900 mr-2">{safe(() => msg.user.full_name, 'Unknown')}</span>
                          <span className="text-xs text-gray-500">{formatTime(msg.created_at)}</span>
                        </div>
                      )}
                      <div className={`px-4 py-2 rounded-lg ${safe(() => msg.user.id) === currentUser?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {msg.content || ''}
                      </div>
                      {safe(() => msg.user.id) === currentUser?.id && (
                        <span className="text-xs text-gray-500 mt-1">{formatTime(msg.created_at)}</span>
                      )}
                    </div>
                  </div>
                ))
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
              <button type="button" className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100">
                <HiOutlinePaperClip className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder={`Message ${activeChannel.is_direct_message ? activeChannel.name : `#${activeChannel.name}`}`}
                className="flex-1 py-2 px-4 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={!isConnected}
              />
              <button type="button" className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100">
                <HiOutlineEmojiHappy className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={!messageText.trim() || !isConnected}
                className={`p-2 rounded-full ${messageText.trim() && isConnected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </form>
            
            {!isConnected && (
              <div className="mt-2 text-xs text-red-600">
                Connection lost. Messages may not be delivered.
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