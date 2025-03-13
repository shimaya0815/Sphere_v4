import React from 'react';
import { Controller } from 'react-hook-form';

/**
 * タスクの追加設定（繰り返し設定、テンプレート設定）を表示・編集するコンポーネント
 */
const TaskAdditionalSettingsSection = ({ 
  control, 
  handleFieldChange,
  isNewTask,
  watch
}) => {
  const selectClassName = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md";
  const inputClassName = "mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md";
  
  // 繰り返し設定チェックボックスの状態監視
  const isRecurring = watch('is_recurring') === 'true' || watch('is_recurring') === true;
  
  // テンプレート設定チェックボックスの状態監視
  const isTemplate = watch('is_template') === 'true' || watch('is_template') === true;
  
  return (
    <div className="pt-4 border-t border-gray-200">
      <h3 className="text-md font-medium text-gray-700 mb-3">追加設定</h3>
      
      {/* 繰り返しタスク設定 */}
      <div className="mb-4">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <Controller
              name="is_recurring"
              control={control}
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <input
                  id="is_recurring"
                  type="checkbox"
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  checked={value === 'true' || value === true || false}
                  onChange={(e) => {
                    onChange(e.target.checked);
                    handleFieldChange('is_recurring', e.target.checked);
                  }}
                  onBlur={onBlur}
                  ref={ref}
                />
              )}
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="is_recurring" className="font-medium text-gray-700">繰り返しタスク</label>
            <p className="text-gray-500">指定した間隔で自動的に新しいタスクを作成します</p>
          </div>
        </div>
        
        {/* 繰り返し周期の設定（チェックがONの場合のみ表示） */}
        {isRecurring && (
          <div className="mt-3 ml-7 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="recurring_type" className="block text-sm font-medium text-gray-700">
                繰り返し周期
              </label>
              <div className="mt-1">
                <Controller
                  name="recurring_type"
                  control={control}
                  render={({ field }) => (
                    <select
                      id="recurring_type"
                      className={selectClassName}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('recurring_type', e.target.value);
                      }}
                    >
                      <option value="daily">毎日</option>
                      <option value="weekly">毎週</option>
                      <option value="monthly">毎月</option>
                      <option value="yearly">毎年</option>
                    </select>
                  )}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="recurring_interval" className="block text-sm font-medium text-gray-700">
                間隔
              </label>
              <div className="mt-1">
                <Controller
                  name="recurring_interval"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      id="recurring_interval"
                      className={inputClassName}
                      min="1"
                      placeholder="1"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('recurring_interval', e.target.value);
                      }}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* テンプレート設定（新規作成時のみ表示） */}
      {isNewTask && (
        <div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <Controller
                name="is_template"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <input
                    id="is_template"
                    type="checkbox"
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                    checked={value === 'true' || value === true || false}
                    onChange={(e) => {
                      onChange(e.target.checked);
                      handleFieldChange('is_template', e.target.checked);
                    }}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="is_template" className="font-medium text-gray-700">テンプレートとして保存</label>
              <p className="text-gray-500">このタスクをテンプレートとして保存し、後で再利用できるようにします</p>
            </div>
          </div>
          
          {/* テンプレート名の設定（チェックがONの場合のみ表示） */}
          {isTemplate && (
            <div className="mt-3 ml-7">
              <label htmlFor="template_name" className="block text-sm font-medium text-gray-700">
                テンプレート名
              </label>
              <div className="mt-1">
                <Controller
                  name="template_name"
                  control={control}
                  rules={{ required: 'テンプレート名は必須です' }}
                  render={({ field, fieldState }) => (
                    <div>
                      <input
                        type="text"
                        id="template_name"
                        className={inputClassName}
                        placeholder="テンプレート名を入力"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange('template_name', e.target.value);
                        }}
                      />
                      {fieldState.error && (
                        <p className="mt-1 text-sm text-red-600">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskAdditionalSettingsSection;