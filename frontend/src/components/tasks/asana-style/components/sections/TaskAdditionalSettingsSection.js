import React from 'react';
import { Controller } from 'react-hook-form';

/**
 * タスクの追加設定（繰り返し設定、テンプレート設定）を表示・編集するコンポーネント
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
  
  // 繰り返し設定チェックボックスの状態監視
  const isRecurring = safeWatch('is_recurring') === 'true' || safeWatch('is_recurring') === true;
  
  // テンプレート設定チェックボックスの状態監視
  const isTemplate = watchedIsTemplate === 'true' || watchedIsTemplate === true;
  
  // クライアントの選択状態監視
  const selectedClient = safeWatch('client');
  
  // クライアントとフィスカルイヤーのデータ確認用ログ
  console.log('TaskAdditionalSettingsSection - clients:', clients);
  console.log('TaskAdditionalSettingsSection - clients[0]:', clients[0]);
  console.log('TaskAdditionalSettingsSection - fiscalYears:', fiscalYears);
  console.log('TaskAdditionalSettingsSection - selectedClient:', selectedClient);
  
  return (
    <div className="pt-4 border-t border-gray-200">
      <h3 className="text-md font-medium text-gray-700 mb-3">追加設定</h3>
      
      {/* クライアント選択 - 不要なので非表示にする */}
      {/* <div className="mb-4">
        <label htmlFor="client" className="block text-sm font-medium text-gray-700">
          クライアント
        </label>
        <div className="mt-1">
          <Controller
            name="client"
            control={control}
            render={({ field }) => (
              <select
                id="client"
                className={selectClassName}
                {...field}
                onChange={(e) => {
                  console.log('Client selected:', e.target.value);
                  field.onChange(e);
                  handleFieldChange('client', e.target.value);
                }}
              >
                <option value="">選択してください</option>
                {clients && clients.length > 0 ? (
                  clients.map((client) => {
                    // クライアントデータの構造をログ出力
                    console.log('Client option:', client);
                    
                    // クライアントの名前とIDプロパティを確認
                    const clientId = client.id;
                    // クライアント名が異なるプロパティ名で保存されている可能性を考慮
                    const clientName = client.name || client.client_name || client.title || `クライアント #${client.id}`;
                    
                    return (
                      <option key={clientId} value={clientId}>
                        {clientName}
                      </option>
                    );
                  })
                ) : (
                  <option value="" disabled>クライアントがありません</option>
                )}
              </select>
            )}
          />
        </div>
      </div> */}
      
      {/* 決算タスク設定 - 要件に従い削除 */}
      
      {/* 繰り返しタスク設定 */}
      <div className="mb-4">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <Controller
              name="is_recurring"
              control={control}
              render={({ field }) => (
                <input
                  id="is_recurring"
                  type="checkbox"
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  checked={field.value === 'true' || field.value === true}
                  onChange={(e) => {
                    const newValue = e.target.checked ? 'true' : 'false';
                    field.onChange(newValue);
                    handleFieldChange('is_recurring', newValue);
                  }}
                />
              )}
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="is_recurring" className="font-medium text-gray-700">繰り返しタスク</label>
            <p className="text-gray-500">指定した間隔で自動的に新しいタスクを作成します</p>
          </div>
        </div>
        
        {isRecurring && (
          <div className="mt-3 ml-7 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="recurrence_pattern" className="block text-sm font-medium text-gray-700">繰り返しパターン</label>
              <div className="mt-1">
                <Controller
                  name="recurrence_pattern"
                  control={control}
                  render={({ field }) => (
                    <select
                      id="recurrence_pattern"
                      className={selectClassName}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('recurrence_pattern', e.target.value);
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
              <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-gray-700">繰り返し終了日</label>
              <div className="mt-1">
                <Controller
                  name="recurrence_end_date"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="date"
                      id="recurrence_end_date"
                      className={inputClassName}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('recurrence_end_date', e.target.value);
                      }}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
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