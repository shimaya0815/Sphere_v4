import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { tasksApi, clientsApi, usersApi } from '../../api';

const TaskForm = ({ task, onClose, onTaskSaved }) => {
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFiscalTask, setIsFiscalTask] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();

  // Watch client and isFiscalTask fields for dependent dropdowns
  const watchedClient = watch('client');
  const watchedIsFiscalTask = watch('is_fiscal_task');

  useEffect(() => {
    const fetchTaskMetadata = async () => {
      try {
        setIsLoadingUsers(true);
        
        const [
          categoriesData, 
          statusesData, 
          prioritiesData, 
          clientsData,
          workersData,
          reviewersData
        ] = await Promise.all([
          tasksApi.getCategories(),
          tasksApi.getStatuses(),
          tasksApi.getPriorities(),
          clientsApi.getClients({ contract_status: 'active' }), // Get only active clients
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

        // Process clients
        if (Array.isArray(clientsData)) {
          setClients(clientsData);
        } else if (clientsData && Array.isArray(clientsData.results)) {
          setClients(clientsData.results);
        } else {
          setClients([]);
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
      } catch (error) {
        console.error('Error fetching task metadata:', error);
        toast.error('タスクのメタデータの取得に失敗しました');
        
        // Set default values on error
        setCategories([]);
        setStatuses([]);
        setPriorities([]);
        setClients([]);
        setWorkers([]);
        setReviewers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchTaskMetadata();
  }, []);

  // Load fiscal years when client changes
  useEffect(() => {
    const fetchFiscalYears = async () => {
      if (watchedClient) {
        try {
          const fiscalYearsData = await clientsApi.getFiscalYears(watchedClient);
          console.log('Fiscal years data:', fiscalYearsData);
          setFiscalYears(fiscalYearsData);
          
          // If there's already a client selected, find it
          const selectedClientData = clients.find(c => c.id === parseInt(watchedClient));
          setSelectedClient(selectedClientData);
          
        } catch (error) {
          console.error('Error fetching fiscal years:', error);
          setFiscalYears([]);
        }
      } else {
        setFiscalYears([]);
        setSelectedClient(null);
      }
    };

    fetchFiscalYears();
  }, [watchedClient, clients]);

  // Update isFiscalTask state when the checkbox changes
  useEffect(() => {
    setIsFiscalTask(watchedIsFiscalTask === 'true');
  }, [watchedIsFiscalTask]);

  useEffect(() => {
    if (task) {
      // Set form values from existing task
      reset({
        title: task.title,
        description: task.description,
        category: task.category?.id,
        status: task.status?.id,
        priority: task.priority?.id,
        due_date: task.due_date ? task.due_date.substring(0, 10) : '',
        estimated_hours: task.estimated_hours || '',
        client: task.client?.id || '',
        is_fiscal_task: task.is_fiscal_task ? 'true' : 'false',
        fiscal_year: task.fiscal_year?.id || '',
        worker: task.worker?.id || '',
        reviewer: task.reviewer?.id || '',
      });
      
      // Update state values
      setIsFiscalTask(task.is_fiscal_task);
      if (task.client) {
        setSelectedClient(task.client);
      }
    }
  }, [task, reset]);

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
        client: data.client ? parseInt(data.client) : null,
        worker: data.worker ? parseInt(data.worker) : null,
        reviewer: data.reviewer ? parseInt(data.reviewer) : null,
        // Format date for API
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        // Convert checkbox values
        is_fiscal_task: data.is_fiscal_task === 'true',
        // Only include fiscal_year if is_fiscal_task is true
        fiscal_year: data.is_fiscal_task === 'true' && data.fiscal_year ? parseInt(data.fiscal_year) : null,
      };
      
      console.log('タスク送信データ:', formattedData);
      
      let result;
      if (task) {
        // Update existing task
        result = await tasksApi.updateTask(task.id, formattedData);
        toast.success('タスクが更新されました');
      } else {
        // Create new task
        result = await tasksApi.createTask(formattedData);
        toast.success('タスクが作成されました');
      }
      
      console.log('サーバーレスポンス:', result);
      onTaskSaved(result);
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      // Get detailed error message
      let errorMessage = 'タスクの保存中にエラーが発生しました';
      
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

          {/* クライアント選択フィールド */}
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
                    {worker.first_name} {worker.last_name}
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
                    {reviewer.first_name} {reviewer.last_name}
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