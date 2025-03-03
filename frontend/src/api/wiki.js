import apiClient from './client';

// Wiki API service
const wikiApi = {
  // Pages
  getPages: (params) => 
    apiClient.get('/wiki/pages/', { params }),
  
  getPage: (id) => 
    apiClient.get(`/wiki/pages/${id}/`).then(response => response.data),
  
  createPage: (data) => 
    apiClient.post('/wiki/pages/', data).then(response => response.data),
  
  updatePage: (id, data) => 
    apiClient.patch(`/wiki/pages/${id}/`, data).then(response => response.data),
  
  deletePage: (id) => 
    apiClient.delete(`/wiki/pages/${id}/`).then(response => response.data),
  
  // Page versions
  getPageVersions: (id) => 
    apiClient.get(`/wiki/pages/${id}/versions/`).then(response => response.data),
  
  restoreVersion: (pageId, versionId) => 
    apiClient.post(`/wiki/pages/${pageId}/versions/${versionId}/restore/`).then(response => response.data),
  
  // Page attachments
  getPageAttachments: (id) => 
    apiClient.get(`/wiki/pages/${id}/attachments/`).then(response => response.data),
  
  uploadAttachment: (pageId, file) => {
    console.log('API uploadAttachment called with pageId:', pageId, 'and file:', file);
    
    const formData = new FormData();
    formData.append('page', pageId);
    formData.append('file', file);
    
    // Debug formData
    for (let pair of formData.entries()) {
      console.log('FormData entry:', pair[0], pair[1]);
    }
    
    return apiClient.post('/wiki/attachments/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    .then(response => {
      console.log('Upload success response:', response.data);
      return response.data;
    })
    .catch(error => {
      console.error('Upload error in API layer:', error);
      console.error('Error response:', error.response?.data || 'No response data');
      throw error;
    });
  },
  
  deleteAttachment: (id) => 
    apiClient.delete(`/wiki/attachments/${id}/`).then(response => response.data),
  
  // Page hierarchy
  movePage: (id, parentId, order = 0) => 
    apiClient.post(`/wiki/pages/${id}/move/`, {
      parent_id: parentId,
      order
    }).then(response => response.data),
  
  getChildren: (id) => 
    apiClient.get(`/wiki/pages/${id}/children/`).then(response => response.data),
  
  getBreadcrumbs: (id) => 
    apiClient.get(`/wiki/pages/${id}/breadcrumbs/`).then(response => response.data),
  
  // Wiki structure
  getWikiStructure: () => 
    apiClient.get('/wiki/structure/').then(response => response.data),
  
  // Reordering
  reorderPages: (pageOrders) => 
    apiClient.post('/wiki/pages/reorder/', {
      page_orders: pageOrders
    }).then(response => response.data),
  
  // Search
  searchWiki: (query) => 
    apiClient.get('/wiki/search/', {
      params: { query }
    }).then(response => response.data),
  
  // Stats
  getWikiStats: () => 
    apiClient.get('/wiki/stats/').then(response => response.data),
    
  // Legacy / compatibility methods
  getChildPages: (parentId) => 
    apiClient.get(`/wiki/pages/`, { 
      params: { parent: parentId } 
    }).then(response => response.data),
    
  searchPages: (query) => 
    apiClient.get('/wiki/search/', { 
      params: { query } 
    }).then(response => response.data),
    
  getAttachments: (pageId) => 
    apiClient.get(`/wiki/pages/${pageId}/attachments/`).then(response => response.data),
    
  restorePageVersion: (pageId, versionId) => 
    apiClient.post(`/wiki/pages/${pageId}/versions/${versionId}/restore/`).then(response => response.data)
};

export default wikiApi;