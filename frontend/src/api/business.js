import apiClient from './client';

// Business API service
const businessApi = {
  // Get current user's business
  getCurrentBusiness: async () => {
    const response = await apiClient.get('/business/current/');
    return response.data;
  },
  
  // Create a new business
  createBusiness: async (businessData) => {
    const response = await apiClient.post('/business/', businessData);
    return response.data;
  },
  
  // Update business
  updateBusiness: async (businessId, businessData) => {
    const response = await apiClient.patch(`/business/${businessId}/`, businessData);
    return response.data;
  },
  
  // Get business details
  getBusinessDetails: async (businessId) => {
    const response = await apiClient.get(`/business/${businessId}/`);
    return response.data;
  },
  
  // Get workspaces for a business
  getWorkspaces: async (businessId) => {
    const response = await apiClient.get(`/business/${businessId}/workspaces/`);
    return response.data;
  },
  
  // Create a workspace
  createWorkspace: async (businessId, workspaceData) => {
    const response = await apiClient.post(`/business/${businessId}/workspaces/`, workspaceData);
    return response.data;
  },
  
  // Update a workspace
  updateWorkspace: async (workspaceId, workspaceData) => {
    const response = await apiClient.patch(`/business/workspaces/${workspaceId}/`, workspaceData);
    return response.data;
  },
  
  // Get workspace details
  getWorkspaceDetails: async (workspaceId) => {
    const response = await apiClient.get(`/business/workspaces/${workspaceId}/`);
    return response.data;
  },
  
  // Invite a user to the business
  inviteUser: async (businessId, invitationData) => {
    const response = await apiClient.post(`/business/${businessId}/invitations/`, invitationData);
    return response.data;
  },
  
  // Get business invitations
  getInvitations: async (businessId) => {
    const response = await apiClient.get(`/business/${businessId}/invitations/`);
    return response.data;
  },
  
  // Cancel an invitation
  cancelInvitation: async (invitationId) => {
    const response = await apiClient.delete(`/business/invitations/${invitationId}/`);
    return response.data;
  },
  
  // Accept an invitation (for the invited user)
  acceptInvitation: async (token) => {
    const response = await apiClient.post(`/business/invitations/accept/`, { token });
    return response.data;
  },
  
  // Decline an invitation (for the invited user)
  declineInvitation: async (token) => {
    const response = await apiClient.post(`/business/invitations/decline/`, { token });
    return response.data;
  },
};

export default businessApi;