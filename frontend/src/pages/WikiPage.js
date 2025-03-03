import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { WikiProvider, useWiki } from '../context/WikiContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  HiOutlineFolder,
  HiOutlineDocument,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineSave,
  HiOutlineTrash,
  HiOutlineDocumentAdd,
  HiOutlineClock,
  HiOutlinePaperClip,
  HiOutlineX,
  HiOutlineExclamationCircle,
  HiOutlinePhotograph
} from 'react-icons/hi';

// Wiki Sidebar Item Component
const WikiSidebarItem = ({ item, level = 0, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { activePage } = useWiki();
  
  const hasChildren = item.children && item.children.length > 0;
  const isActive = activePage === item.id;
  
  const handleToggle = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleClick = () => {
    onSelect(item.id);
  };
  
  return (
    <div className="mb-1">
      <div 
        className={`flex items-center px-2 py-1 rounded-md cursor-pointer ${isActive ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200'}`}
        onClick={handleClick}
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
      >
        {hasChildren ? (
          <button 
            className="mr-1 text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={handleToggle}
          >
            {isExpanded ? 
              <HiOutlineChevronDown className="w-4 h-4" /> : 
              <HiOutlineChevronRight className="w-4 h-4" />
            }
          </button>
        ) : (
          <span className="w-4 mr-1"></span>
        )}
        
        {hasChildren ? (
          <HiOutlineFolder className="w-4 h-4 mr-2 text-gray-500" />
        ) : (
          <HiOutlineDocument className="w-4 h-4 mr-2 text-gray-500" />
        )}
        
        <span className="truncate text-sm">{item.title}</span>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children.map(child => (
            <WikiSidebarItem 
              key={child.id}
              item={child}
              level={level + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// New Page Modal Component
const NewPageModal = ({ isOpen, onClose, onSave, parentId = null, parentOptions = [] }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(parentId);
  const [error, setError] = useState('');
  
  // Reset selected parent when the prop changes
  useEffect(() => {
    setSelectedParentId(parentId);
  }, [parentId]);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    // Ensure parent is properly formatted - if null, it should not be sent
    // If numeric, it should be sent as a number
    const pageData = {
      title,
      content,
      is_published: true
    };
    
    // Only add parent field if it's a valid ID
    if (selectedParentId !== null && selectedParentId !== undefined && selectedParentId !== "") {
      pageData.parent = Number(selectedParentId);
    }
    
    onSave(pageData);
    
    // Reset form
    setTitle('');
    setContent('');
    setError('');
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Create New Page</h2>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md flex items-center">
              <HiOutlineExclamationCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Page</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedParentId || ""}
              onChange={(e) => setSelectedParentId(e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">No parent (Root level)</option>
              {parentOptions.map(page => (
                <option key={page.id} value={page.id}>{page.title}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Select a parent to create this as a child page.</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Content</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Your content here"
            />
            <p className="mt-1 text-xs text-gray-500">Markdown formatting is supported.</p>
          </div>
        </form>
        
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={handleSubmit}
            type="button"
          >
            Create Page
          </button>
        </div>
      </div>
    </div>
  );
};

// Versions Modal Component
const VersionsModal = ({ isOpen, onClose, versions, onRestore }) => {
  if (!isOpen || !versions) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {versions.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {versions.map((version, index) => (
                <li key={version.id} className="py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {index === 0 ? 'Current Version' : `Version ${versions.length - index}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        By {version.editor?.full_name || 'Unknown'} on {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {index > 0 && (
                      <button
                        className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                        onClick={() => onRestore(version.id)}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">No version history available.</p>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Page versions are created automatically when the content is edited.
          </p>
        </div>
      </div>
    </div>
  );
};

// Wiki Page Content
const WikiContent = () => {
  const {
    wikiStructure,
    currentPage,
    activePage,
    isEditing,
    searchResults,
    searchQuery,
    pageVersions,
    loading,
    error,
    setIsEditing,
    loadPage,
    createPage,
    updatePage,
    deletePage,
    handleSearchQueryChange,
    restoreVersion,
    loadWikiStructure
  } = useWiki();
  
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newPageParentId, setNewPageParentId] = useState(null);
  const [parentOptions, setParentOptions] = useState([]);
  
  const editorRef = useRef(null);
  
  // State for tracking image uploads
  const [imageUploads, setImageUploads] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Set edit content when page changes or editing mode changes
  useEffect(() => {
    if (currentPage && isEditing) {
      setEditContent(currentPage.content || '');
    }
  }, [currentPage, isEditing]);
  
  // Focus editor when entering edit mode
  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.focus();
    }
  }, [isEditing]);
  
  // Handle paste event for clipboard images
  useEffect(() => {
    if (!isEditing || !currentPage) return;
    
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      // Look for image items in clipboard data
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;
          
          e.preventDefault(); // Prevent the default paste behavior
          
          try {
            setUploadingImage(true);
            // Create a unique placeholder for this upload
            const placeholderId = `image-${Date.now()}`;
            
            // Add a placeholder in the editor
            const cursorPosition = editorRef.current.selectionStart;
            const textBefore = editContent.substring(0, cursorPosition);
            const textAfter = editContent.substring(cursorPosition);
            const placeholder = `![Uploading image...](${placeholderId})`;
            setEditContent(textBefore + placeholder + textAfter);
            
            // Upload the image
            const result = await uploadAttachment(currentPage.id, file);
            
            if (result && result.file) {
              // Replace the placeholder with the actual image markdown
              const imageUrl = result.file;
              const imageMarkdown = `![${result.filename}](${imageUrl})`;
              setEditContent(prevContent => 
                prevContent.replace(placeholder, imageMarkdown)
              );
              
              console.log('Image uploaded successfully:', result);
            } else {
              // Remove the placeholder if upload failed
              setEditContent(prevContent => 
                prevContent.replace(placeholder, '*Failed to upload image*')
              );
              console.error('Failed to upload image');
            }
          } catch (error) {
            console.error('Error uploading pasted image:', error);
          } finally {
            setUploadingImage(false);
          }
        }
      }
    };
    
    // Add and remove event listener
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isEditing, currentPage, editContent, uploadAttachment]);
  
  // Generate parent options from wiki structure
  useEffect(() => {
    // Flatten the wiki structure to create a list of all pages
    const flattenStructure = (pages, result = []) => {
      // Check if pages is an array before using forEach
      if (!Array.isArray(pages)) {
        console.warn('Expected pages to be an array but got:', typeof pages);
        return result;
      }
      
      pages.forEach(page => {
        result.push({
          id: page.id,
          title: page.title
        });
        
        if (page.children && Array.isArray(page.children) && page.children.length > 0) {
          flattenStructure(page.children, result);
        }
      });
      return result;
    };
    
    // Ensure wikiStructure is an array before processing
    const pagesToProcess = Array.isArray(wikiStructure) ? wikiStructure : [];
    const allPages = flattenStructure(pagesToProcess);
    setParentOptions(allPages);
  }, [wikiStructure]);
  
  const handleSave = async () => {
    if (!currentPage) return;
    
    const updated = await updatePage(currentPage.id, {
      content: editContent
    });
    
    if (updated) {
      setIsEditing(false);
    }
  };
  
  const handleNewPage = async (pageData) => {
    const newPage = await createPage(pageData);
    // Close the modal regardless of success/failure
    setShowNewPageModal(false);
    
    if (newPage) {
      console.log('New page created successfully:', newPage);
      // Structure and page loading is now handled inside createPage
    } else {
      console.error('Failed to create new page');
    }
  };
  
  const openNewPageModal = (parentId = null) => {
    setNewPageParentId(parentId);
    setShowNewPageModal(true);
  };
  
  const handleDeletePage = async () => {
    if (!currentPage) return;
    
    const deleted = await deletePage(currentPage.id);
    if (deleted) {
      setConfirmDelete(false);
    }
  };
  
  const handleRestoreVersion = async (versionId) => {
    if (!currentPage) return;
    
    const restored = await restoreVersion(currentPage.id, versionId);
    if (restored) {
      setShowVersionsModal(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
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
              placeholder="Search wiki..."
              className="w-full py-2 pl-8 pr-3 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-2">
              <HiOutlineSearch className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Document Tree / Search Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchQuery ? (
            <>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search Results</h3>
              {searchResults.length > 0 ? (
                <ul className="space-y-1">
                  {searchResults.map(page => (
                    <li key={page.id}>
                      <button 
                        className="flex items-center w-full px-2 py-1 text-left text-sm hover:bg-gray-200 rounded-md"
                        onClick={() => {
                          loadPage(page.id);
                          handleSearchQueryChange('');
                        }}
                      >
                        <HiOutlineDocument className="w-4 h-4 mr-2 text-gray-500" />
                        {page.title}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No results found</p>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents</h3>
                <button 
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  onClick={() => openNewPageModal(null)}
                >
                  + New
                </button>
              </div>
              
              <div className="space-y-1">
                {wikiStructure.length > 0 ? (
                  wikiStructure.map(item => (
                    <WikiSidebarItem 
                      key={item.id} 
                      item={item}
                      onSelect={loadPage}
                    />
                  ))
                ) : loading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 mb-4">No pages yet</p>
                    <button
                      className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                      onClick={() => openNewPageModal(null)}
                    >
                      <HiOutlineDocumentAdd className="inline-block w-4 h-4 mr-1" />
                      Create First Page
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 border-b border-red-200 flex justify-between items-center">
            <div className="flex items-center">
              <HiOutlineExclamationCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
            <button 
              className="text-red-700 hover:text-red-900"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        )}
        
        {loading && !currentPage ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : currentPage ? (
          <>
            {/* Document Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{currentPage.title}</h1>
                  {currentPage.last_editor && (
                    <div className="mt-1 text-sm text-gray-500 flex items-center">
                      <HiOutlineClock className="w-4 h-4 mr-1" />
                      Last updated by {currentPage.last_editor.full_name} on {formatDate(currentPage.updated_at)}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    className="px-3 py-1 text-sm bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center"
                    onClick={() => openNewPageModal(currentPage.id)}
                  >
                    <HiOutlineDocumentAdd className="w-4 h-4 mr-1" />
                    Add Child
                  </button>
                  <button 
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
                    onClick={() => setShowVersionsModal(true)}
                  >
                    <HiOutlineClock className="w-4 h-4 mr-1" />
                    History
                  </button>
                  
                  {!isEditing ? (
                    <>
                      <button 
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit
                      </button>
                      
                      <button 
                        className="px-3 py-1 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 flex items-center"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <HiOutlineTrash className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 flex items-center"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </button>
                      
                      <button 
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                        onClick={handleSave}
                      >
                        <HiOutlineSave className="w-4 h-4 mr-1" />
                        Save
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Document Content */}
            <div className="flex-1 overflow-auto p-6 bg-white">
              {isEditing ? (
                <div className="flex flex-col h-full">
                  <textarea 
                    ref={editorRef}
                    className="w-full flex-1 p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Enter your content here..."
                  />
                  
                  {/* Editor toolbar */}
                  <div className="flex items-center mt-2 text-gray-500 text-sm">
                    <div className="flex items-center mr-4">
                      <HiOutlinePaperClip className="w-4 h-4 mr-1" />
                      <label htmlFor="fileUpload" className="cursor-pointer hover:text-gray-700">
                        Attach file
                        <input 
                          type="file"
                          id="fileUpload"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file || !currentPage) return;
                            
                            try {
                              setUploadingImage(true);
                              const result = await uploadAttachment(currentPage.id, file);
                              
                              if (result && result.file) {
                                // Add markdown link to the file
                                const isImage = result.file_type.startsWith('image/');
                                const markdownLink = isImage 
                                  ? `\n\n![${result.filename}](${result.file})\n\n` 
                                  : `\n\n[${result.filename}](${result.file})\n\n`;
                                
                                setEditContent(prev => prev + markdownLink);
                                console.log('File uploaded successfully:', result);
                              }
                            } catch (error) {
                              console.error('Error uploading file:', error);
                            } finally {
                              setUploadingImage(false);
                              // Reset the input
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <HiOutlinePhotograph className="w-4 h-4 mr-1" />
                      <span className="text-gray-500">Paste images directly (Ctrl+V)</span>
                    </div>
                    
                    {uploadingImage && (
                      <div className="ml-auto flex items-center text-blue-600">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading image...
                      </div>
                    )}
                  </div>
                  
                  {/* Markdown tips */}
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="block mb-1">Markdown supported: **bold**, *italic*, [links](url), ![images](url), `code`</span>
                    <span>Paste screenshots or images directly with Ctrl+V or use the attachment button above.</span>
                  </div>
                </div>
              ) : (
                <div className="prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentPage.content || '_No content yet. Click "Edit" to add content._'}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-white">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No page selected or create a new page to get started</p>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                onClick={() => openNewPageModal(null)}
              >
                <HiOutlineDocumentAdd className="inline-block w-4 h-4 mr-1" />
                Create New Page
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      <NewPageModal 
        isOpen={showNewPageModal}
        onClose={() => setShowNewPageModal(false)}
        onSave={handleNewPage}
        parentId={newPageParentId}
        parentOptions={parentOptions}
      />
      
      <VersionsModal
        isOpen={showVersionsModal}
        onClose={() => setShowVersionsModal(false)}
        versions={pageVersions}
        onRestore={handleRestoreVersion}
      />
      
      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Page</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete "{currentPage?.title}"? This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                  onClick={handleDeletePage}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Wiki Page Component with Provider
const WikiPage = () => {
  return (
    <WikiProvider>
      <WikiContent />
    </WikiProvider>
  );
};

export default WikiPage;