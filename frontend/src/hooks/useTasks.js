import { useState, useEffect, useCallback, useContext } from 'react';
import { tasksApi } from '../api';
import toast from 'react-hot-toast';

/**
 * タスク管理用カスタムフック
 * タスクの取得、作成、更新、削除機能を提供
 */
export const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // タスク一覧を取得
  const fetchTasks = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await tasksApi.getTasks(filters);
      setTasks(response);
      return response;
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'タスクの取得に失敗しました');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 単一タスクを取得
  const getTask = useCallback(async (taskId) => {
    if (!taskId || taskId === 'new') return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await tasksApi.getTask(taskId);
      
      // タスク一覧を更新（キャッシュ更新）
      setTasks(prev => {
        const exists = prev.some(t => t.id === response.id);
        if (exists) {
          return prev.map(t => t.id === response.id ? response : t);
        } else {
          return [...prev, response];
        }
      });
      
      return response;
    } catch (err) {
      console.error(`Error fetching task ${taskId}:`, err);
      setError(err.message || 'タスクの取得に失敗しました');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // タスクを作成
  const createTask = useCallback(async (taskData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await tasksApi.createTask(taskData);
      
      // タスク一覧を更新
      setTasks(prev => [...prev, response]);
      
      return response;
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err.message || 'タスクの作成に失敗しました');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // タスクを更新
  const updateTask = useCallback(async (taskId, taskData) => {
    if (!taskId) {
      setError('タスクIDが指定されていません');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await tasksApi.updateTask(taskId, taskData);
      
      // タスク一覧を更新
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...response } : task
      ));
      
      return response;
    } catch (err) {
      console.error(`Error updating task ${taskId}:`, err);
      setError(err.message || 'タスクの更新に失敗しました');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // タスクを削除
  const deleteTask = useCallback(async (taskId) => {
    if (!taskId) {
      setError('タスクIDが指定されていません');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await tasksApi.deleteTask(taskId);
      
      // タスク一覧から削除
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      return true;
    } catch (err) {
      console.error(`Error deleting task ${taskId}:`, err);
      setError(err.message || 'タスクの削除に失敗しました');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask
  };
};

export default useTasks; 