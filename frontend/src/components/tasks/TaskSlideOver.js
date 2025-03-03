import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { tasksApi, clientsApi } from '../../api';
import toast from 'react-hot-toast';
import { HiOutlineX } from 'react-icons/hi';

const TaskSlideOver = ({ isOpen, task, onClose, onTaskUpdated }) => {
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [clients, setClients] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isFiscalTask, setIsFiscalTask] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch, getValues } = useForm({
    defaultValues: {
      title: '',
      description: '',
      status: '',
      priority: '',
      category: '',
      due_date: '',
      estimated_hours: '',
      client: '',
      is_fiscal_task: 'false',
      fiscal_year: '',
    }
  });
  
  // Watch selected values for dependent dropdowns
  const watchedClient = watch('client');
  const watchedIsFiscalTask = watch('is_fiscal_task');
  
  useEffect(() => {
    if (isOpen && task) {
      fetchTaskMetadata();
    }
  }, [isOpen, task?.id]); // タスクIDが変更された場合も再取得
  
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
  
  // Populate form when task changes
  useEffect(() => {
    if (task) {
      console.log("Task data received:", task);
      
      // メタデータの読み込みを確保
      fetchTaskMetadata().then(() => {
        // 正規化されたデータ形式に対応
        let statusId = '';
        if (task.status_data) {
          statusId = task.status_data.id;
        } else if (task.status?.id) {
          statusId = task.status.id;
        } else if (typeof task.status === 'number') {
          statusId = task.status;
        }
        
        let priorityId = '';
        if (task.priority_data) {
          priorityId = task.priority_data.id;
        } else if (task.priority?.id) {
          priorityId = task.priority.id;
        } else if (typeof task.priority === 'number') {
          priorityId = task.priority;
        }
        
        let categoryId = '';
        if (task.category_data) {
          categoryId = task.category_data.id;
        } else if (task.category?.id) {
          categoryId = task.category.id;
        } else if (typeof task.category === 'number') {
          categoryId = task.category;
        }
        
        let clientId = '';
        if (task.client_data) {
          clientId = task.client_data.id;
        } else if (task.client?.id) {
          clientId = task.client.id;
        } else if (typeof task.client === 'number') {
          clientId = task.client;
        }
        
        // メタデータのロード後にフォームをリセット
        reset({
          title: task.title || '',
          description: task.description || '',
          category: categoryId,
          status: statusId,
          priority: priorityId,
          due_date: task.due_date ? task.due_date.substring(0, 10) : '',
          estimated_hours: task.estimated_hours || '',
          client: clientId,
          is_fiscal_task: task.is_fiscal_task ? 'true' : 'false', 
          fiscal_year: task.fiscal_year?.id || (typeof task.fiscal_year === 'number' ? task.fiscal_year : ''),
        });
        
        // Update state values
        setIsFiscalTask(task.is_fiscal_task);
        
        // クライアント情報の設定
        if (task.client_data) {
          setSelectedClient(task.client_data);
        } else if (task.client && typeof task.client === 'object') {
          setSelectedClient(task.client);
        } else if (clientId) {
          // clientIdがある場合は、クライアントリストから該当するクライアントを探す
          const clientObj = clients.find(c => c.id === parseInt(clientId));
          if (clientObj) {
            setSelectedClient(clientObj);
          }
        }
        
        console.log("Form reset with values:", {
          title: task.title,
          status: statusId,
          category: categoryId
        });
      });
    }
  }, [task]);
  
  const fetchTaskMetadata = async () => {
    try {
      const [categoriesData, statusesData, prioritiesData, clientsData] = await Promise.all([
        tasksApi.getCategories(),
        tasksApi.getStatuses(),
        tasksApi.getPriorities(),
        clientsApi.getClients({ contract_status: 'active' }), // Get only active clients
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
    } catch (error) {
      console.error('Error fetching task metadata:', error);
      toast.error('タスクのメタデータの取得に失敗しました');
    }
  };
  
  const updateTaskField = async (field, value) => {
    if (!task || !task.id) return;
    
    try {
      // Format value based on field type
      let formattedValue = value;
      
      if (field === 'status' || field === 'priority' || field === 'category' || field === 'fiscal_year') {
        formattedValue = value ? parseInt(value) : null;
      } else if (field === 'due_date') {
        formattedValue = value ? new Date(value).toISOString() : null;
      } else if (field === 'is_fiscal_task') {
        formattedValue = value === 'true';
      } else if (field === 'client') {
        formattedValue = value ? parseInt(value) : null;
      }
      
      // Update single field
      const updateData = { [field]: formattedValue };
      console.log(`Updating ${field} to:`, formattedValue);
      
      // Special case for fiscal_year - only include if is_fiscal_task is true
      if (field === 'fiscal_year' && !getValues('is_fiscal_task')) {
        return; // Don't update fiscal_year if is_fiscal_task is false
      }
      
      // Send update to API
      const result = await tasksApi.updateTask(task.id, updateData);
      
      // Notify success
      toast.success(`${getFieldLabel(field)}を更新しました`, { duration: 2000 });
      
      // すぐに親コンポーネントに通知して状態を更新
      if (onTaskUpdated) {
        // 重要: ここでAPIから返された結果を使用してタスク全体を更新
        onTaskUpdated(result);
      }
      
      // 現在のタスクのローカル状態も更新
      task = { ...task, ...updateData };
      
      // リスト更新のイベント発火をわずかに遅らせて確実に反映
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('task-updated'));
      }, 100);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`${getFieldLabel(field)}の更新に失敗しました`);
      
      // Reset form field to original value
      if (task && task[field] !== undefined) {
        let originalValue = task[field];
        
        // Handle object values like status, priority, etc.
        if (originalValue && typeof originalValue === 'object' && originalValue.id) {
          originalValue = originalValue.id.toString();
        }
        
        setValue(field, originalValue);
      }
    }
  };
  
  // Helper to get human-readable field labels
  const getFieldLabel = (field) => {
    const labels = {
      title: 'タイトル',
      description: '説明',
      status: 'ステータス',
      priority: '優先度',
      category: 'カテゴリー',
      due_date: '期限日',
      estimated_hours: '見積時間',
      client: 'クライアント',
      is_fiscal_task: 'タスク種別',
      fiscal_year: '決算期'
    };
    return labels[field] || field;
  };
  
  // Handle field change events
  const handleFieldChange = (field) => {
    const currentValue = getValues(field);
    updateTaskField(field, currentValue);
  };
  
  // JSXはシンプルに書き直し
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 overflow-hidden">
        {/* オーバーレイ背景 */}
        <div 
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        {/* スライド表示部分 */}
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="relative w-screen max-w-md transform transition-transform duration-300 ease-in-out translate-x-0">
            {/* 閉じるボタン */}
            <div className="absolute top-0 left-0 -ml-8 pt-4 pr-2 flex sm:-ml-10 sm:pr-4">
              <button
                type="button"
                className="rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                onClick={onClose}
              >
                <span className="sr-only">閉じる</span>
                <HiOutlineX className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            
            {/* タスク詳細表示部分 */}
            {task ? (
              <div className="h-full flex flex-col py-6 bg-white shadow-xl overflow-y-auto">
                <div className="px-4 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    タスク詳細
                  </h2>
                </div>
                
                <div className="mt-6 relative flex-1 px-4 sm:px-6">
                  <div className="space-y-6">
                    {/* タイトル */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        タイトル
                      </label>
                      <input
                        type="text"
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        {...register('title')}
                        onBlur={() => handleFieldChange('title')}
                      />
                    </div>
                    
                    {/* 説明 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        説明
                      </label>
                      <textarea
                        rows="4"
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        {...register('description')}
                        onBlur={() => handleFieldChange('description')}
                      />
                    </div>
                    
                    {/* ステータスと優先度 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ステータス
                        </label>
                        <select
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          {...register('status')}
                          onChange={() => handleFieldChange('status')}
                        >
                          <option value="">選択してください</option>
                          {statuses.map(status => (
                            <option key={status.id} value={status.id}>{status.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          優先度
                        </label>
                        <select
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          {...register('priority')}
                          onChange={() => handleFieldChange('priority')}
                        >
                          <option value="">選択してください</option>
                          {priorities.map(priority => (
                            <option key={priority.id} value={priority.id}>{priority.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* カテゴリーと期限日 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          カテゴリー
                        </label>
                        <select
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          {...register('category')}
                          onChange={() => handleFieldChange('category')}
                        >
                          <option value="">選択してください</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          期限日
                        </label>
                        <input
                          type="date"
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          {...register('due_date')}
                          onBlur={() => handleFieldChange('due_date')}
                        />
                      </div>
                    </div>
                    
                    {/* 見積時間 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        見積時間 (時間)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        {...register('estimated_hours')}
                        onBlur={() => handleFieldChange('estimated_hours')}
                      />
                    </div>
                    
                    {/* クライアント */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        クライアント
                      </label>
                      <select
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        {...register('client')}
                        onChange={() => handleFieldChange('client')}
                      >
                        <option value="">選択してください</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* タスク種別 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        タスク種別
                      </label>
                      <select
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        {...register('is_fiscal_task')}
                        onChange={() => handleFieldChange('is_fiscal_task')}
                        disabled={!watchedClient}
                      >
                        <option value="false">通常タスク</option>
                        <option value="true">決算期関連タスク</option>
                      </select>
                    </div>
                    
                    {/* 決算期 */}
                    {isFiscalTask && watchedClient && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          決算期
                        </label>
                        <select
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          {...register('fiscal_year')}
                          onChange={() => handleFieldChange('fiscal_year')}
                        >
                          <option value="">選択してください</option>
                          {fiscalYears.map(fiscalYear => (
                            <option key={fiscalYear.id} value={fiscalYear.id}>
                              第{fiscalYear.fiscal_period}期 ({new Date(fiscalYear.start_date).toLocaleDateString()} 〜 {new Date(fiscalYear.end_date).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                        {fiscalYears.length === 0 && (
                          <p className="mt-1 text-xs text-amber-600">
                            選択したクライアントに決算期情報が登録されていません。
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* クライアント情報表示 */}
                    {selectedClient && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
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
                    
                    {/* タスク作成・更新日時 */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>作成日: {task.created_at ? new Date(task.created_at).toLocaleString() : '-'}</span>
                        <span>更新日: {task.updated_at ? new Date(task.updated_at).toLocaleString() : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-6 bg-white">
                <p>タスクが選択されていません</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSlideOver;