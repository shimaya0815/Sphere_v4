import React, { useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { metadataApi, usersApi, businessesApi } from '../services/api';

const useTaskData = () => {
  const [categories, setCategories] = React.useState([]);
  const [statuses, setStatuses] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [businessId, setBusinessId] = React.useState(null);
  const [loading, setLoading] = React.useState({ 
    categories: false, 
    statuses: false, 
    users: false,
    business: false
  });

  // 現在のビジネスIDを取得
  const fetchBusinessId = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, business: true }));
      const profile = await usersApi.getProfile();
      
      if (profile?.data?.business?.id) {
        console.log('Found business ID:', profile.data.business.id);
        setBusinessId(profile.data.business.id);
        return profile.data.business.id;
      } else {
        console.warn('Business ID not found in profile');
        return null;
      }
    } catch (error) {
      console.error('Error fetching business ID:', error);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, business: false }));
    }
  }, []);

  // 初期化時にビジネスIDを取得
  useEffect(() => {
    fetchBusinessId();
  }, [fetchBusinessId]);

  // カテゴリー取得
  const fetchCategories = useCallback(async () => {
    console.log('fetchCategories called');
    try {
      setLoading(prev => ({ ...prev, categories: true }));
      
      // まだビジネスIDが設定されていない場合は取得を試みる
      const currentBusinessId = businessId || await fetchBusinessId();
      
      if (!currentBusinessId) {
        console.error('Cannot fetch categories: Business ID not available');
        toast.error('ビジネスIDが設定されていないため、カテゴリーを取得できません');
        return;
      }
      
      // ビジネスIDでフィルタリングしたリクエスト
      const fetchedCategories = await metadataApi.getCategories({ business: currentBusinessId });
      console.log(`Fetched ${fetchedCategories.length} categories for business ${currentBusinessId}`);
      setCategories(fetchedCategories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('カテゴリーの取得に失敗しました');
      setCategories([]);
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  }, [businessId, fetchBusinessId]);

  // ステータス取得
  const fetchStatuses = useCallback(async () => {
    console.log('fetchStatuses called');
    try {
      setLoading(prev => ({ ...prev, statuses: true }));
      
      // まだビジネスIDが設定されていない場合は取得を試みる
      const currentBusinessId = businessId || await fetchBusinessId();
      
      if (!currentBusinessId) {
        console.error('Cannot fetch statuses: Business ID not available');
        toast.error('ビジネスIDが設定されていないため、ステータスを取得できません');
        return;
      }
      
      // ビジネスIDでフィルタリングしたリクエスト
      const fetchedStatuses = await metadataApi.getStatuses({ business: currentBusinessId });
      console.log(`Fetched ${fetchedStatuses.length} statuses for business ${currentBusinessId}`);
      setStatuses(fetchedStatuses || []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
      toast.error('ステータスの取得に失敗しました');
      setStatuses([]);
    } finally {
      setLoading(prev => ({ ...prev, statuses: false }));
    }
  }, [businessId, fetchBusinessId]);

  // ユーザー取得
  const fetchUsers = useCallback(async () => {
    console.log('fetchUsers called');
    try {
      setLoading(prev => ({ ...prev, users: true }));
      
      // まだビジネスIDが設定されていない場合は取得を試みる
      const currentBusinessId = businessId || await fetchBusinessId();
      
      if (!currentBusinessId) {
        console.error('Cannot fetch users: Business ID not available');
        toast.error('ビジネスIDが設定されていないため、ユーザーを取得できません');
        return;
      }
      
      // ビジネスIDでフィルタリングしたリクエスト
      const fetchedUsers = await usersApi.getUsers({ business: currentBusinessId });
      console.log(`Fetched ${fetchedUsers.length} users for business ${currentBusinessId}`);
      setUsers(fetchedUsers || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('ユーザーの取得に失敗しました');
      setUsers([]);
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, [businessId, fetchBusinessId]);

  return {
    categories,
    statuses,
    users,
    businessId,
    loading,
    fetchBusinessId,
    fetchCategories,
    fetchStatuses,
    fetchUsers
  };
};

export default useTaskData; 