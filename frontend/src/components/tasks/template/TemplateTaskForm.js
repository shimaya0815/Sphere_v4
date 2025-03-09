import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { tasksApi, usersApi } from '../../../api';

const TemplateTaskForm = ({ parentTemplateId, templateTaskId = null, onSuccess, onCancel }) => {
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCustomSchedule, setHasCustomSchedule] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [parentTemplate, setParentTemplate] = useState(null);
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();

  // Watch custom schedule field for dependent fields
  const watchedHasCustomSchedule = watch('has_custom_schedule');

  useEffect(() => {
    const fetchTaskMetadata = async () => {
      try {
        setIsLoadingUsers(true);
        
        const [
          categoriesData, 
          statusesData, 
          prioritiesData, 
          workersData,
          reviewersData
        ] = await Promise.all([
          tasksApi.getCategories(),
          tasksApi.getStatuses(),
          tasksApi.getPriorities(),
          usersApi.getAvailableWorkers(),
          usersApi.getAvailableReviewers()
        ]);
        
        // Process categories
        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData);
        } else if (categoriesData && Array.isArray(categoriesData.results)) {
          setCategories(categoriesData.results);
        } else {
          setCategories([]);
        }
        
        // Process statuses
        if (Array.isArray(statusesData)) {
          setStatuses(statusesData);
        } else if (statusesData && Array.isArray(statusesData.results)) {
          setStatuses(statusesData.results);
        } else {
          setStatuses([]);
        }
        
        // Process priorities
        if (Array.isArray(prioritiesData)) {
          setPriorities(prioritiesData);
        } else if (prioritiesData && Array.isArray(prioritiesData.results)) {
          setPriorities(prioritiesData.results);
        } else {
          setPriorities([]);
        }
        
        // Process workers (担当者)
        if (Array.isArray(workersData)) {
          setWorkers(workersData);
        } else if (workersData && Array.isArray(workersData.results)) {
          setWorkers(workersData.results);
        } else {
          setWorkers([]);
        }
        
        // Process reviewers (レビュアー)
        if (Array.isArray(reviewersData)) {
          setReviewers(reviewersData);
        } else if (reviewersData && Array.isArray(reviewersData.results)) {
          setReviewers(reviewersData.results);
        } else {
          setReviewers([]);
        }
        
        // Fetch parent template
        if (parentTemplateId) {
          try {
            const parentTemplateData = await tasksApi.getTemplate(parentTemplateId);
            setParentTemplate(parentTemplateData);
          } catch (error) {
            console.error('Error fetching parent template:', error);
            toast.error('親テンプレートの取得に失敗しました');
          }
        }
      } catch (error) {
        console.error('Error fetching task metadata:', error);
        toast.error('タスクのメタデータの取得に失敗しました');
        
        // Set default values on error
        setCategories([]);
        setStatuses([]);
        setPriorities([]);
        setWorkers([]);
        setReviewers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchTaskMetadata();
  }, [parentTemplateId]);

  // Update hasCustomSchedule state when the checkbox changes
  useEffect(() => {
    setHasCustomSchedule(watchedHasCustomSchedule === 'true');
  }, [watchedHasCustomSchedule]);

  useEffect(() => {
    if (templateTaskId) {
      const fetchExistingTask = async () => {
        try {
          const task = await tasksApi.getTemplateTask(templateTaskId);
          
          // Set form values from existing task
          reset({
            title: task.title,
            description: task.description,
            category: task.category?.id,
            status: task.status?.id,
            priority: task.priority?.id,
            estimated_hours: task.estimated_hours || '',
            has_custom_schedule: task.has_custom_schedule ? 'true' : 'false',
            order: task.order || 1,
            worker: task.worker?.id || '',
            reviewer: task.reviewer?.id || '',
            schedule_type: task.schedule?.schedule_type || 'custom',
            recurrence: task.schedule?.recurrence || 'monthly',
            creation_date_offset: task.schedule?.creation_date_offset || 0,
            deadline_date_offset: task.schedule?.deadline_date_offset || 5,
            reference_date_type: task.schedule?.reference_date_type || 'execution_date',
          });
          
          // Update state values
          setHasCustomSchedule(task.has_custom_schedule);
        } catch (error) {
          console.error('Error fetching template task:', error);
          toast.error('テンプレートタスクの取得に失敗しました');
        }
      };
      
      fetchExistingTask();
    }
  }, [templateTaskId, reset]);
  
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Format data for API submission
      const formattedData = {
        ...data,
        // Convert string IDs to numbers
        status: data.status ? parseInt(data.status) : null,
        priority: data.priority ? parseInt(data.priority) : null,
        category: data.category ? parseInt(data.category) : null,
        worker: data.worker ? parseInt(data.worker) : null,
        reviewer: data.reviewer ? parseInt(data.reviewer) : null,
        order: data.order ? parseInt(data.order) : 1,
        // Convert checkbox values
        has_custom_schedule: data.has_custom_schedule === 'true',
        parent_template: parentTemplateId,
        is_template_task: true
      };
      
      console.log('Template task submission data:', formattedData);
      
      // スケジュールデータを準備
      let scheduleData = null;
      if (formattedData.has_custom_schedule) {
        scheduleData = {
          name: `${formattedData.title}のスケジュール`,
          schedule_type: data.schedule_type || 'custom',
          recurrence: data.recurrence || 'monthly',
          creation_date_offset: parseInt(data.creation_date_offset) || 0,
          deadline_date_offset: parseInt(data.deadline_date_offset) || 5,
          reference_date_type: data.reference_date_type || 'execution_date'
        };
        
        // Create or update schedule if needed
        if (scheduleData) {
          const newSchedule = await tasksApi.createTaskSchedule(scheduleData);
          formattedData.schedule = newSchedule.id;
        }
      }
      
      let result;
      if (templateTaskId) {
        // Update existing template task
        result = await tasksApi.updateTemplateTask(templateTaskId, formattedData);
        toast.success('テンプレートタスクが更新されました');
      } else {
        // Create new template task
        result = await tasksApi.createTemplateTask(formattedData);
        toast.success('テンプレートタスクが作成されました');
      }
      
      console.log('サーバーレスポンス:', result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('Error saving template task:', error);
      // Get detailed error message
      let errorMessage = 'テンプレートタスクの保存中にエラーが発生しました';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          // Format field-specific errors
          const errorDetails = Object.entries(error.response.data)
            .map(([field, errors]) => {
              if (Array.isArray(errors)) {
                return `${field}: ${errors.join(', ')}`;
              } else {
                return `${field}: ${errors}`;
              }
            })
            .join('; ');
          
          if (errorDetails) {
            errorMessage = `保存エラー: ${errorDetails}`;
          }
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6">{templateTaskId ? 'テンプレートタスクを編集' : '新規テンプレートタスク作成'}</h2>
      {parentTemplate && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">親テンプレート: {parentTemplate.template_name || parentTemplate.title}</p>
        </div>
      )}
      
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

          {/* 実行順序と設定タイプを同じ行に配置 */}
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

          {/* カスタムスケジュール設定フィールド（決算期選択の代わり） */}
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

          {/* 担当者とレビュアー選択フィールド */}
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
                    {priority.priority_value || '未設定'}
                  </option>
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
              {isSubmitting ? '保存中...' : templateTaskId ? '更新' : '作成'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TemplateTaskForm;