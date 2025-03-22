import React, { useEffect } from 'react';
import { Controller } from 'react-hook-form';

/**
 * タスクの基本情報（ステータス、タイトル、カテゴリー、クライアント、決算期）を表示・編集するコンポーネント
 */
const TaskBasicInfoSection = ({ 
  control, 
  statuses = [], 
  categories = [], 
  clients = [], 
  fiscalYears = [],
  formState = {},
  handleFieldChange,
  watch = () => null,
  task
}) => {
  const selectClassName = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md";
  const inputClassName = "mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md";
  
  // watchが関数でない場合の安全対策
  const safeWatch = typeof watch === 'function' ? watch : () => null;
  
  // クライアントの選択状態を監視
  const selectedClientId = safeWatch('client');
  
  // 選択されたクライアントに関連する決算期を取得
  const filteredFiscalYears = selectedClientId && fiscalYears
    ? fiscalYears.filter(fy => fy.client === parseInt(selectedClientId)) 
    : [];

  return (
    <>
      {/* ステータスとタイトル */}
      <div className="grid grid-cols-3 gap-4 items-start">
        {/* ステータス */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            ステータス
          </label>
          <div className="mt-1">
            <Controller
              name="status"
              control={control}
              defaultValue={task?.status || ''}
              render={({ field }) => (
                <select
                  id="status"
                  className={selectClassName}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e);
                    handleFieldChange('status', e.target.value);
                  }}
                >
                  <option value="">選択してください</option>
                  {Array.isArray(statuses) && statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>
        
        {/* タイトル (大きく表示) */}
        <div className="col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            タイトル
          </label>
          <div className="mt-1">
            <Controller
              name="title"
              control={control}
              defaultValue={task?.title || ''}
              rules={{ required: 'タイトルは必須です' }}
              render={({ field, fieldState }) => (
                <div>
                  <input
                    type="text"
                    id="title"
                    className={inputClassName}
                    placeholder="タスク名を入力"
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('title', e.target.value);
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
      </div>

      {/* カテゴリー、クライアント、決算期 */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        {/* カテゴリー */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            カテゴリー
          </label>
          <div className="mt-1">
            <Controller
              name="category"
              control={control}
              defaultValue={task?.category || ''}
              render={({ field }) => (
                <div className="relative">
                  <select
                    id="category"
                    className={`${selectClassName} pl-7`} /* 左側にカラーマーカーのスペースを確保 */
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange(e);
                      // 「カテゴリーなし」を選択した場合は明示的にnullを送信
                      handleFieldChange('category', e.target.value === '' ? null : e.target.value);
                    }}
                  >
                    <option value="">カテゴリーなし</option>
                    {Array.isArray(categories) && categories.map((category) => (
                      <option key={category.id} value={category.id} data-color={category.color || '#6366F1'}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {field.value && (
                    <div
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: categories.find(c => c.id.toString() === field.value.toString())?.color || '#6366F1'
                      }}
                    />
                  )}
                </div>
              )}
            />
          </div>
        </div>
        
        {/* クライアント */}
        <div>
          <label htmlFor="client" className="block text-sm font-medium text-gray-700">
            クライアント
          </label>
          <div className="mt-1">
            <Controller
              name="client"
              control={control}
              defaultValue={task?.client || ''}
              render={({ field }) => (
                <select
                  id="client"
                  className={selectClassName}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e);
                    // 「クライアントなし」を選択した場合は明示的にnullを送信
                    handleFieldChange('client', e.target.value === '' ? null : e.target.value);
                  }}
                >
                  <option value="">クライアントなし</option>
                  {Array.isArray(clients) && clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>
        
        {/* 決算期 - クライアントが選択されている場合のみ表示 */}
        <div>
          <label htmlFor="fiscal_year" className="block text-sm font-medium text-gray-700">
            決算期
          </label>
          <div className="mt-1">
            <Controller
              name="fiscal_year"
              control={control}
              defaultValue={task?.fiscal_year || ''}
              render={({ field }) => (
                <select
                  id="fiscal_year"
                  className={selectClassName}
                  disabled={!selectedClientId}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e);
                    handleFieldChange('fiscal_year', e.target.value === '' ? null : e.target.value);
                  }}
                >
                  <option value="">決算期なし</option>
                  {Array.isArray(filteredFiscalYears) && filteredFiscalYears.map((fiscalYear) => (
                    <option key={fiscalYear.id} value={fiscalYear.id}>
                      {fiscalYear.end_date 
                        ? fiscalYear.end_date.substring(0, 10) 
                        : (fiscalYear.year ? `${fiscalYear.year}-12-31` : '決算期')}
                      {(fiscalYear.fiscal_period || fiscalYear.period) ? `(第${fiscalYear.fiscal_period || fiscalYear.period}期)` : ''}
                      {fiscalYear.is_current && ' (現在)'}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>
      </div>
      
      {/* タグ選択フィールド */}
      <div className="mt-4">
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
          タグ
        </label>
        <div className="mt-1">
          <Controller
            name="tags"
            control={control}
            defaultValue={task?.tags || []}
            render={({ field }) => (
              <div>
                <select
                  id="tags"
                  className={selectClassName}
                  multiple
                  value={field.value || []}
                  onChange={(e) => {
                    // 複数選択の値を配列として取得
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    field.onChange(selectedOptions);
                    handleFieldChange('tags', selectedOptions);
                  }}
                >
                  <option value="1">重要</option>
                  <option value="2">緊急</option>
                  <option value="3">要注意</option>
                  <option value="4">要フォロー</option>
                  <option value="5">簡単</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">※Ctrlキーを押しながらクリックで複数選択</p>
              </div>
            )}
          />
        </div>
      </div>
    </>
  );
};

export default TaskBasicInfoSection;