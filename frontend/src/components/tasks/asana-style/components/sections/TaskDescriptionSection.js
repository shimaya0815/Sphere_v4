import React, { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import TaskDescriptionEditor from '../../../../editor/TaskDescriptionEditor';

/**
 * タスクの説明を表示・編集するコンポーネント
 * リッチテキストエディタを使用
 */
const TaskDescriptionSection = ({ control, handleFieldChange }) => {
  // マウント時に初期値をセット
  useEffect(() => {
    if (!control) return;
    
    // 明示的に初期値をセット
    const currentValue = control._formValues?.description;
    handleFieldChange('description', currentValue || '', false);
    
    // フォームに設定された初期値も反映 - control.setValueは使用しない
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
                // 空のコンテンツかどうかチェック (Quillの空コンテンツパターン)
                let processedContent = '';
                if (content && content !== '<p><br></p>' && content !== '<p></p>') {
                  processedContent = content;
                }
                
                // フィールド値を更新
                field.onChange(processedContent);
                
                // コンソールログで値を確認
                console.log('説明変更:', {
                  original: content,
                  processed: processedContent,
                  isQuillEmpty: content === '<p><br></p>' || content === '<p></p>'
                });
                
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