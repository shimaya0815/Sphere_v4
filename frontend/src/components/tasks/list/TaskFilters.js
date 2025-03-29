import React, { useEffect, useState } from 'react';
import { HiOutlineSearch, HiOutlineX, HiOutlineAdjustments, HiOutlineSave, HiOutlineBookmark } from 'react-icons/hi';
import { tasksApi } from '../../../api';
import usersApi from '../../../api/users';

// フィルター保存用モーダルコンポーネント
const SaveFilterModal = ({ isOpen, onClose, onSave, currentName = '' }) => {
  const [filterName, setFilterName] = useState(currentName);
  
  useEffect(() => {
    setFilterName(currentName);
  }, [currentName, isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">フィルター条件を保存</h3>
        <div className="mb-4">
          <label htmlFor="filter-name" className="block text-sm font-medium text-gray-700 mb-1">
            フィルター名
          </label>
          <input
            type="text"
            id="filter-name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="フィルター名を入力"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            onClick={() => onSave(filterName)}
            disabled={!filterName.trim()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskFilters = ({ 
  filters, 
  onFilterChange, 
  onApplyFilters, 
  onResetFilters, 
  onClose, 
  currentUser,
  usersList = [], // ユーザー一覧を受け取る
  clientsList = [] // クライアント一覧を受け取る
}) => {
  // ステータス一覧を状態として保持
  const [statusesList, setStatusesList] = useState([]);
  const [savedFilters, setSavedFilters] = useState([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [currentFilterName, setCurrentFilterName] = useState('');
  const [selectedSavedFilter, setSelectedSavedFilter] = useState('');
  
  // 保存済みフィルターを取得
  useEffect(() => {
    const fetchSavedFilters = async () => {
      if (!currentUser?.id) return;
      
      try {
        const preferences = await usersApi.getUserPreferences();
        if (preferences && preferences.saved_filters) {
          setSavedFilters(Object.entries(preferences.saved_filters).map(([key, value]) => ({
            id: key,
            name: value.name,
            filters: value.filters
          })));
        }
      } catch (error) {
        console.error('保存済みフィルターの取得中にエラーが発生しました:', error);
      }
    };
    
    fetchSavedFilters();
  }, [currentUser]);
  
  // コンポーネントマウント時にステータス一覧を取得
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        // キャッシュからステータス一覧を取得
        if (window.__SPHERE_CACHED_STATUSES && window.__SPHERE_CACHED_STATUSES.length > 0) {
          setStatusesList(window.__SPHERE_CACHED_STATUSES);
          return;
        }
        
        // APIからステータス一覧を取得
        const response = await tasksApi.getStatuses();
        if (response.data && Array.isArray(response.data)) {
          setStatusesList(response.data.sort((a, b) => a.order - b.order));
        }
      } catch (error) {
        console.error('ステータス一覧の取得中にエラーが発生しました:', error);
      }
    };
    
    fetchStatuses();
  }, []);
  
  // フィルター保存ボタンのクリックハンドラ
  const handleSaveFilterClick = () => {
    setCurrentFilterName('');
    setSaveModalOpen(true);
  };
  
  // フィルター保存の実行
  const handleSaveFilter = async (name) => {
    if (!currentUser?.id || !name.trim()) return;
    
    try {
      // 現在のユーザー設定を取得
      const preferences = await usersApi.getUserPreferences();
      const currentSavedFilters = preferences.saved_filters || {};
      
      // 新しいフィルターIDを生成（タイムスタンプ）
      const filterId = `filter_${Date.now()}`;
      
      // 保存するフィルター設定
      const updatedSavedFilters = {
        ...currentSavedFilters,
        [filterId]: {
          name: name.trim(),
          filters: { ...filters },
          created_at: new Date().toISOString()
        }
      };
      
      // 設定を更新
      await usersApi.updateUserPreferences({
        saved_filters: updatedSavedFilters
      });
      
      // 保存済みフィルター一覧を更新
      setSavedFilters(Object.entries(updatedSavedFilters).map(([key, value]) => ({
        id: key,
        name: value.name,
        filters: value.filters
      })));
      
      // モーダルを閉じる
      setSaveModalOpen(false);
    } catch (error) {
      console.error('フィルター設定の保存でエラーが発生しました:', error);
    }
  };
  
  // 保存済みフィルターの選択
  const handleSelectSavedFilter = (filterId) => {
    if (filterId === '') {
      return;
    }
    
    const selectedFilter = savedFilters.find(filter => filter.id === filterId);
    if (selectedFilter) {
      // フィルター設定を適用
      Object.entries(selectedFilter.filters).forEach(([key, value]) => {
        onFilterChange(key, value);
      });
      
      // すぐにフィルターを適用
      setTimeout(onApplyFilters, 0);
    }
    
    setSelectedSavedFilter(filterId);
  };

  return (
    <div className="bg-white shadow-card rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-700">フィルター条件</h2>
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <HiOutlineX className="w-5 h-5" />
        </button>
      </div>
      
      {/* 保存済みフィルター選択 */}
      {savedFilters.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">保存済みフィルター</label>
          <div className="flex space-x-2">
            <select
              className="appearance-none relative block flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={selectedSavedFilter}
              onChange={(e) => handleSelectSavedFilter(e.target.value)}
            >
              <option value="">選択してください</option>
              {savedFilters.map(filter => (
                <option key={filter.id} value={filter.id}>
                  {filter.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タイトル検索</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <HiOutlineSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              className="pl-10 appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="タスク名を入力..."
              value={filters.searchTerm}
              onChange={(e) => onFilterChange('searchTerm', e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
          <select
            className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="">すべて</option>
            {statusesList.map(status => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">クライアント</label>
          <select
            className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={filters.client}
            onChange={(e) => onFilterChange('client', e.target.value)}
          >
            <option value="">すべて</option>
            {clientsList.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
          <select
            className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={filters.assignee}
            onChange={(e) => onFilterChange('assignee', e.target.value)}
          >
            <option value="">すべて</option>
            {currentUser && (
              <option value={currentUser.id}>自分の担当タスク</option>
            )}
            <option value="unassigned">未割り当て</option>
            {usersList.map(user => (
              <option key={user.id} value={user.id}>
                {user.username || user.email || `User ${user.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* 追加のフィルターオプション - チェックボックス */}
      <div className="mt-4">
        <div className="flex items-center">
          <input
            id="hide-completed"
            name="hide_completed"
            type="checkbox"
            checked={filters.hide_completed}
            onChange={(e) => onFilterChange('hide_completed', e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="hide-completed" className="ml-2 block text-sm text-gray-700">
            承認完了（クローズ）のタスクを非表示
          </label>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            type="button"
            className="flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
            onClick={handleSaveFilterClick}
          >
            <HiOutlineSave className="w-4 h-4 mr-1" />
            フィルターを保存
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            onClick={onResetFilters}
          >
            リセット
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            onClick={onApplyFilters}
          >
            フィルターを適用
          </button>
        </div>
      </div>
      
      {/* フィルター保存モーダル */}
      <SaveFilterModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveFilter}
        currentName={currentFilterName}
      />
    </div>
  );
};

export default TaskFilters; 