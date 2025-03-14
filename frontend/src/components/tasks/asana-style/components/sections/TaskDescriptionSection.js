import React from 'react';
import { Controller } from 'react-hook-form';
import TaskDescriptionEditor from '../../../../editor/TaskDescriptionEditor';

/**
 * タスクの説明を表示・編集するコンポーネント
 * リッチテキストエディタを使用
 */
const TaskDescriptionSection = ({ control, handleFieldChange }) => {
  return (
    <div>
      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
        説明
      </label>
      <div className="mt-1">
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TaskDescriptionEditor
              value={field.value || ''}
              onChange={(content) => {
                field.onChange(content);
                // 説明フィールドも自動保存しない
                handleFieldChange('description', content, true);
              }}
              onSave={(content) => {
                field.onChange(content);
                handleFieldChange('description', content, false);
              }}
            />
          )}
        />
      </div>
    </div>
  );
};

export default TaskDescriptionSection;