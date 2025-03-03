import apiClient from './client';

const chatApi = {
  // Channels
  getChannels: (params) => apiClient.get('/api/chat/channels/', { params }),
  
  getChannel: (id) => apiClient.get(`/api/chat/channels/${id}/`),
  
  createChannel: (data) => apiClient.post('/api/chat/channels/', data),
  
  updateChannel: (id, data) => apiClient.patch(`/api/chat/channels/${id}/`, data),
  
  deleteChannel: (id) => apiClient.delete(`/api/chat/channels/${id}/`),
  
  // Channel messages
  getChannelMessages: (channelId, params) => 
    apiClient.get(`/api/chat/channels/${channelId}/messages/`, { params }),
  
  // Channel members
  getChannelMembers: (channelId) => 
    apiClient.get(`/api/chat/channels/${channelId}/members/`),
  
  addChannelMember: (channelId, userId) => 
    apiClient.post(`/api/chat/channels/${channelId}/add_member/`, { user_id: userId }),
  
  removeChannelMember: (channelId, userId) => 
    apiClient.post(`/api/chat/channels/${channelId}/remove_member/`, { user_id: userId }),
  
  // Messages
  getMessages: (params) => apiClient.get('/api/chat/messages/', { params }),
  
  getMessage: (id) => apiClient.get(`/api/chat/messages/${id}/`),
  
  createMessage: (data) => {
    // Handle both plain JSON and FormData (for file uploads)
    if (data instanceof FormData) {
      return apiClient.post('/api/chat/messages/', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
    return apiClient.post('/api/chat/messages/', data);
  },
  
  updateMessage: (id, data) => apiClient.patch(`/api/chat/messages/${id}/`, data),
  
  deleteMessage: (id) => apiClient.delete(`/api/chat/messages/${id}/`),
  
  // Message threads
  getThreadMessages: (messageId) => 
    apiClient.get(`/api/chat/messages/${messageId}/thread/`),
  
  // Message reactions
  addReaction: (messageId, emoji) => 
    apiClient.post(`/api/chat/messages/${messageId}/react/`, { emoji }),
  
  // Direct messages
  createDirectMessageChannel: (userId) => 
    apiClient.post('/api/chat/direct-messages/', { user_id: userId }),
  
  // Workspace channels
  getWorkspaceChannels: (workspaceId) => 
    apiClient.get(`/api/chat/workspaces/${workspaceId}/channels/`),
  
  // Search messages
  searchMessages: (workspaceId, query, params = {}) => 
    apiClient.get(`/api/chat/workspaces/${workspaceId}/search/`, { 
      params: { query, ...params } 
    }),
  
  // User channels
  getUserChannels: () => apiClient.get('/api/chat/my-channels/'),
};

export default chatApi;