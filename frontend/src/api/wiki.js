import apiClient from './client';

// Wiki API service
const wikiApi = {
  // Get all wiki pages with optional filters
  getPages: async (filters = {}) => {
    const response = await apiClient.get('/wiki/pages/', { params: filters });
    return response.data;
  },
  
  // Get a specific wiki page by ID or slug
  getPage: async (pageIdentifier) => {
    const response = await apiClient.get(`/wiki/pages/${pageIdentifier}/`);
    return response.data;
  },
  
  // Create a new wiki page
  createPage: async (pageData) => {
    const response = await apiClient.post('/wiki/pages/', pageData);
    return response.data;
  },
  
  // Update a wiki page
  updatePage: async (pageId, pageData) => {
    const response = await apiClient.patch(`/wiki/pages/${pageId}/`, pageData);
    return response.data;
  },
  
  // Delete a wiki page
  deletePage: async (pageId) => {
    const response = await apiClient.delete(`/wiki/pages/${pageId}/`);
    return response.data;
  },
  
  // Get page versions
  getPageVersions: async (pageId) => {
    const response = await apiClient.get(`/wiki/pages/${pageId}/versions/`);
    return response.data;
  },
  
  // Get a specific version of a page
  getPageVersion: async (pageId, versionId) => {
    const response = await apiClient.get(`/wiki/pages/${pageId}/versions/${versionId}/`);
    return response.data;
  },
  
  // Restore a page to a previous version
  restorePageVersion: async (pageId, versionId) => {
    const response = await apiClient.post(`/wiki/pages/${pageId}/versions/${versionId}/restore/`);
    return response.data;
  },
  
  // Get page attachments
  getAttachments: async (pageId) => {
    const response = await apiClient.get(`/wiki/pages/${pageId}/attachments/`);
    return response.data;
  },
  
  // Upload an attachment to a page
  uploadAttachment: async (pageId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(`/wiki/pages/${pageId}/attachments/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Delete an attachment
  deleteAttachment: async (attachmentId) => {
    const response = await apiClient.delete(`/wiki/attachments/${attachmentId}/`);
    return response.data;
  },
  
  // Search wiki pages
  searchPages: async (query) => {
    const response = await apiClient.get('/wiki/search/', { params: { query } });
    return response.data;
  },
  
  // Get child pages
  getChildPages: async (parentId) => {
    const response = await apiClient.get(`/wiki/pages/${parentId}/children/`);
    return response.data;
  },
  
  // Reorder pages
  reorderPages: async (orderData) => {
    const response = await apiClient.post('/wiki/pages/reorder/', orderData);
    return response.data;
  },
};

export default wikiApi;