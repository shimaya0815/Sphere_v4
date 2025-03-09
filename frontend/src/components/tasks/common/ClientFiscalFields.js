import React from 'react';

/**
 * クライアント選択と決算期関連のフィールドグループ
 */
export const ClientFiscalFields = ({ 
  register, 
  errors, 
  clients, 
  fiscalYears, 
  watchedClient, 
  isFiscalTask,
  selectedClient 
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="client">
            クライアント
          </label>
          <select
            id="client"
            className={`appearance-none relative block w-full px-4 py-3 border ${
              errors.client ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
            {...register('client')}
          >
            <option value="">クライアントを選択（任意）</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          {errors.client && (
            <p className="mt-1 text-xs text-red-600">{errors.client.message}</p>
          )}
        </div>

        {/* 決算期タスクかどうかの選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="is_fiscal_task">
            タスク種別
          </label>
          <select
            id="is_fiscal_task"
            className={`appearance-none relative block w-full px-4 py-3 border ${
              errors.is_fiscal_task ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
            {...register('is_fiscal_task')}
            disabled={!watchedClient} // クライアントが選択されていない場合は無効化
          >
            <option value="false">通常タスク</option>
            <option value="true">決算期関連タスク</option>
          </select>
        </div>
      </div>

      {/* 決算期選択フィールド（決算期タスクの場合のみ表示） */}
      {isFiscalTask && watchedClient && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="fiscal_year">
            決算期
          </label>
          <select
            id="fiscal_year"
            className={`appearance-none relative block w-full px-4 py-3 border ${
              errors.fiscal_year ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
            {...register('fiscal_year', { required: isFiscalTask ? '決算期は必須です' : false })}
          >
            <option value="">決算期を選択</option>
            {fiscalYears.map(fiscalYear => (
              <option key={fiscalYear.id} value={fiscalYear.id}>
                第{fiscalYear.fiscal_period}期 ({new Date(fiscalYear.start_date).toLocaleDateString()} 〜 {new Date(fiscalYear.end_date).toLocaleDateString()})
              </option>
            ))}
          </select>
          {errors.fiscal_year && (
            <p className="mt-1 text-xs text-red-600">{errors.fiscal_year.message}</p>
          )}
          {fiscalYears.length === 0 && isFiscalTask && (
            <p className="mt-1 text-xs text-amber-600">
              選択したクライアントに決算期情報が登録されていません。先にクライアント詳細画面で決算期を登録してください。
            </p>
          )}
        </div>
      )}

      {/* クライアント情報表示 */}
      {selectedClient && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">選択中のクライアント情報</h3>
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">クライアント名:</span> {selectedClient.name}</p>
            <p><span className="font-medium">契約状況:</span> {selectedClient.contract_status_display || selectedClient.contract_status}</p>
            {selectedClient.fiscal_year && (
              <p><span className="font-medium">現在の決算期:</span> 第{selectedClient.fiscal_year}期</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ClientFiscalFields;