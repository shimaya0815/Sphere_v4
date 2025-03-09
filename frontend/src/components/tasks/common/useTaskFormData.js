import { useState, useEffect } from 'react';
import { tasksApi, clientsApi, usersApi } from '../../../api';
import toast from 'react-hot-toast';

/**
 * タスクフォームで使用する共通データを取得するカスタムフック
 */
export const useTaskFormData = (options = {}) => {
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTaskMetadata = async () => {
      try {
        setIsLoadingUsers(true);
        
        const [
          categoriesData, 
          statusesData, 
          prioritiesData, 
          workersData,
          reviewersData
        ] = await Promise.all([
          tasksApi.getCategories(),
          tasksApi.getStatuses(),
          tasksApi.getPriorities(),
          usersApi.getAvailableWorkers(),
          usersApi.getAvailableReviewers()
        ]);

        // クライアントデータ取得（オプション）
        let clientsData = [];
        if (options.fetchClients !== false) {
          clientsData = await clientsApi.getClients({ contract_status: 'active' });
        }
        
        // Process categories
        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData);
        } else if (categoriesData && Array.isArray(categoriesData.results)) {
          setCategories(categoriesData.results);
        } else {
          setCategories([]);
        }
        
        // Process statuses
        if (Array.isArray(statusesData)) {
          setStatuses(statusesData);
        } else if (statusesData && Array.isArray(statusesData.results)) {
          setStatuses(statusesData.results);
        } else {
          setStatuses([]);
        }
        
        // Process priorities
        if (Array.isArray(prioritiesData)) {
          setPriorities(prioritiesData);
        } else if (prioritiesData && Array.isArray(prioritiesData.results)) {
          setPriorities(prioritiesData.results);
        } else {
          setPriorities([]);
        }

        // Process clients
        if (options.fetchClients !== false) {
          if (Array.isArray(clientsData)) {
            setClients(clientsData);
          } else if (clientsData && Array.isArray(clientsData.results)) {
            setClients(clientsData.results);
          } else {
            setClients([]);
          }
        }
        
        // Process workers (担当者)
        if (Array.isArray(workersData)) {
          setWorkers(workersData);
        } else if (workersData && Array.isArray(workersData.results)) {
          setWorkers(workersData.results);
        } else {
          setWorkers([]);
        }
        
        // Process reviewers (レビュアー)
        if (Array.isArray(reviewersData)) {
          setReviewers(reviewersData);
        } else if (reviewersData && Array.isArray(reviewersData.results)) {
          setReviewers(reviewersData.results);
        } else {
          setReviewers([]);
        }
      } catch (error) {
        console.error('Error fetching task metadata:', error);
        toast.error('タスクのメタデータの取得に失敗しました');
        
        // Set default values on error
        setCategories([]);
        setStatuses([]);
        setPriorities([]);
        setClients([]);
        setWorkers([]);
        setReviewers([]);
      } finally {
        setIsLoadingUsers(false);
        setIsLoading(false);
      }
    };

    fetchTaskMetadata();
  }, [options.fetchClients]);

  return {
    categories,
    statuses,
    priorities,
    clients,
    workers,
    reviewers,
    isLoadingUsers,
    isLoading
  };
};

export default useTaskFormData;