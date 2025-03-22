import React from 'react';
import { Controller } from 'react-hook-form';
import { HiOutlineCalendar } from 'react-icons/hi';
import { formatISO } from 'date-fns';
import { formatDateForInput } from '../../utils';

/**
 * 日付と期限、優先度セクション
 */
const TaskDatePrioritySection = ({ 
  control, 
  handleFieldChange,
  formValues
}) => {
  // 入力フィールドのスタイルクラス
  const inputClassName = "mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md";
  
  // 日付変更ハンドラ
  const handleDateChange = (fieldName, value) => {
    // 日付が空の場合はnullとして保存
    const dateValue = value ? new Date(value) : null;
    
    // ISO形式に変換するか、nullのままにする
    const formattedValue = dateValue ? formatISO(dateValue) : null;
    
    handleFieldChange(fieldName, formattedValue);
  };
  
  return (
    <div className="task-dates-section space-y-4">
      {/* 優先度フィールド (数値入力) */}
      <div>
        <label htmlFor="priority_value" className="block text-sm font-medium text-gray-700">
          優先度（1〜100、小さいほど優先度が高い）
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
                min="1"
                max="100"
                className={inputClassName}
                placeholder="優先度（例: 10）"
                value={field.value || ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : '';
                  field.onChange(value);
                  handleFieldChange('priority_value', value === '' ? null : value);
                }}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 期限日 */}
        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
            期限日
          </label>
          <div>
            <div className="relative">
              <Controller
                name="due_date"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <input
                    type="date"
                    className={inputClassName}
                    placeholder="期限日を選択"
                    value={formatDateForInput(field.value)}
                    onChange={(e) => {
                      field.onChange(e);
                      handleDateChange('due_date', e.target.value);
                    }}
                  />
                )}
              />
            </div>
          </div>
        </div>
        
        {/* 開始日 */}
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
            開始日
          </label>
          <div>
            <div className="relative">
              <Controller
                name="start_date"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <input
                    type="date"
                    className={inputClassName}
                    placeholder="開始日を選択"
                    value={formatDateForInput(field.value)}
                    onChange={(e) => {
                      field.onChange(e);
                      handleDateChange('start_date', e.target.value);
                    }}
                  />
                )}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* 完了日 */}
        <div>
          <label htmlFor="completed_at" className="block text-sm font-medium text-gray-700">
            完了日
          </label>
          <div>
            <div className="relative">
              <Controller
                name="completed_at"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <input
                    type="date"
                    className={inputClassName}
                    placeholder="完了日を選択"
                    value={formatDateForInput(field.value)}
                    onChange={(e) => {
                      field.onChange(e);
                      handleDateChange('completed_at', e.target.value);
                    }}
                  />
                )}
              />
            </div>
          </div>
        </div>
        
        <div></div>
      </div>
    </div>
  );
};

export default TaskDatePrioritySection;