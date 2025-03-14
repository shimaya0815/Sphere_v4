import React, { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import TaskDescriptionEditor from '../../../../editor/TaskDescriptionEditor';

/**
 * タスクの説明を表示・編集するコンポーネント
 * リッチテキストエディタを使用
 */
const TaskDescriptionSection = ({ control, handleFieldChange }) => {
  // 説明フィールドの値を確実に親コンポーネントに通知する
  useEffect(() => {
    const currentValue = control._formValues.description;
    // 初期値をセット (空の場合も明示的に空文字を渡す)
    // スキップフラグはfalseに設定して確実に更新
    handleFieldChange('description', currentValue || '', false);
  }, []);
  
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
                let processedContent = content;
                
                // 空のコンテンツかどうかチェック (Quillの空コンテンツパターン)
                if (content === '<p><br></p>' || content === '<p></p>') {
                  processedContent = '';
                }
                
                // フィールド値を更新
                field.onChange(processedContent);
                
                // 親コンポーネントにも通知 (スキップフラグをfalseにして確実に更新)
                handleFieldChange('description', processedContent, false);
              }}
            />
          )}
        />
      </div>
    </div>
  );
};

export default TaskDescriptionSection;