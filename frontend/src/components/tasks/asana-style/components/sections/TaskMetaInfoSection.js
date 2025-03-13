import React from 'react';

/**
 * タスクのメタ情報（作成日時、更新日時）を表示するコンポーネント
 */
const TaskMetaInfoSection = ({ task }) => {
  if (!task) return null;
  
  return (
    <div className="pt-4 border-t border-gray-200">
      <div className="flex justify-between text-sm text-gray-500">
        <span>作成日: {task.created_at ? new Date(task.created_at).toLocaleString() : '-'}</span>
        <span>更新日: {task.updated_at ? new Date(task.updated_at).toLocaleString() : '-'}</span>
      </div>
    </div>
  );
};

export default TaskMetaInfoSection;