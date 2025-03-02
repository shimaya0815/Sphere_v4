import apiClient from './client';

// Clients API service
const clientsApi = {
  // Get all clients with optional filters
  getClients: async (filters = {}) => {
    const response = await apiClient.get('/clients/', { params: filters });
    return response.data;
  },
  
  // Get a specific client by ID
  getClient: async (clientId) => {
    const response = await apiClient.get(`/clients/${clientId}/`);
    return response.data;
  },
  
  // Create a new client
  createClient: async (clientData) => {
    const response = await apiClient.post('/clients/', clientData);
    return response.data;
  },
  
  // Update a client
  updateClient: async (clientId, clientData) => {
    const response = await apiClient.patch(`/clients/${clientId}/`, clientData);
    return response.data;
  },
  
  // Delete a client
  deleteClient: async (clientId) => {
    const response = await apiClient.delete(`/clients/${clientId}/`);
    return response.data;
  },
  
  // Get all contracts with optional filters
  getContracts: async (filters = {}) => {
    const response = await apiClient.get('/clients/contracts/', { params: filters });
    return response.data;
  },
  
  // Get a specific contract by ID
  getContract: async (contractId) => {
    const response = await apiClient.get(`/clients/contracts/${contractId}/`);
    return response.data;
  },
  
  // Create a new contract
  createContract: async (contractData) => {
    const response = await apiClient.post('/clients/contracts/', contractData);
    return response.data;
  },
  
  // Update a contract
  updateContract: async (contractId, contractData) => {
    const response = await apiClient.patch(`/clients/contracts/${contractId}/`, contractData);
    return response.data;
  },
  
  // Delete a contract
  deleteContract: async (contractId) => {
    const response = await apiClient.delete(`/clients/contracts/${contractId}/`);
    return response.data;
  },
  
  // Get all notes with optional filters
  getNotes: async (filters = {}) => {
    const response = await apiClient.get('/clients/notes/', { params: filters });
    return response.data;
  },
  
  // Create a new note
  createNote: async (noteData) => {
    const response = await apiClient.post('/clients/notes/', noteData);
    return response.data;
  },
  
  // Update a note
  updateNote: async (noteId, noteData) => {
    const response = await apiClient.patch(`/clients/notes/${noteId}/`, noteData);
    return response.data;
  },
  
  // Delete a note
  deleteNote: async (noteId) => {
    const response = await apiClient.delete(`/clients/notes/${noteId}/`);
    return response.data;
  },
  
  // Get client tasks
  getTasks: async (clientId) => {
    const response = await apiClient.get(`/clients/${clientId}/tasks/`);
    return response.data;
  },
  
  // Get client industries (unique list)
  getIndustries: async () => {
    const response = await apiClient.get('/clients/industries/');
    return response.data;
  },
};

export default clientsApi;