import React from 'react';
import { Controller } from 'react-hook-form';

/**
 * タスクの基本情報（ステータス、タイトル、カテゴリー、クライアント、決算期）を表示・編集するコンポーネント
 */
const TaskBasicInfoSection = ({ 
  control, 
  statuses, 
  categories, 
  clients, 
  fiscalYears,
  formState,
  handleFieldChange,
  watch
}) => {
  const selectClassName = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md";
  const inputClassName = "mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md";
  
  // クライアントの選択状態を監視
  const selectedClientId = watch('client');
  
  // 選択されたクライアントに関連する決算期を取得
  const filteredFiscalYears = selectedClientId 
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
              render={({ field }) => (
                <select
                  id="status"
                  className={selectClassName}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    handleFieldChange('status', e.target.value);
                  }}
                >
                  <option value="">選択してください</option>
                  {statuses.map((status) => (
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
              rules={{ required: 'タイトルは必須です' }}
              render={({ field, fieldState }) => (
                <div>
                  <input
                    type="text"
                    id="title"
                    className={inputClassName}
                    placeholder="タスク名を入力"
                    {...field}
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
              render={({ field }) => (
                <select
                  id="category"
                  className={selectClassName}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    handleFieldChange('category', e.target.value);
                  }}
                >
                  <option value="">カテゴリーなし</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
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
              render={({ field }) => (
                <select
                  id="client"
                  className={selectClassName}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    handleFieldChange('client', e.target.value);
                  }}
                >
                  <option value="">クライアントなし</option>
                  {clients.map((client) => (
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
              render={({ field }) => (
                <select
                  id="fiscal_year"
                  className={selectClassName}
                  disabled={!selectedClientId}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    handleFieldChange('fiscal_year', e.target.value);
                  }}
                >
                  <option value="">決算期なし</option>
                  {filteredFiscalYears.map((fiscalYear) => (
                    <option key={fiscalYear.id} value={fiscalYear.id}>
                      {fiscalYear.year}年{fiscalYear.end_month || '3'}月
                      {fiscalYear.period ? `（第${fiscalYear.period}期）` : ''}
                      {fiscalYear.is_current && ' (現在)'}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskBasicInfoSection;