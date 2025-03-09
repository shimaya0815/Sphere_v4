import React from 'react';

/**
 * 期限日フィールド（標準タスクフォーム用）
 */
export const DueDateField = ({ register, errors }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="due_date">
        期限日
      </label>
      <input
        id="due_date"
        type="date"
        className={`appearance-none relative block w-full px-4 py-3 border ${
          errors.due_date ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
        } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
        {...register('due_date')}
      />
      {errors.due_date && (
        <p className="mt-1 text-xs text-red-600">{errors.due_date.message}</p>
      )}
    </div>
  );
};

export default DueDateField;