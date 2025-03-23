import React, { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import TaskDescriptionEditor from '../../../../editor/TaskDescriptionEditor';

/**
 * タスクの説明を表示・編集するコンポーネント
 * リッチテキストエディタを使用
 */
const TaskDescriptionSection = ({ control, handleFieldChange }) => {
  // マウント時の処理は削除 - 自動更新を防ぐ
  
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
                
                // フィールド値のみ更新（内部状態）
                field.onChange(processedContent);
                
                // 親コンポーネントに通知しない
                // 空オブジェクトを渡してAPI呼び出しを抑制
              }}
            />
          )}
        />
      </div>
    </div>
  );
};

export default TaskDescriptionSection;