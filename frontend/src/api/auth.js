import apiClient from './client';

// Authentication API service
const authApi = {
  // Login with email, password and business ID
  login: async (email, password, businessId) => {
    const response = await apiClient.post('/auth/token/login/', { 
      email, 
      password,
      business_id: businessId
    });
    return response.data;
  },
  
  // Register a new user
  register: async (userData) => {
    const response = await apiClient.post('/auth/users/', userData);
    return response.data;
  },
  
  // Get current user profile
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/users/me/');
    return response.data;
  },
  
  // Log out user (invalidate token)
  logout: async () => {
    const response = await apiClient.post('/auth/token/logout/');
    return response.data;
  },
  
  // Request password reset
  requestPasswordReset: async (email) => {
    const response = await apiClient.post('/auth/users/reset_password/', { email });
    return response.data;
  },
  
  // Confirm password reset
  confirmPasswordReset: async (uid, token, newPassword) => {
    const response = await apiClient.post('/auth/users/reset_password_confirm/', {
      uid,
      token,
      new_password: newPassword,
      re_new_password: newPassword,
    });
    return response.data;
  },
  
  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.post('/auth/users/set_password/', {
      current_password: currentPassword,
      new_password: newPassword,
      re_new_password: newPassword,
    });
    return response.data;
  },
  
  // Update user profile
  updateProfile: async (userData) => {
    const response = await apiClient.patch('/auth/users/me/', userData);
    return response.data;
  },
};

export default authApi;