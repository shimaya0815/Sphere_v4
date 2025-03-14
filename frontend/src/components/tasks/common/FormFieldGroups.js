import React from 'react';

// タイトルと説明フィールド
export const TitleDescriptionFields = ({ register, errors }) => {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
          タイトル
        </label>
        <input
          id="title"
          type="text"
          className={`appearance-none relative block w-full px-4 py-3 border ${
            errors.title ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
          placeholder="タスクのタイトルを入力"
          {...register('title', { required: 'タイトルは必須です' })}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
          説明
        </label>
        <textarea
          id="description"
          rows="4"
          className={`appearance-none relative block w-full px-4 py-3 border ${
            errors.description ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
          placeholder="タスクの詳細を入力"
          {...register('description')}
        />
      </div>
    </>
  );
};

// 担当者とレビュアーフィールド
export const AssigneeFields = ({ register, errors, workers, reviewers, isLoadingUsers }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="worker">
          担当者
        </label>
        <select
          id="worker"
          className={`appearance-none relative block w-full px-4 py-3 border ${
            errors.worker ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
          {...register('worker')}
          disabled={isLoadingUsers}
        >
          <option value="">担当者を選択</option>
          {workers.map(worker => (
            <option key={worker.id} value={worker.id}>
              {worker.first_name || ''} {worker.last_name || ''} {(!worker.first_name && !worker.last_name) ? worker.username || worker.email || `User ${worker.id}` : ''}
            </option>
          ))}
        </select>
        {errors.worker && (
          <p className="mt-1 text-xs text-red-600">{errors.worker.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reviewer">
          レビュアー
        </label>
        <select
          id="reviewer"
          className={`appearance-none relative block w-full px-4 py-3 border ${
            errors.reviewer ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
          {...register('reviewer')}
          disabled={isLoadingUsers}
        >
          <option value="">レビュアーを選択</option>
          {reviewers.map(reviewer => (
            <option key={reviewer.id} value={reviewer.id}>
              {reviewer.first_name || ''} {reviewer.last_name || ''} {(!reviewer.first_name && !reviewer.last_name) ? reviewer.username || reviewer.email || `User ${reviewer.id}` : ''}
            </option>
          ))}
        </select>
        {errors.reviewer && (
          <p className="mt-1 text-xs text-red-600">{errors.reviewer.message}</p>
        )}
      </div>
    </div>
  );
};

// ステータスと優先度フィールド
export const StatusPriorityFields = ({ register, errors, statuses, priorities }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">
          ステータス
        </label>
        <select
          id="status"
          className={`appearance-none relative block w-full px-4 py-3 border ${
            errors.status ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
          {...register('status', { required: 'ステータスは必須です' })}
        >
          <option value="">ステータスを選択</option>
          {statuses.map(status => (
            <option key={status.id} value={status.id}>{status.name}</option>
          ))}
        </select>
        {errors.status && (
          <p className="mt-1 text-xs text-red-600">{errors.status.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="priority">
          優先度
        </label>
        <select
          id="priority"
          className={`appearance-none relative block w-full px-4 py-3 border ${
            errors.priority ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
          {...register('priority', { required: '優先度は必須です' })}
        >
          <option value="">優先度を選択</option>
          {priorities.map(priority => (
            <option key={priority.id} value={priority.id}>
              {priority.priority_value !== undefined ? priority.priority_value : '未設定'}
            </option>
          ))}
        </select>
        {errors.priority && (
          <p className="mt-1 text-xs text-red-600">{errors.priority.message}</p>
        )}
      </div>
    </div>
  );
};

// カテゴリーと見積時間フィールド
export const CategoryEstimatedHoursFields = ({ register, errors, categories }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="category">
          カテゴリー
        </label>
        <select
          id="category"
          className={`appearance-none relative block w-full px-4 py-3 border ${
            errors.category ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
          {...register('category')}
        >
          <option value="">カテゴリーを選択</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="estimated_hours">
          見積時間 (時間)
        </label>
        <input
          id="estimated_hours"
          type="number"
          step="0.5"
          min="0"
          className={`appearance-none relative block w-full px-4 py-3 border ${
            errors.estimated_hours ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
          placeholder="2.5"
          {...register('estimated_hours', {
            valueAsNumber: true,
            validate: value => !value || value >= 0 || '正の数を入力してください'
          })}
        />
        {errors.estimated_hours && (
          <p className="mt-1 text-xs text-red-600">{errors.estimated_hours.message}</p>
        )}
      </div>
    </div>
  );
};

// フォーム送信ボタン
export const FormSubmitButtons = ({ onCancel, isSubmitting, isEdit }) => {
  return (
    <div className="flex justify-end space-x-3 mt-6">
      <button
        type="button"
        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        キャンセル
      </button>
      <button
        type="submit"
        className={`w-24 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
          isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
        }`}
        disabled={isSubmitting}
      >
        {isSubmitting ? '保存中...' : isEdit ? '更新' : '作成'}
      </button>
    </div>
  );
};