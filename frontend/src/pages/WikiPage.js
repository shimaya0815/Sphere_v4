import React, { useState } from 'react';

const WikiPage = () => {
  const [activeDocument, setActiveDocument] = useState('welcome');
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock data for documents
  const documents = {
    'welcome': {
      id: 'welcome',
      title: 'Welcome to Sphere Wiki',
      content: `
# Welcome to Sphere Wiki

This is your team's knowledge base where you can store important information, documentation, and guides.

## Getting Started

1. **Create Pages**: Click the "New Page" button to create a new document
2. **Organize**: Use the folder structure on the left to organize your content
3. **Collaborate**: Multiple team members can edit and contribute to the same document
4. **Search**: Use the search bar to find information quickly

## Key Features

- Rich text editing with markdown support
- Automatic saving
- Version history
- Access control and permissions
- Quick search
      `,
      lastUpdated: '2023-10-15 15:30',
      updatedBy: 'Admin',
    },
    'company-policies': {
      id: 'company-policies',
      title: 'Company Policies',
      content: `
# Company Policies

This document outlines the key policies for our organization.

## Work Hours

Standard work hours are from 9:00 AM to 5:00 PM, Monday through Friday. We offer flexible scheduling with core hours from 10:00 AM to 3:00 PM.

## Remote Work

Employees are allowed to work remotely up to 3 days per week, with prior approval from their manager.

## Vacation Policy

- Full-time employees receive 20 days of paid vacation per year
- Vacation requests should be submitted at least 2 weeks in advance
- Unused vacation days can be carried over (up to 5 days)

## Sick Leave

Employees receive 10 paid sick days per year. A doctor's note is required for sick leave extending beyond 3 consecutive days.
      `,
      lastUpdated: '2023-10-14 11:45',
      updatedBy: 'HR Manager',
    },
    'project-guidelines': {
      id: 'project-guidelines',
      title: 'Project Guidelines',
      content: `
# Project Guidelines

This document outlines our standard approach to project management.

## Project Phases

1. **Planning**: Define scope, objectives, and deliverables
2. **Design**: Create detailed specifications and mockups
3. **Implementation**: Develop and build the project
4. **Testing**: Quality assurance and user acceptance testing
5. **Deployment**: Release and launch
6. **Maintenance**: Ongoing support and improvements

## Documentation Requirements

All projects must maintain the following documentation:
- Project brief
- Technical specifications
- User guides
- Testing results
- Deployment instructions

## Change Management

Any significant changes to project scope must go through the change request process:
1. Submit change request form
2. Impact assessment
3. Approval by project sponsor
4. Implementation planning
      `,
      lastUpdated: '2023-10-13 09:15',
      updatedBy: 'Project Manager',
    },
  };
  
  // Mock data for document structure
  const documentStructure = [
    {
      id: 'welcome',
      title: 'Welcome to Sphere Wiki',
      type: 'document',
    },
    {
      id: 'company',
      title: 'Company',
      type: 'folder',
      children: [
        {
          id: 'company-policies',
          title: 'Company Policies',
          type: 'document',
        },
        {
          id: 'team-structure',
          title: 'Team Structure',
          type: 'document',
        },
      ],
    },
    {
      id: 'projects',
      title: 'Projects',
      type: 'folder',
      children: [
        {
          id: 'project-guidelines',
          title: 'Project Guidelines',
          type: 'document',
        },
      ],
    },
    {
      id: 'technical',
      title: 'Technical Documentation',
      type: 'folder',
      children: [
        {
          id: 'api-documentation',
          title: 'API Documentation',
          type: 'document',
        },
        {
          id: 'development-setup',
          title: 'Development Setup',
          type: 'document',
        },
      ],
    },
  ];
  
  // Filter documents based on search query
  const filteredDocuments = searchQuery ? 
    Object.values(documents).filter(doc => 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      doc.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];
  
  // Rendering functions for the document structure
  const renderDocumentStructure = (items, level = 0) => {
    return (
      <ul className={`space-y-1 ${level > 0 ? 'ml-4' : ''}`}>
        {items.map(item => (
          <li key={item.id}>
            {item.type === 'folder' ? (
              <div>
                <button className="flex items-center w-full px-2 py-1 text-left text-sm hover:bg-gray-200 rounded-md">
                  <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                  </svg>
                  {item.title}
                </button>
                {item.children && renderDocumentStructure(item.children, level + 1)}
              </div>
            ) : (
              <button 
                className={`flex items-center w-full px-2 py-1 text-left text-sm hover:bg-gray-200 rounded-md ${activeDocument === item.id ? 'bg-blue-100 text-blue-800' : ''}`}
                onClick={() => setActiveDocument(item.id)}
              >
                <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                {item.title}
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  };
  
  // Simple markdown-like rendering (actual implementation would use a proper markdown library)
  const renderMarkdown = (text) => {
    const lines = text.split('\n');
    return (
      <div className="prose max-w-none">
        {lines.map((line, index) => {
          if (line.startsWith('# ')) {
            return <h1 key={index} className="text-2xl font-bold mt-6 mb-4">{line.substring(2)}</h1>;
          } else if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-bold mt-5 mb-3">{line.substring(3)}</h2>;
          } else if (line.startsWith('- ')) {
            return <li key={index} className="ml-4">{line.substring(2)}</li>;
          } else if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ') || line.startsWith('5. ') || line.startsWith('6. ')) {
            return <li key={index} className="ml-4 list-decimal">{line.substring(3)}</li>;
          } else if (line.trim() === '') {
            return <div key={index} className="h-4"></div>;
          } else {
            return <p key={index} className="my-2">{line}</p>;
          }
        })}
      </div>
    );
  };
  
  const currentDocument = documents[activeDocument];
  
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
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
        </div>
        
        {/* Document Tree / Search Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchQuery ? (
            <>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search Results</h3>
              {filteredDocuments.length > 0 ? (
                <ul className="space-y-1">
                  {filteredDocuments.map(doc => (
                    <li key={doc.id}>
                      <button 
                        className="flex items-center w-full px-2 py-1 text-left text-sm hover:bg-gray-200 rounded-md"
                        onClick={() => {
                          setActiveDocument(doc.id);
                          setSearchQuery('');
                        }}
                      >
                        <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                        {doc.title}
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
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  + New
                </button>
              </div>
              {renderDocumentStructure(documentStructure)}
            </>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentDocument ? (
          <>
            {/* Document Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-900">{currentDocument.title}</h1>
                <div className="flex items-center space-x-2">
                  <button 
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  {isEditing && (
                    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Save
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Last updated by {currentDocument.updatedBy} on {currentDocument.lastUpdated}
              </div>
            </div>
            
            {/* Document Content */}
            <div className="flex-1 overflow-auto p-6 bg-white">
              {isEditing ? (
                <textarea 
                  className="w-full h-full p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={currentDocument.content}
                  onChange={() => {}}
                />
              ) : (
                renderMarkdown(currentDocument.content)
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-white">
            <p className="text-gray-500">Select a document from the sidebar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WikiPage;