import React, { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import TaskDescriptionEditor from '../../../../editor/TaskDescriptionEditor';

/**
 * タスクの説明を表示・編集するコンポーネント
 * リッチテキストエディタを使用
 */
const TaskDescriptionSection = ({ control, handleFieldChange }) => {
  // 説明が変更されたときに確実に親コンポーネントに通知する
  useEffect(() => {
    const currentValue = control._formValues.description;
    // 初期値をセット
    handleFieldChange('description', currentValue || '', true);
  }, [control._formValues.description]);
  
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
                // ReactHookFormのフィールド値を更新
                field.onChange(content);
                // 説明フィールドに変更があれば親コンポーネントの状態も更新
                // 空の場合も明示的に空文字を渡す
                handleFieldChange('description', content === '<p><br></p>' || content === '<p></p>' ? '' : content, false);
              }}
            />
          )}
        />
      </div>
    </div>
  );
};

export default TaskDescriptionSection;