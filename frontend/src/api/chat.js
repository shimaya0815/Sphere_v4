import apiClient from './client';

const chatApi = {
  // Channels
  getChannels: (params) => apiClient.get('/api/chat/channels/', { params }),
  
  getChannel: (id) => apiClient.get(`/api/chat/channels/${id}/`),
  
  createChannel: async (data) => {
    try {
      // APIプレフィックスなしのエンドポイントを試す
      try {
        return await apiClient.post('/chat/channels/', data);
      } catch (firstError) {
        console.log('Trying with API prefix after first attempt failed');
        return await apiClient.post('/api/chat/channels/', data);
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  },
  
  updateChannel: (id, data) => apiClient.patch(`/api/chat/channels/${id}/`, data),
  
  deleteChannel: (id) => apiClient.delete(`/api/chat/channels/${id}/`),
  
  // Mark channel as read
  markChannelAsRead: (channelId) => {
    // FormDataを使用してMultipart/form-dataリクエストを送信
    const formData = new FormData();
    formData.append('channel_id', channelId);
    
    return apiClient.post('/api/chat/messages/mark_read/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
  },
  
  // Channel messages
  getChannelMessages: async (channelId, params) => {
    try {
      // APIプレフィックスなしのエンドポイントを試す
      try {
        return await apiClient.get(`/chat/channels/${channelId}/messages/`, { params });
      } catch (firstError) {
        console.log('Trying messages with API prefix after first attempt failed');
        return await apiClient.get(`/api/chat/channels/${channelId}/messages/`, { params });
      }
    } catch (error) {
      console.error('Error fetching channel messages:', error);
      throw error;
    }
  },
  
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
  
  // デフォルトワークスペースを取得
  getDefaultWorkspace: async () => {
    try {
      const response = await apiClient.get('/api/business/workspaces/', {
        params: { is_default: true, limit: 1 }
      });
      const workspaces = response.data.results || response.data;
      return Array.isArray(workspaces) && workspaces.length > 0 ? workspaces[0] : null;
    } catch (error) {
      console.error('Error fetching default workspace:', error);
      return null;
    }
  },
  
  // ユーザー自身のチャンネル一覧を取得
  getMyChannels: async () => {
    try {
      // APIプレフィックスなしのエンドポイントも試す
      try {
        const response = await apiClient.get('/chat/my-channels/');
        return response.data;
      } catch (firstError) {
        console.log('Trying with API prefix after first attempt failed');
        const response = await apiClient.get('/api/chat/my-channels/');
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching my channels:', error);
      return [];
    }
  },
  
  // タスク関連チャンネルを検索
  findTaskChannel: async (taskId) => {
    try {
      const channels = await chatApi.getMyChannels();
      for (const workspace of channels) {
        const foundChannel = workspace.channels.find(
          channel => channel.name.startsWith(`task-${taskId}-`)
        );
        if (foundChannel) return foundChannel;
      }
      return null;
    } catch (error) {
      console.error('Error finding task channel:', error);
      return null;
    }
  },
  
  // Helper methods for compatibility with the mock implementation
  sendMessage: (data) => {
    // 新しいAPIはチャンネルIDを直接データオブジェクトから取得
    const channelId = data.channel;
    const messageData = data;
    
    if (messageData.files && messageData.files.length > 0) {
      const formData = new FormData();
      formData.append('channel', channelId);
      formData.append('content', messageData.content);
      
      if (messageData.parent_message) {
        formData.append('parent_message', messageData.parent_message);
      }
      
      if (messageData.mentioned_user_ids && messageData.mentioned_user_ids.length > 0) {
        messageData.mentioned_user_ids.forEach(id => {
          formData.append('mentioned_user_ids', id);
        });
      }
      
      // Add files
      messageData.files.forEach(file => {
        formData.append('files', file);
      });
      
      return apiClient.post('/api/chat/messages/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } else {
      return apiClient.post('/api/chat/messages/', messageData);
    }
  },
  
  getDirectMessageChannel: (userId) => 
    apiClient.post('/api/chat/direct-messages/', { user_id: userId }),
};

export default chatApi;