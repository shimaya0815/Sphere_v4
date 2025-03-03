import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import wikiApi from '../api/wiki';
import { useAuth } from './AuthContext';
import debounce from 'lodash/debounce';

const WikiContext = createContext();

export const WikiProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [wikiStructure, setWikiStructure] = useState([]);
  const [currentPage, setCurrentPage] = useState(null);
  const [activePage, setActivePage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [wikiStats, setWikiStats] = useState(null);
  const [pageVersions, setPageVersions] = useState([]);
  const [pageAttachments, setPageAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load wiki structure on initial mount
  useEffect(() => {
    if (currentUser) {
      loadWikiStructure();
      loadWikiStats();
    }
  }, [currentUser]);
  
  // Load wiki structure
  const loadWikiStructure = async () => {
    setLoading(true);
    try {
      const response = await wikiApi.getWikiStructure();
      // Ensure we always set an array, even if the API returns nothing or an error
      const data = Array.isArray(response) ? response : [];
      setWikiStructure(data);
      
      // If no page is selected yet and we have pages, select the first one
      if (!activePage && data.length > 0) {
        loadPage(data[0].id);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading wiki structure:', err);
      setError('Failed to load wiki structure');
      // On error, ensure we have an empty array
      setWikiStructure([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Load wiki statistics
  const loadWikiStats = async () => {
    try {
      const data = await wikiApi.getWikiStats();
      setWikiStats(data);
    } catch (err) {
      console.error('Error loading wiki stats:', err);
    }
  };
  
  // Load a specific page
  const loadPage = async (pageId) => {
    if (!pageId) return;
    
    setLoading(true);
    try {
      const page = await wikiApi.getPage(pageId);
      setCurrentPage(page);
      setActivePage(pageId);
      
      // Load page versions
      loadPageVersions(pageId);
      
      // Load page attachments
      loadPageAttachments(pageId);
      
      setError(null);
    } catch (err) {
      console.error('Error loading page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  };
  
  // Load page versions
  const loadPageVersions = async (pageId) => {
    try {
      const versions = await wikiApi.getPageVersions(pageId);
      setPageVersions(versions);
    } catch (err) {
      console.error('Error loading page versions:', err);
    }
  };
  
  // Load page attachments
  const loadPageAttachments = async (pageId) => {
    try {
      const attachments = await wikiApi.getPageAttachments(pageId);
      setPageAttachments(attachments);
    } catch (err) {
      console.error('Error loading page attachments:', err);
    }
  };
  
  // Create a new page
  const createPage = async (pageData) => {
    setLoading(true);
    try {
      const newPage = await wikiApi.createPage(pageData);
      
      // Reload the wiki structure to include the new page
      await loadWikiStructure();
      
      // Set the new page as the active page
      setCurrentPage(newPage);
      setActivePage(newPage.id);
      
      setError(null);
      return newPage;
    } catch (err) {
      console.error('Error creating page:', err);
      setError('Failed to create page');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Update a page
  const updatePage = async (pageId, pageData) => {
    setLoading(true);
    try {
      const updatedPage = await wikiApi.updatePage(pageId, pageData);
      setCurrentPage(updatedPage);
      
      // If the page title changed, reload the structure
      if (pageData.title) {
        await loadWikiStructure();
      }
      
      setError(null);
      return updatedPage;
    } catch (err) {
      console.error('Error updating page:', err);
      setError('Failed to update page');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a page
  const deletePage = async (pageId) => {
    setLoading(true);
    try {
      await wikiApi.deletePage(pageId);
      
      // Reload the wiki structure
      await loadWikiStructure();
      
      // If the deleted page was the active page, clear the current page
      if (activePage === pageId) {
        setCurrentPage(null);
        setActivePage(null);
        
        // Select the first page if available
        if (wikiStructure.length > 0) {
          loadPage(wikiStructure[0].id);
        }
      }
      
      setError(null);
      return true;
    } catch (err) {
      console.error('Error deleting page:', err);
      setError('Failed to delete page');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Move a page in the hierarchy
  const movePage = async (pageId, parentId, order = 0) => {
    try {
      await wikiApi.movePage(pageId, parentId, order);
      
      // Reload the wiki structure
      await loadWikiStructure();
      
      return true;
    } catch (err) {
      console.error('Error moving page:', err);
      setError('Failed to move page');
      return false;
    }
  };
  
  // Reorder pages
  const reorderPages = async (pageOrders) => {
    try {
      await wikiApi.reorderPages(pageOrders);
      
      // Reload the wiki structure
      await loadWikiStructure();
      
      return true;
    } catch (err) {
      console.error('Error reordering pages:', err);
      setError('Failed to reorder pages');
      return false;
    }
  };
  
  // Restore a previous version of a page
  const restoreVersion = async (pageId, versionId) => {
    setLoading(true);
    try {
      const restoredPage = await wikiApi.restoreVersion(pageId, versionId);
      setCurrentPage(restoredPage);
      
      // Reload page versions
      await loadPageVersions(pageId);
      
      setError(null);
      return true;
    } catch (err) {
      console.error('Error restoring version:', err);
      setError('Failed to restore version');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Upload an attachment
  const uploadAttachment = async (pageId, file) => {
    try {
      const attachment = await wikiApi.uploadAttachment(pageId, file);
      
      // Reload page attachments
      await loadPageAttachments(pageId);
      
      return attachment;
    } catch (err) {
      console.error('Error uploading attachment:', err);
      setError('Failed to upload attachment');
      return null;
    }
  };
  
  // Delete an attachment
  const deleteAttachment = async (attachmentId) => {
    try {
      await wikiApi.deleteAttachment(attachmentId);
      
      // Reload page attachments
      if (currentPage) {
        await loadPageAttachments(currentPage.id);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting attachment:', err);
      setError('Failed to delete attachment');
      return false;
    }
  };
  
  // Search wiki pages
  const searchWiki = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const results = await wikiApi.searchWiki(query);
      setSearchResults(results);
      return results;
    } catch (err) {
      console.error('Error searching wiki:', err);
      setError('Failed to search wiki');
      return [];
    }
  };
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      searchWiki(query);
    }, 300),
    []
  );
  
  // Handle search query change
  const handleSearchQueryChange = (query) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };
  
  const value = {
    wikiStructure,
    currentPage,
    activePage,
    isEditing,
    searchResults,
    searchQuery,
    wikiStats,
    pageVersions,
    pageAttachments,
    loading,
    error,
    setIsEditing,
    loadPage,
    createPage,
    updatePage,
    deletePage,
    movePage,
    reorderPages,
    restoreVersion,
    uploadAttachment,
    deleteAttachment,
    handleSearchQueryChange,
    loadWikiStructure
  };
  
  return <WikiContext.Provider value={value}>{children}</WikiContext.Provider>;
};

export const useWiki = () => {
  const context = useContext(WikiContext);
  if (!context) {
    throw new Error('useWiki must be used within a WikiProvider');
  }
  return context;
};

export default WikiContext;