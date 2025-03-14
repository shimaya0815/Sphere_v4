import React from 'react';
import { Controller } from 'react-hook-form';
import { HiOutlineCalendar } from 'react-icons/hi';

/**
 * タスクの日付と優先度を表示・編集するコンポーネント
 */
const TaskDatePrioritySection = ({ 
  control, 
  handleFieldChange,
  formState,
  watch
}) => {
  const selectClassName = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md";
  const inputClassName = "mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md";
  
  // 日付入力フィールドの共通コンポーネント
  const DateField = ({ name, label, placeholder, required = false }) => {
    // 完了日は自動保存しないよう特別扱い
    const isCompletedDate = name === 'completed_at';

    return (
      <Controller
        name={name}
        control={control}
        rules={required ? { required: `${label}は必須です` } : {}}
        render={({ field, fieldState }) => (
          <div>
            <div className="relative">
              <input
                type="date"
                className={inputClassName}
                placeholder={placeholder}
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e);
                  // 完了日の場合は明示的な保存操作を要求
                  if (isCompletedDate) {
                    console.log('完了日を変更しました。保存ボタンを押して変更を確定してください。');
                  }
                  handleFieldChange(name, e.target.value, isCompletedDate);
                }}
              />
              {/* カレンダーアイコンを削除（ブラウザ標準のアイコンが表示されるため） */}
            </div>
            {fieldState.error && (
              <p className="mt-1 text-sm text-red-600">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />
    );
  };
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* 期限日 */}
      <div>
        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
          期限日
        </label>
        <DateField
          name="due_date"
          label="期限日"
          placeholder="期限日を選択"
        />
      </div>
      
      {/* 優先度 */}
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
          優先度（小さいほど優先度高）
        </label>
        <div className="mt-1">
          <Controller
            name="priority_value"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <input
                type="number"
                id="priority_value"
                className={inputClassName}
                min="1"
                max="100"
                placeholder="1-100 (小さいほど優先度高)"
                {...field}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value);
                  // 値が空になった場合も明示的に処理する
                  handleFieldChange('priority_value', value);
                }}
                onBlur={(e) => {
                  // フォーカスを失った時も空の値を明示的に処理
                  const value = e.target.value;
                  if (value === '') {
                    console.log('空の優先度値を明示的に保存します');
                    handleFieldChange('priority_value', null);
                  }
                }}
              />
            )}
          />
        </div>
      </div>
      
      {/* 開始日 */}
      <div>
        <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
          開始日
        </label>
        <DateField
          name="start_date"
          label="開始日"
          placeholder="開始日を選択"
        />
      </div>
      
      {/* 完了日 */}
      <div>
        <label htmlFor="completed_at" className="block text-sm font-medium text-gray-700">
          完了日
        </label>
        <DateField
          name="completed_at"
          label="完了日"
          placeholder="完了日を選択"
        />
      </div>
    </div>
  );
};

export default TaskDatePrioritySection;