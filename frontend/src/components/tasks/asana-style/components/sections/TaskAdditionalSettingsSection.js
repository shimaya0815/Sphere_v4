import React from 'react';
import { Controller } from 'react-hook-form';

/**
 * タスクの追加設定（テンプレート設定）を表示・編集するコンポーネント
 * 繰り返し設定は削除し、専用のセクションで管理
 */
const TaskAdditionalSettingsSection = ({ 
  control, 
  handleFieldChange,
  clients = [],
  fiscalYears = [],
  watchedIsTemplate,
  selectClassName,
  inputClassName,
  watch = () => null, // デフォルト値として空の関数を提供
  formState
}) => {
  // watchが関数でない場合のフォールバック
  const safeWatch = typeof watch === 'function' ? watch : () => null;
  
  // テンプレート設定チェックボックスの状態監視
  const isTemplate = watchedIsTemplate === 'true' || watchedIsTemplate === true;
  
  // クライアントの選択状態監視
  const selectedClient = safeWatch('client');
  
  return (
    <div className="pt-4 border-t border-gray-200">
      <h3 className="text-md font-medium text-gray-700 mb-3">追加設定</h3>
      
      {/* テンプレート設定 */}
      <div>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <Controller
              name="is_template"
              control={control}
              render={({ field }) => (
                <input
                  id="is_template"
                  type="checkbox"
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  checked={field.value === 'true' || field.value === true}
                  onChange={(e) => {
                    const newValue = e.target.checked ? 'true' : 'false';
                    field.onChange(newValue);
                    handleFieldChange('is_template', newValue);
                  }}
                />
              )}
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="is_template" className="font-medium text-gray-700">テンプレートとして保存</label>
            <p className="text-gray-500">このタスクをテンプレートとして保存し、後で再利用できるようにします</p>
          </div>
        </div>
        
        {isTemplate && (
          <div className="mt-3 ml-7">
            <label htmlFor="template_name" className="block text-sm font-medium text-gray-700">テンプレート名</label>
            <div className="mt-1">
              <Controller
                name="template_name"
                control={control}
                render={({ field }) => (
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
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskAdditionalSettingsSection;