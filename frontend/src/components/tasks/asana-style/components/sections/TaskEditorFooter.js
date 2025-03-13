import React from 'react';
import { HiOutlineTrash } from 'react-icons/hi';

/**
 * TaskEditorのフッター部分（保存ボタン、キャンセルボタン、削除ボタン）
 */
const TaskEditorFooter = ({
  isNewTask,
  task,
  onClose,
  handleSubmit,
  submitTask,
  saveState,
  handleDeleteConfirm
}) => {
  return (
    <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 flex justify-between">
      {/* 左側：削除ボタン（新規作成時は非表示） */}
      <div>
        {!isNewTask && task && (
          <button
            type="button"
            className="bg-white py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            onClick={handleDeleteConfirm}
          >
            <HiOutlineTrash className="inline-block mr-1 -mt-1" />
            削除
          </button>
        )}
      </div>
      
      {/* 右側：キャンセル・保存ボタン */}
      <div className="flex">
        <button
          type="button"
          className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          onClick={onClose}
        >
          キャンセル
        </button>
        <button
          type="button"
          className="bg-primary-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          onClick={handleSubmit(submitTask)}
          disabled={saveState === 'saving'}
        >
          {isNewTask ? '作成' : '保存'}
          {saveState === 'saving' && '中...'}
        </button>
      </div>
    </div>
  );
};

export default TaskEditorFooter;