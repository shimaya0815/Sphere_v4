import React, { useState } from 'react';

const ChatPage = () => {
  const [activeChannel, setActiveChannel] = useState('general');
  const [message, setMessage] = useState('');
  
  // Mock data
  const channels = [
    { id: 'general', name: 'General', unread: 0 },
    { id: 'project-alpha', name: 'Project Alpha', unread: 2 },
    { id: 'sales', name: 'Sales Team', unread: 0 },
    { id: 'dev', name: 'Development', unread: 3 },
    { id: 'design', name: 'Design Team', unread: 0 },
  ];
  
  const directMessages = [
    { id: 'user1', name: 'John Doe', status: 'online', unread: 0 },
    { id: 'user2', name: 'Jane Smith', status: 'online', unread: 1 },
    { id: 'user3', name: 'Michael Johnson', status: 'offline', unread: 0 },
    { id: 'user4', name: 'Emily Wilson', status: 'away', unread: 0 },
  ];
  
  const mockMessages = {
    'general': [
      { id: 1, user: 'John Doe', avatar: 'JD', time: '10:23 AM', text: 'Good morning team! Hope everyone is doing well today.' },
      { id: 2, user: 'Jane Smith', avatar: 'JS', time: '10:25 AM', text: 'Morning John! All good here, starting to work on the new designs.' },
      { id: 3, user: 'Michael Johnson', avatar: 'MJ', time: '10:30 AM', text: 'Hello everyone. I just pushed the latest code changes. Please pull when you get a chance.' },
      { id: 4, user: 'You', avatar: 'YO', time: '10:32 AM', text: 'Thanks for the update Michael. I\'ll check it out now.', isMine: true },
      { id: 5, user: 'Emily Wilson', avatar: 'EW', time: '10:40 AM', text: 'I\'ve scheduled a client meeting for 2 PM. Can everyone make it?' },
    ],
    'project-alpha': [
      { id: 1, user: 'Jane Smith', avatar: 'JS', time: '9:15 AM', text: 'Let\'s discuss the project timeline today.' },
      { id: 2, user: 'John Doe', avatar: 'JD', time: '9:20 AM', text: 'Sounds good. I have some concerns about the deadline.' },
    ],
  };
  
  const currentMessages = mockMessages[activeChannel] || [];
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() === '') return;
    
    // In a real app, you would send this message to the server
    // and then update the UI when the server confirms receipt
    
    setMessage('');
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
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
        </div>
        
        {/* Channels */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</h3>
            <button className="text-gray-500 hover:text-gray-900">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            </button>
          </div>
          <ul className="space-y-1">
            {channels.map(channel => (
              <li key={channel.id}>
                <button 
                  className={`flex items-center w-full px-2 py-1 text-sm rounded-md ${activeChannel === channel.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200'}`}
                  onClick={() => setActiveChannel(channel.id)}
                >
                  <span className="mr-1">#</span>
                  <span className="flex-1 text-left">{channel.name}</span>
                  {channel.unread > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                      {channel.unread}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Direct Messages */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direct Messages</h3>
            <button className="text-gray-500 hover:text-gray-900">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            </button>
          </div>
          <ul className="space-y-1">
            {directMessages.map(dm => (
              <li key={dm.id}>
                <button 
                  className={`flex items-center w-full px-2 py-1 text-sm rounded-md ${activeChannel === dm.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200'}`}
                  onClick={() => setActiveChannel(dm.id)}
                >
                  <div className="relative mr-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs font-medium">
                      {dm.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                      dm.status === 'online' ? 'bg-green-500' : 
                      dm.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}></div>
                  </div>
                  <span className="flex-1 text-left">{dm.name}</span>
                  {dm.unread > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                      {dm.unread}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="px-6 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold">
              {activeChannel.startsWith('user') 
                ? directMessages.find(dm => dm.id === activeChannel)?.name || 'Chat'
                : `#${channels.find(ch => ch.id === activeChannel)?.name || 'Channel'}`}
            </h2>
            <div className="ml-auto flex items-center space-x-3">
              <button className="text-gray-500 hover:text-gray-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </button>
              <button className="text-gray-500 hover:text-gray-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="space-y-6">
            {currentMessages.length > 0 ? (
              currentMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'items-start'}`}>
                  {!msg.isMine && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800">
                        {msg.avatar}
                      </div>
                    </div>
                  )}
                  <div className={`flex flex-col ${msg.isMine ? 'items-end' : ''}`}>
                    {!msg.isMine && (
                      <div className="flex items-center mb-1">
                        <span className="font-medium text-gray-900 mr-2">{msg.user}</span>
                        <span className="text-xs text-gray-500">{msg.time}</span>
                      </div>
                    )}
                    <div className={`px-4 py-2 rounded-lg ${msg.isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {msg.text}
                    </div>
                    {msg.isMine && (
                      <span className="text-xs text-gray-500 mt-1">{msg.time}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500">
                No messages in this channel yet.
              </div>
            )}
          </div>
        </div>
        
        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <button type="button" className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
              </svg>
            </button>
            <input
              type="text"
              placeholder={`Message ${activeChannel.startsWith('user') ? directMessages.find(dm => dm.id === activeChannel)?.name : `#${channels.find(ch => ch.id === activeChannel)?.name}`}`}
              className="flex-1 py-2 px-4 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className={`p-2 rounded-full ${message.trim() ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;