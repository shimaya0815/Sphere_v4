import React, { useState } from 'react';

const ClientsPage = () => {
  const [clients, setClients] = useState([
    { 
      id: 1, 
      name: 'Acme Corporation', 
      contactPerson: 'John Smith', 
      email: 'john@acmecorp.com', 
      phone: '(555) 123-4567', 
      industry: 'Manufacturing',
      status: 'Active',
      fiscalYear: 'January-December'
    },
    { 
      id: 2, 
      name: 'Globex International', 
      contactPerson: 'Jane Doe', 
      email: 'jane@globex.com', 
      phone: '(555) 987-6543', 
      industry: 'Technology',
      status: 'Active',
      fiscalYear: 'April-March'
    },
    { 
      id: 3, 
      name: 'Oceanic Airlines', 
      contactPerson: 'James Wilson', 
      email: 'james@oceanic.com', 
      phone: '(555) 456-7890', 
      industry: 'Transportation',
      status: 'Inactive',
      fiscalYear: 'July-June'
    },
    { 
      id: 4, 
      name: 'Stark Industries', 
      contactPerson: 'Tony Stark', 
      email: 'tony@stark.com', 
      phone: '(555) 111-2222', 
      industry: 'Defense',
      status: 'Active',
      fiscalYear: 'October-September'
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [industryFilter, setIndustryFilter] = useState('All');

  // Get unique industries for filter
  const industries = [...new Set(clients.map(client => client.industry))];

  const filteredClients = clients.filter(client => {
    return (
      (client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
       client.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'All' || client.status === statusFilter) &&
      (industryFilter === 'All' || client.industry === industryFilter)
    );
  });

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button className="btn btn-primary">
          <span className="mr-2">+</span> New Client
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Search by name, contact, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            className="select select-bordered w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
          <select
            className="select select-bordered w-full"
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          >
            <option value="All">All Industries</option>
            {industries.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{client.name}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  client.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {client.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">{client.industry}</p>
            </div>
            
            <div className="p-5">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Contact Person</p>
                  <p className="mt-1">{client.contactPerson}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1">{client.email}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="mt-1">{client.phone}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Fiscal Year</p>
                  <p className="mt-1">{client.fiscalYear}</p>
                </div>
              </div>
            </div>
            
            <div className="px-5 py-3 bg-gray-50 flex justify-end">
              <button className="text-blue-600 hover:text-blue-800 font-medium text-sm mr-4">
                View Details
              </button>
              <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                Edit
              </button>
            </div>
          </div>
        ))}
        
        {filteredClients.length === 0 && (
          <div className="col-span-3 p-8 text-center text-gray-500 bg-white rounded-lg shadow">
            No clients found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsPage;