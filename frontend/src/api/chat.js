import apiClient from './client';

// Chat API service
const chatApi = {
  // Get channels for workspace
  getChannels: async (workspaceId) => {
    const response = await apiClient.get(`/chat/workspaces/${workspaceId}/channels/`);
    return response.data;
  },
  
  // Get a specific channel by ID
  getChannel: async (channelId) => {
    const response = await apiClient.get(`/chat/channels/${channelId}/`);
    return response.data;
  },
  
  // Create a new channel
  createChannel: async (workspaceId, channelData) => {
    const response = await apiClient.post(`/chat/workspaces/${workspaceId}/channels/`, channelData);
    return response.data;
  },
  
  // Update a channel
  updateChannel: async (channelId, channelData) => {
    const response = await apiClient.patch(`/chat/channels/${channelId}/`, channelData);
    return response.data;
  },
  
  // Delete a channel
  deleteChannel: async (channelId) => {
    const response = await apiClient.delete(`/chat/channels/${channelId}/`);
    return response.data;
  },
  
  // Get messages for a channel
  getMessages: async (channelId, params = {}) => {
    const response = await apiClient.get(`/chat/channels/${channelId}/messages/`, { params });
    return response.data;
  },
  
  // Send a message
  sendMessage: async (channelId, messageData) => {
    const response = await apiClient.post(`/chat/channels/${channelId}/messages/`, messageData);
    return response.data;
  },
  
  // Get thread messages
  getThreadMessages: async (parentMessageId, params = {}) => {
    const response = await apiClient.get(`/chat/messages/${parentMessageId}/thread/`, { params });
    return response.data;
  },
  
  // Update a message
  updateMessage: async (messageId, messageData) => {
    const response = await apiClient.patch(`/chat/messages/${messageId}/`, messageData);
    return response.data;
  },
  
  // Delete a message
  deleteMessage: async (messageId) => {
    const response = await apiClient.delete(`/chat/messages/${messageId}/`);
    return response.data;
  },
  
  // Add message reaction
  addReaction: async (messageId, reactionData) => {
    const response = await apiClient.post(`/chat/messages/${messageId}/reactions/`, reactionData);
    return response.data;
  },
  
  // Remove message reaction
  removeReaction: async (messageId, emojiName) => {
    const response = await apiClient.delete(`/chat/messages/${messageId}/reactions/${emojiName}/`);
    return response.data;
  },
  
  // Upload attachment
  uploadAttachment: async (messageId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(`/chat/messages/${messageId}/attachments/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Get channel members
  getChannelMembers: async (channelId) => {
    const response = await apiClient.get(`/chat/channels/${channelId}/members/`);
    return response.data;
  },
  
  // Add member to channel
  addChannelMember: async (channelId, memberData) => {
    const response = await apiClient.post(`/chat/channels/${channelId}/members/`, memberData);
    return response.data;
  },
  
  // Remove member from channel
  removeChannelMember: async (channelId, userId) => {
    const response = await apiClient.delete(`/chat/channels/${channelId}/members/${userId}/`);
    return response.data;
  },
  
  // Update member role in channel
  updateChannelMemberRole: async (channelId, userId, roleData) => {
    const response = await apiClient.patch(`/chat/channels/${channelId}/members/${userId}/`, roleData);
    return response.data;
  },
  
  // Search messages
  searchMessages: async (workspaceId, query) => {
    const response = await apiClient.get(`/chat/workspaces/${workspaceId}/search/`, { 
      params: { query } 
    });
    return response.data;
  },
  
  // Create or get direct message channel
  getDirectMessageChannel: async (userId) => {
    const response = await apiClient.post('/chat/direct-messages/', { user_id: userId });
    return response.data;
  },
};

export default chatApi;