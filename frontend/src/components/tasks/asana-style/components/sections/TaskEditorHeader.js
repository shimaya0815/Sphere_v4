import React from 'react';
import { HiOutlineX, HiCheck, HiOutlineClock } from 'react-icons/hi';

/**
 * TaskEditorのヘッダー部分（タイトル、閉じるボタン、保存状態表示）
 */
const TaskEditorHeader = ({ isNewTask, onClose, saveState, isDirty, saveChanges }) => {
  
  // 保存ステータス表示
  const renderSaveStatus = () => {
    switch (saveState) {
      case 'saving':
        return (
          <div className="flex items-center text-gray-500">
            <HiOutlineClock className="mr-1 animate-pulse" />
            <span>変更を保存中...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center text-green-500">
            <HiCheck className="mr-1" />
            <span>保存しました</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-500">
            <span>保存に失敗しました</span>
            <button 
              onClick={saveChanges} 
              className="ml-2 text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
            >
              再試行
            </button>
          </div>
        );
      default:
        return isDirty ? (
          <div className="flex items-center text-gray-500">
            <span>未保存の変更があります</span>
            <button 
              onClick={saveChanges} 
              className="ml-2 text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded"
            >
              保存
            </button>
          </div>
        ) : null;
    }
  };

  return (
    <div className="px-4 py-6 bg-white border-b border-gray-200 sm:px-6">
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          {isNewTask ? 'タスクを作成' : 'タスクを編集'}
        </h2>
        <div className="ml-3 h-7 flex items-center">
          <button
            onClick={onClose}
            className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <span className="sr-only">閉じる</span>
            <HiOutlineX className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      {/* 保存状態表示 */}
      <div className="mt-2 text-sm">
        {renderSaveStatus()}
      </div>
    </div>
  );
};

export default TaskEditorHeader;