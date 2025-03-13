import React from 'react';
import { Controller } from 'react-hook-form';
import { HiOutlineCalendar } from 'react-icons/hi';

/**
 * タスクの日付と優先度を表示・編集するコンポーネント
 */
const TaskDatePrioritySection = ({ 
  control, 
  priorities, 
  handleFieldChange,
  formState,
  watch
}) => {
  const selectClassName = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md";
  const inputClassName = "mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md";
  
  // 日付入力フィールドの共通コンポーネント
  const DateField = ({ name, label, placeholder, required = false }) => (
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
                handleFieldChange(name, e.target.value);
              }}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <HiOutlineCalendar className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          {fieldState.error && (
            <p className="mt-1 text-sm text-red-600">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
  
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
          優先度
        </label>
        <div className="mt-1">
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <select
                id="priority"
                className={selectClassName}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  handleFieldChange('priority', e.target.value);
                }}
              >
                <option value="">指定なし</option>
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
                ))}
              </select>
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
        <label htmlFor="completed_date" className="block text-sm font-medium text-gray-700">
          完了日
        </label>
        <DateField
          name="completed_date"
          label="完了日"
          placeholder="完了日を選択"
        />
      </div>
    </div>
  );
};

export default TaskDatePrioritySection;