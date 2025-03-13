import React from 'react';
import { Controller } from 'react-hook-form';

/**
 * タスクの説明を表示・編集するコンポーネント
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
            <textarea
              id="description"
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
              rows={4}
              placeholder="タスクの詳細を入力"
              {...field}
              onChange={(e) => {
                field.onChange(e);
                handleFieldChange('description', e.target.value);
              }}
            />
          )}
        />
      </div>
    </div>
  );
};

export default TaskDescriptionSection;