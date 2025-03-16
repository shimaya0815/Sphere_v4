import React from 'react';
import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi';

const TaskFilters = ({ 
  filters, 
  onFilterChange, 
  onApplyFilters, 
  onResetFilters, 
  onClose, 
  currentUser,
  usersList = [] // ユーザー一覧を受け取る
}) => {
  return (
    <div className="bg-white shadow-card rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-700">検索条件</h2>
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <HiOutlineX className="w-5 h-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タスク名検索</label>
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
            <option value="not_started">未着手</option>
            <option value="in_progress">進行中</option>
            <option value="in_review">レビュー中</option>
            <option value="completed">完了</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
          <select
            className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={filters.priority}
            onChange={(e) => onFilterChange('priority', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
        
        {/* 決算期タスクフィルター追加 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タスク種別</label>
          <select
            className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={filters.is_fiscal_task}
            onChange={(e) => onFilterChange('is_fiscal_task', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="true">決算期関連タスク</option>
            <option value="false">通常タスク</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
          <select
            className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={filters.assignee}
            onChange={(e) => onFilterChange('assignee', e.target.value)}
          >
            <option value="">すべてのタスク</option>
            <option value={currentUser?.id || ''}>自分の担当タスク</option>
            <option value="unassigned">未割り当てタスク</option>
            
            {/* 他のユーザーのオプションを表示 */}
            {usersList.length > 0 && (
              <>
                <option disabled>──────────</option>
                {usersList
                  .filter(user => user.id !== currentUser?.id) // 自分以外のユーザーをフィルタリング
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name && user.last_name 
                        ? `${user.last_name} ${user.first_name}`
                        : user.username || `ユーザー ${user.id}`}
                    </option>
                  ))
                }
              </>
            )}
          </select>
        </div>
        
        <div className="flex items-end space-x-2">
          <button
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors text-sm"
            onClick={onApplyFilters}
          >
            検索
          </button>
          <button
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm"
            onClick={onResetFilters}
          >
            リセット
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskFilters; 