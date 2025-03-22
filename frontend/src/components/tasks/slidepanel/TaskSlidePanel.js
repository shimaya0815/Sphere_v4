import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { HiX, HiOutlineCalendar, HiOutlineUser, HiOutlineTag, HiOutlineClock } from 'react-icons/hi';
import { tasksApi, clientsApi, usersApi } from '../../../api';
import { formatDateForInput } from '../../../utils/dateUtils';
import toast from 'react-hot-toast';

/**
 * タスク作成・編集用スライドパネルコンポーネント
 */
const TaskSlidePanel = ({ isOpen, isNew, task, onClose, onTaskUpdated }) => {
  // フォーム管理
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      status: '',
      priority: '',
      category: '',
      due_date: '',
      estimated_hours: '',
      worker: '',
      reviewer: '',
      client: '',
      fiscal_year: ''
    }
  });

  // 各種データの状態管理
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [clients, setClients] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);

  // 参照
  const slidePanelRef = useRef(null);

  // データの初期ロード
  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  // タスクデータが変更されたらフォームを更新
  useEffect(() => {
    if (task && !isNew) {
      const formData = {
        title: task.title || '',
        description: task.description || '',
        status: task.status?.id || '',
        priority: task.priority?.id || '',
        category: task.category?.id || '',
        due_date: task.due_date ? formatDateForInput(new Date(task.due_date)) : '',
        estimated_hours: task.estimated_hours || '',
        worker: task.worker?.id || '',
        reviewer: task.reviewer?.id || '',
        client: task.client?.id || '',
        fiscal_year: task.fiscal_year?.id || ''
      };
      
      reset(formData);
      
      if (task.client) {
        setSelectedClient(task.client);
        loadFiscalYears(task.client.id);
      }
    }
  }, [task, isNew, reset]);

  // 必要なデータをロード
  const loadFormData = async () => {
    setIsLoading(true);
    try {
      // 並列で各種データを取得
      const [categoriesData, statusesData, prioritiesData, clientsData, workersData, reviewersData] = await Promise.all([
        tasksApi.getCategories(),
        tasksApi.getStatuses(),
        tasksApi.getPriorities(),
        clientsApi.getClients({ contract_status: 'active' }),
        usersApi.getAvailableWorkers(),
        usersApi.getAvailableReviewers()
      ]);

      // データをセット（配列でない場合は空配列を設定）
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setStatuses(Array.isArray(statusesData) ? statusesData : []);
      setPriorities(Array.isArray(prioritiesData) ? prioritiesData : []);
      
      // クライアントデータの処理
      let processedClients = [];
      if (Array.isArray(clientsData)) {
        processedClients = clientsData;
      } else if (clientsData && clientsData.results && Array.isArray(clientsData.results)) {
        // ページネーションオブジェクトの場合
        processedClients = clientsData.results;
      } else if (clientsData && typeof clientsData === 'object') {
        console.warn('クライアントデータが予期せぬ形式です：', clientsData);
        processedClients = [];
      } else {
        console.warn('クライアントデータが取得できませんでした');
        processedClients = [];
      }
      setClients(processedClients);
      
      // ユーザーデータの処理
      setWorkers(Array.isArray(workersData) ? workersData : []);
      setReviewers(Array.isArray(reviewersData) ? reviewersData : []);

      // 新規タスクの場合はデフォルト値を設定
      if (isNew) {
        // デフォルトの状態と優先度を設定
        const defaultStatus = statusesData && Array.isArray(statusesData) ? 
          (statusesData.find(status => status.name === '未着手')?.id || statusesData[0]?.id) : '';
        const defaultPriority = prioritiesData && Array.isArray(prioritiesData) ?
          (prioritiesData.find(priority => priority.id === 'medium')?.id || prioritiesData[0]?.id) : '';
        
        setValue('status', defaultStatus);
        setValue('priority', defaultPriority);
      }
    } catch (error) {
      console.error('Error loading form data:', error);
      console.error('Error details:', error.response?.data);
      toast.error('データの読み込みに失敗しました');
      
      // エラー時は空の配列をセット
      setCategories([]);
      setStatuses([]);
      setPriorities([]);
      setClients([]);
      setWorkers([]);
      setReviewers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // クライアントが選択されたら関連する決算期を読み込む
  const loadFiscalYears = async (clientId) => {
    if (!clientId) {
      setFiscalYears([]);
      return;
    }

    try {
      const response = await clientsApi.getFiscalYears(clientId);
      
      // レスポンスの形式をチェック
      let processedFiscalYears = [];
      if (Array.isArray(response)) {
        processedFiscalYears = response;
      } else if (response && response.results && Array.isArray(response.results)) {
        // ページネーションオブジェクトの場合
        processedFiscalYears = response.results;
      } else if (response && typeof response === 'object') {
        console.warn('決算期データが予期せぬ形式です：', response);
        processedFiscalYears = [];
      } else {
        console.warn('決算期データが取得できませんでした');
        processedFiscalYears = [];
      }
      
      setFiscalYears(processedFiscalYears);
    } catch (error) {
      console.error('Error loading fiscal years:', error);
      console.error('Error details:', error.response?.data);
      setFiscalYears([]);
    }
  };

  // クライアント変更時のハンドラ
  const handleClientChange = (e) => {
    const clientId = e.target.value;
    setValue('client', clientId);
    setValue('fiscal_year', ''); // 決算期をリセット

    if (clientId) {
      const selectedClient = clients.find(c => c.id.toString() === clientId.toString());
      setSelectedClient(selectedClient);
      loadFiscalYears(clientId);
    } else {
      setSelectedClient(null);
      setFiscalYears([]);
    }
  };

  // フォーム送信処理
  const onSubmit = async (data) => {
    try {
      let savedTask;

      if (isNew) {
        // 新規タスク作成
        savedTask = await tasksApi.createTask(data);
        toast.success('タスクを作成しました');
      } else {
        // 既存タスク更新
        savedTask = await tasksApi.updateTask(task.id, data);
        toast.success('タスクを更新しました');
      }

      // 親コンポーネントに通知
      if (onTaskUpdated) {
        onTaskUpdated(savedTask, isNew);
      }
      
      // 新規作成の場合は閉じる
      if (isNew) {
        handleClose();
      }
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error(error.response?.data?.detail || 'タスクの保存に失敗しました');
    }
  };

  // パネルを閉じる
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // 外側クリックでパネルを閉じる
  const handleOutsideClick = (e) => {
    if (slidePanelRef.current && !slidePanelRef.current.contains(e.target)) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-hidden z-50" onClick={handleOutsideClick}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div
            className="w-screen max-w-md"
            ref={slidePanelRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col bg-white shadow-xl overflow-y-auto">
              {/* ヘッダー */}
              <div className="px-4 py-6 bg-gray-50 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    {isNew ? 'タスクを作成' : 'タスクを編集'}
                  </h2>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={handleClose}
                  >
                    <span className="sr-only">閉じる</span>
                    <HiX className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* フォーム */}
              <form onSubmit={handleSubmit(onSubmit)} className="flex-1">
                <div className="flex-1 flex flex-col justify-between">
                  <div className="px-4 sm:px-6 py-6 space-y-6 sm:pb-6">
                    
                    {/* タイトル */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        タイトル<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="title"
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.title ? 'border-red-500' : ''}`}
                        {...register('title', { required: 'タイトルは必須です' })}
                      />
                      {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                    </div>

                    {/* 説明 */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        説明
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        {...register('description')}
                      />
                    </div>

                    {/* ステータスと優先度 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                          ステータス<span className="text-red-500">*</span>
                        </label>
                        <select
                          id="status"
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.status ? 'border-red-500' : ''}`}
                          {...register('status', { required: 'ステータスは必須です' })}
                        >
                          <option value="">選択してください</option>
                          {statuses.map(status => (
                            <option key={status.id} value={status.id}>
                              {status.name}
                            </option>
                          ))}
                        </select>
                        {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
                      </div>

                      <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                          優先度<span className="text-red-500">*</span>
                        </label>
                        <select
                          id="priority"
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.priority ? 'border-red-500' : ''}`}
                          {...register('priority', { required: '優先度は必須です' })}
                        >
                          <option value="">選択してください</option>
                          {priorities.map(priority => (
                            <option key={priority.id} value={priority.id}>
                              {priority.name}
                            </option>
                          ))}
                        </select>
                        {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>}
                      </div>
                    </div>

                    {/* カテゴリーと期限日 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                          カテゴリー
                        </label>
                        <select
                          id="category"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          {...register('category')}
                        >
                          <option value="">選択してください</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                          期限日
                        </label>
                        <input
                          type="date"
                          id="due_date"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          {...register('due_date')}
                        />
                      </div>
                    </div>

                    {/* 見積時間 */}
                    <div>
                      <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700">
                        見積時間（時間）
                      </label>
                      <input
                        type="number"
                        id="estimated_hours"
                        step="0.25"
                        min="0"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        {...register('estimated_hours', {
                          valueAsNumber: true,
                          min: { value: 0, message: '0以上の値を入力してください' }
                        })}
                      />
                      {errors.estimated_hours && <p className="mt-1 text-sm text-red-600">{errors.estimated_hours.message}</p>}
                    </div>

                    {/* 担当者情報 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="worker" className="block text-sm font-medium text-gray-700">
                          作業担当者
                        </label>
                        <select
                          id="worker"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          {...register('worker')}
                        >
                          <option value="">選択してください</option>
                          {workers.map(worker => (
                            <option key={worker.id} value={worker.id}>
                              {worker.first_name} {worker.last_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="reviewer" className="block text-sm font-medium text-gray-700">
                          レビュー担当者
                        </label>
                        <select
                          id="reviewer"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          {...register('reviewer')}
                        >
                          <option value="">選択してください</option>
                          {reviewers.map(reviewer => (
                            <option key={reviewer.id} value={reviewer.id}>
                              {reviewer.first_name} {reviewer.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* クライアント情報 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="client" className="block text-sm font-medium text-gray-700">
                          クライアント
                        </label>
                        <select
                          id="client"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          {...register('client')}
                          onChange={handleClientChange}
                        >
                          <option value="">選択してください</option>
                          {clients.map(client => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="fiscal_year" className="block text-sm font-medium text-gray-700">
                          決算期
                        </label>
                        <select
                          id="fiscal_year"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          {...register('fiscal_year')}
                          disabled={!selectedClient}
                        >
                          <option value="">選択してください</option>
                          {fiscalYears.map(year => (
                            <option key={year.id} value={year.id}>
                              第{year.fiscal_period}期 ({year.start_date.substring(0, 10)} ~ {year.end_date.substring(0, 10)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* フッター */}
                  <div className="flex-shrink-0 px-4 py-4 flex justify-end border-t border-gray-200">
                    <button
                      type="button"
                      className="mx-4 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={handleClose}
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          保存中...
                        </span>
                      ) : isNew ? '作成' : '更新'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSlidePanel; 