import React from 'react';

/**
 * テンプレートタスク特有のフィールドグループ
 */
export const TemplateSpecificFields = ({
  register,
  errors,
  hasCustomSchedule
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="order">
            実行順序
          </label>
          <input
            id="order"
            type="number"
            className={`appearance-none relative block w-full px-4 py-3 border ${
              errors.order ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
            placeholder="1"
            min="1"
            {...register('order', {
              valueAsNumber: true,
              validate: value => !value || value >= 1 || '1以上の数を入力してください'
            })}
          />
          <p className="mt-1 text-xs text-gray-500">複数タスクがある場合の実行順序</p>
          {errors.order && (
            <p className="mt-1 text-xs text-red-600">{errors.order.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="has_custom_schedule">
            スケジュール設定
          </label>
          <select
            id="has_custom_schedule"
            className={`appearance-none relative block w-full px-4 py-3 border ${
              errors.has_custom_schedule ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
            {...register('has_custom_schedule')}
          >
            <option value="false">親テンプレートの設定を使用</option>
            <option value="true">カスタムスケジュールを設定</option>
          </select>
          {errors.has_custom_schedule && (
            <p className="mt-1 text-xs text-red-600">{errors.has_custom_schedule.message}</p>
          )}
        </div>
      </div>

      {/* カスタムスケジュール設定フィールド */}
      {hasCustomSchedule && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">スケジュール設定</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reference_date_type">
                基準日タイプ
              </label>
              <select
                id="reference_date_type"
                className={`appearance-none relative block w-full px-4 py-3 border ${
                  errors.reference_date_type ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
                {...register('reference_date_type', { required: hasCustomSchedule ? '基準日タイプは必須です' : false })}
              >
                <option value="parent_creation">親タスク作成日</option>
                <option value="execution_date">実行日（バッチ処理実行日）</option>
                <option value="fiscal_start">決算期開始日</option>
                <option value="fiscal_end">決算期終了日</option>
                <option value="month_start">当月初日</option>
                <option value="month_end">当月末日</option>
              </select>
              {errors.reference_date_type && (
                <p className="mt-1 text-xs text-red-600">{errors.reference_date_type.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="recurrence">
                繰り返し
              </label>
              <select
                id="recurrence"
                className={`appearance-none relative block w-full px-4 py-3 border ${
                  errors.recurrence ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
                {...register('recurrence', { required: hasCustomSchedule ? '繰り返しタイプは必須です' : false })}
              >
                <option value="with_parent">親テンプレートと同時</option>
                <option value="monthly">毎月</option>
                <option value="quarterly">四半期ごと</option>
                <option value="yearly">毎年</option>
                <option value="once">一度のみ</option>
              </select>
              {errors.recurrence && (
                <p className="mt-1 text-xs text-red-600">{errors.recurrence.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="creation_date_offset">
                作成日オフセット（日数）
              </label>
              <input
                id="creation_date_offset"
                type="number"
                className={`appearance-none relative block w-full px-4 py-3 border ${
                  errors.creation_date_offset ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
                placeholder="基準日からの日数"
                {...register('creation_date_offset', {
                  valueAsNumber: true,
                  required: hasCustomSchedule ? '作成日オフセットは必須です' : false
                })}
              />
              <p className="mt-1 text-xs text-gray-500">基準日から何日後に作成するか（0=当日）</p>
              {errors.creation_date_offset && (
                <p className="mt-1 text-xs text-red-600">{errors.creation_date_offset.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="deadline_date_offset">
                期限日オフセット（日数）
              </label>
              <input
                id="deadline_date_offset"
                type="number"
                className={`appearance-none relative block w-full px-4 py-3 border ${
                  errors.deadline_date_offset ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
                placeholder="作成日からの日数"
                {...register('deadline_date_offset', {
                  valueAsNumber: true,
                  required: hasCustomSchedule ? '期限日オフセットは必須です' : false
                })}
              />
              <p className="mt-1 text-xs text-gray-500">作成日から何日後を期限とするか</p>
              {errors.deadline_date_offset && (
                <p className="mt-1 text-xs text-red-600">{errors.deadline_date_offset.message}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TemplateSpecificFields;