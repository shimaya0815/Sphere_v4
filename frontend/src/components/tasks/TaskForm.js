import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { tasksApi } from '../../api';

const TaskForm = ({ task, onClose, onTaskSaved }) => {
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();

  useEffect(() => {
    const fetchTaskMetadata = async () => {
      try {
        const [categoriesData, statusesData, prioritiesData] = await Promise.all([
          tasksApi.getCategories(),
          tasksApi.getStatuses(),
          tasksApi.getPriorities(),
        ]);
        
        setCategories(categoriesData.results || categoriesData);
        setStatuses(statusesData.results || statusesData);
        setPriorities(prioritiesData.results || prioritiesData);
      } catch (error) {
        console.error('Error fetching task metadata:', error);
        toast.error('タスクのメタデータの取得に失敗しました');
      }
    };

    fetchTaskMetadata();
  }, []);

  useEffect(() => {
    if (task) {
      // ここで既存のタスクデータをフォームにセット
      reset({
        title: task.title,
        description: task.description,
        category: task.category?.id,
        status: task.status?.id,
        priority: task.priority?.id,
        due_date: task.due_date ? task.due_date.substring(0, 10) : '',
        estimated_hours: task.estimated_hours || '',
      });
    }
  }, [task, reset]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      let result;
      if (task) {
        // 既存タスクの更新
        result = await tasksApi.updateTask(task.id, data);
        toast.success('タスクが更新されました');
      } else {
        // 新規タスクの作成
        result = await tasksApi.createTask(data);
        toast.success('タスクが作成されました');
      }
      
      onTaskSaved(result);
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('タスクの保存中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6">{task ? 'タスクを編集' : '新規タスク作成'}</h2>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
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
                  <option key={priority.id} value={priority.id}>{priority.name}</option>
                ))}
              </select>
              {errors.priority && (
                <p className="mt-1 text-xs text-red-600">{errors.priority.message}</p>
              )}
            </div>
          </div>

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
            </div>
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

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={onClose}
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
              {isSubmitting ? '保存中...' : task ? '更新' : '作成'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;