import React from 'react';

// 一括編集操作バーコンポーネント
export const TaskBulkEditBar = ({ selectedCount, onEditClick, onClearSelection }) => {
  if (selectedCount === 0) return null;
  
  return (
    <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg mb-4 flex justify-between items-center">
      <div className="font-medium text-indigo-800">
        {selectedCount}件のタスクを選択中
      </div>
      <div className="flex space-x-2">
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-4 rounded-lg transition-colors text-sm"
          onClick={onEditClick}
        >
          一括編集
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-1.5 px-4 rounded-lg transition-colors text-sm"
          onClick={onClearSelection}
        >
          選択解除
        </button>
      </div>
    </div>
  );
};

// 一括編集モーダルコンポーネント
const TaskBulkEditModal = ({ 
  isOpen, 
  onClose, 
  selectedCount,
  bulkEditData, 
  onBulkEditDataChange, 
  onSubmit, 
  isLoading,
  currentUser,
  usersList = [] 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 text-center">
        <div className="fixed inset-0 bg-black opacity-30"></div>
        
        <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle bg-white rounded-lg shadow-xl transform transition-all">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            タスクの一括編集 ({selectedCount}件)
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <select
                className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={bulkEditData.status}
                onChange={(e) => onBulkEditDataChange('status', e.target.value)}
              >
                <option value="">変更しない</option>
                <option value="1">未着手</option>
                <option value="2">作業中</option>
                <option value="3">作業者完了</option>
                <option value="4">レビュー中</option>
                <option value="5">差戻中</option>
                <option value="6">差戻対応中</option>
                <option value="7">差戻対応済</option>
                <option value="8">完了</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作業者</label>
              <select
                className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={bulkEditData.worker}
                onChange={(e) => onBulkEditDataChange('worker', e.target.value)}
              >
                <option value="">変更しない</option>
                <option value={currentUser?.id || ''}>自分</option>
                {usersList && usersList.length > 0 && 
                  usersList
                    .filter(user => user.id !== currentUser?.id) // 自分以外のユーザー
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username || user.email || `ユーザー ${user.id}`}
                      </option>
                    ))
                }
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">レビュアー</label>
              <select
                className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={bulkEditData.reviewer}
                onChange={(e) => onBulkEditDataChange('reviewer', e.target.value)}
              >
                <option value="">変更しない</option>
                <option value={currentUser?.id || ''}>自分</option>
                {usersList && usersList.length > 0 && 
                  usersList
                    .filter(user => user.id !== currentUser?.id) // 自分以外のユーザー
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username || user.email || `ユーザー ${user.id}`}
                      </option>
                    ))
                }
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期限日</label>
              <input
                type="date"
                className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={bulkEditData.due_date}
                onChange={(e) => onBulkEditDataChange('due_date', e.target.value)}
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onSubmit}
              disabled={isLoading}
            >
              {isLoading ? '更新中...' : '一括更新'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskBulkEditModal; 