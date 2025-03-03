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
    apiClient.patch(`/wiki/pages/${id}/`, data),
  
  deletePage: (id) => 
    apiClient.delete(`/wiki/pages/${id}/`),
  
  // Page versions
  getPageVersions: (id) => 
    apiClient.get(`/wiki/pages/${id}/versions/`),
  
  restoreVersion: (pageId, versionId) => 
    apiClient.post(`/wiki/pages/${pageId}/versions/${versionId}/restore/`),
  
  // Page attachments
  getPageAttachments: (id) => 
    apiClient.get(`/wiki/pages/${id}/attachments/`).then(response => response.data),
  
  uploadAttachment: (pageId, file) => {
    const formData = new FormData();
    formData.append('page', pageId);
    formData.append('file', file);
    
    return apiClient.post('/wiki/attachments/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(response => response.data);
  },
  
  deleteAttachment: (id) => 
    apiClient.delete(`/wiki/attachments/${id}/`),
  
  // Page hierarchy
  movePage: (id, parentId, order = 0) => 
    apiClient.post(`/wiki/pages/${id}/move/`, {
      parent_id: parentId,
      order
    }),
  
  getChildren: (id) => 
    apiClient.get(`/wiki/pages/${id}/children/`),
  
  getBreadcrumbs: (id) => 
    apiClient.get(`/wiki/pages/${id}/breadcrumbs/`),
  
  // Wiki structure
  getWikiStructure: () => 
    apiClient.get('/wiki/structure/').then(response => response.data),
  
  // Reordering
  reorderPages: (pageOrders) => 
    apiClient.post('/wiki/pages/reorder/', {
      page_orders: pageOrders
    }),
  
  // Search
  searchWiki: (query) => 
    apiClient.get('/wiki/search/', {
      params: { query }
    }),
  
  // Stats
  getWikiStats: () => 
    apiClient.get('/wiki/stats/'),
    
  // Legacy / compatibility methods
  getChildPages: (parentId) => 
    apiClient.get(`/wiki/pages/`, { 
      params: { parent: parentId } 
    }),
    
  searchPages: (query) => 
    apiClient.get('/wiki/search/', { 
      params: { query } 
    }),
    
  getAttachments: (pageId) => 
    apiClient.get(`/wiki/pages/${pageId}/attachments/`),
    
  restorePageVersion: (pageId, versionId) => 
    apiClient.post(`/wiki/pages/${pageId}/versions/${versionId}/restore/`)
};

export default wikiApi;