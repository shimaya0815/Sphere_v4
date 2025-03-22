import React, { useCallback } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

const useTaskData = () => {
  const [loading, setLoading] = React.useState({
    users: false,
    statuses: false,
    categories: false,
    clients: false
  });
  const [users, setUsers] = React.useState([]);
  const [statuses, setStatuses] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [clients, setClients] = React.useState([]);

  const fetchUsers = useCallback(async () => {
    console.log('fetchUsers called');
    setLoading(prev => ({ ...prev, users: true }));
    
    try {
      const response = await apiClient.get('/api/users/');
      console.log('Users API response:', response);

      if (response && response.data) {
        setUsers(response.data);
      } else {
        console.error('Users API response data is empty');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('ユーザー情報の取得に失敗しました');
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, []);

  const fetchStatuses = useCallback(async () => {
    console.log('fetchStatuses called');
    setLoading(prev => ({ ...prev, statuses: true }));
    
    try {
      const response = await apiClient.get('/api/tasks/statuses/');
      console.log('Statuses API response:', response);

      if (response && response.data) {
        setStatuses(response.data);
      } else {
        console.error('Statuses API response data is empty');
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
      toast.error('ステータス情報の取得に失敗しました');
    } finally {
      setLoading(prev => ({ ...prev, statuses: false }));
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    console.log('fetchCategories called');
    setLoading(prev => ({ ...prev, categories: true }));
    
    try {
      const response = await apiClient.get('/api/tasks/categories/');
      console.log('Categories API response:', response);
      
      if (response && response.data) {
        setCategories(response.data);
      } else {
        console.error('Categories API response data is empty');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('カテゴリー情報の取得に失敗しました');
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  }, []);

  const fetchClients = useCallback(async () => {
    console.log('fetchClients called');
    setLoading(prev => ({ ...prev, clients: true }));
    
    try {
      const response = await apiClient.get('/api/clients/');
      console.log('Clients API response:', response);
      
      if (response && response.data) {
        setClients(response.data);
      } else {
        console.error('Clients API response data is empty');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('クライアント情報の取得に失敗しました');
    } finally {
      setLoading(prev => ({ ...prev, clients: false }));
    }
  }, []);

  return {
    loading,
    users,
    statuses,
    categories,
    clients,
    fetchUsers,
    fetchStatuses,
    fetchCategories,
    fetchClients
  };
};

export default useTaskData; 