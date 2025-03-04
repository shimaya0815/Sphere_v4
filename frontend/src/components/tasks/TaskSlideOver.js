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
      
      // 詳細な現在のタスク情報をログ出力（デバッグ用）
      console.log('Current task in SlideOver:', JSON.stringify(task));
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
      console.log("Task data received in form population:", task);
      
      // メタデータの読み込みを確保
      fetchTaskMetadata().then(() => {
        // 正規化されたデータ形式に対応
        let statusId = '';
        if (task.status_data) {
          statusId = task.status_data.id;
          console.log('Using status_data.id:', statusId);
        } else if (task.status?.id) {
          statusId = task.status.id;
          console.log('Using status.id:', statusId);
        } else if (typeof task.status === 'number' || !isNaN(Number(task.status))) {
          statusId = task.status;
          console.log('Using status as number:', statusId);
        }
        
        let priorityId = '';
        if (task.priority_data) {
          priorityId = task.priority_data.id;
          console.log('Using priority_data.id:', priorityId);
        } else if (task.priority?.id) {
          priorityId = task.priority.id;
          console.log('Using priority.id:', priorityId);
        } else if (typeof task.priority === 'number' || !isNaN(Number(task.priority))) {
          priorityId = task.priority;
          console.log('Using priority as number:', priorityId);
        }
        
        let categoryId = '';
        if (task.category_data) {
          categoryId = task.category_data.id;
          console.log('Using category_data.id:', categoryId);
        } else if (task.category?.id) {
          categoryId = task.category.id;
          console.log('Using category.id:', categoryId);
        } else if (typeof task.category === 'number' || !isNaN(Number(task.category))) {
          categoryId = task.category;
          console.log('Using category as number:', categoryId);
        }
        
        let clientId = '';
        if (task.client_data) {
          clientId = task.client_data.id;
          console.log('Using client_data.id:', clientId);
        } else if (task.client?.id) {
          clientId = task.client.id;
          console.log('Using client.id:', clientId);
        } else if (typeof task.client === 'number' || !isNaN(Number(task.client))) {
          clientId = task.client;
          console.log('Using client as number:', clientId);
        }
        
        // 文字列に変換してフォームに設定
        const formValues = {
          title: task.title || '',
          description: task.description || '',
          category: categoryId ? categoryId.toString() : '',
          status: statusId ? statusId.toString() : '',
          priority: priorityId ? priorityId.toString() : '',
          due_date: task.due_date ? task.due_date.substring(0, 10) : '',
          estimated_hours: task.estimated_hours || '',
          client: clientId ? clientId.toString() : '',
          is_fiscal_task: task.is_fiscal_task ? 'true' : 'false',
          fiscal_year: task.fiscal_year?.id || (typeof task.fiscal_year === 'number' ? task.fiscal_year.toString() : ''),
        };
        
        console.log("Form values to be set:", formValues);
        
        // メタデータのロード後にフォームをリセット
        reset(formValues);
        
        // 選択済み値の詳細ログ
        console.log("Current form values after reset:", getValues());
        
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
  
  /**
   * タスクフィールドの更新処理
   * バックエンドとの連携で最も重要な部分を簡略化
   */
  const updateTaskField = async (field, value) => {
    if (!task || !task.id) {
      console.error('Task is not loaded or has no ID');
      return;
    }
    
    // 元の値を保持（ロールバック用）
    const originalValue = getValues(field);
    console.log(`Updating field ${field} from "${originalValue}" to "${value}"`);
    
    try {
      // フォームの変更をロック（連続更新防止）
      setIsSubmitting(true);
      
      // 1. 送信データの準備 (シンプルなデータ変換)
      let formattedValue;
      
      // 数値変換フィールド
      if (['status', 'priority', 'category', 'fiscal_year', 'client'].includes(field)) {
        formattedValue = value && value !== '' ? parseInt(value, 10) : null;
        console.log(`Converting ${field} value '${value}' to ${formattedValue} (${typeof formattedValue})`);
      } 
      // 日付変換フィールド
      else if (field === 'due_date') {
        formattedValue = value ? value : null; // ISO文字列はバックエンドで処理
      } 
      // 真偽値変換フィールド
      else if (field === 'is_fiscal_task') {
        formattedValue = value === 'true' || value === true;
      }
      // その他のフィールドはそのまま
      else {
        formattedValue = value;
      }
      
      // 特別なケース: 決算期タスクフラグが立っていない場合は決算期も更新しない
      if (field === 'fiscal_year' && getValues('is_fiscal_task') !== 'true') {
        console.log('Skipping fiscal_year update - not a fiscal task');
        setIsSubmitting(false);
        return;
      }
      
      // 2. APIリクエストを実行
      console.log(`Updating task ${task.id} - field: ${field}, value:`, formattedValue);
      
      // シンプルな更新データ構造
      const updateData = { [field]: formattedValue };
      
      // 更新APIを呼び出し
      const updatedTask = await tasksApi.updateTask(task.id, updateData);
      
      if (!updatedTask || !updatedTask.id) {
        throw new Error('Invalid response from server');
      }
      
      // 3. 更新成功の通知
      toast.success(`${getFieldLabel(field)}を更新しました`);
      
      // 4. 更新後の検証とフォーム状態の更新
      console.log('Task updated successfully:', updatedTask);
      
      // 特に重要なフィールドについては、明示的に結果をログ出力
      if (field === 'status') {
        console.log(`Status update result - Raw value: ${updatedTask.status}, ` +
                   `Data object: ${JSON.stringify(updatedTask.status_data)}`);
      }
      
      // フォームの値を明示的に更新 (応答に基づく)
      let newFormValue = null;
      
      // API応答に_dataフィールドが含まれている場合は使用する
      if (field === 'status') {
        if (updatedTask.status_data) {
          newFormValue = String(updatedTask.status_data.id);
        } else if (updatedTask.status) {
          newFormValue = typeof updatedTask.status === 'object' ? 
                        String(updatedTask.status.id) : 
                        String(updatedTask.status);
        }
        console.log(`Setting status form value to: ${newFormValue}`);
      }
      else if (field === 'priority') {
        if (updatedTask.priority_data) {
          newFormValue = String(updatedTask.priority_data.id);
        } else if (updatedTask.priority) {
          newFormValue = typeof updatedTask.priority === 'object' ? 
                        String(updatedTask.priority.id) : 
                        String(updatedTask.priority);
        }
      }
      else if (field === 'category') {
        if (updatedTask.category_data) {
          newFormValue = String(updatedTask.category_data.id);
        } else if (updatedTask.category) {
          newFormValue = typeof updatedTask.category === 'object' ? 
                       String(updatedTask.category.id) : 
                       String(updatedTask.category);
        }
      }
      else if (field === 'client') {
        if (updatedTask.client_data) {
          newFormValue = String(updatedTask.client_data.id);
          // 選択されたクライアント情報を更新
          setSelectedClient(updatedTask.client_data);
        } else if (updatedTask.client) {
          newFormValue = typeof updatedTask.client === 'object' ? 
                      String(updatedTask.client.id) : 
                      String(updatedTask.client);
          
          // クライアントIDに基づいてクライアント情報を更新
          const clientId = typeof updatedTask.client === 'object' ? 
                         updatedTask.client.id : 
                         updatedTask.client;
          
          const selectedClientData = clients.find(c => c.id === parseInt(clientId));
          if (selectedClientData) {
            setSelectedClient(selectedClientData);
          }
        } else {
          // クライアントが選択されていない場合
          setSelectedClient(null);
        }
      }
      else if (field === 'is_fiscal_task') {
        newFormValue = updatedTask.is_fiscal_task ? 'true' : 'false';
        
        // タスク種別の状態を明示的に更新
        setIsFiscalTask(updatedTask.is_fiscal_task);
        
        console.log(`Updated is_fiscal_task to: ${updatedTask.is_fiscal_task} (${newFormValue})`);
      }
      else if (field === 'fiscal_year') {
        if (updatedTask.fiscal_year_data) {
          newFormValue = String(updatedTask.fiscal_year_data.id);
        } else if (updatedTask.fiscal_year) {
          newFormValue = typeof updatedTask.fiscal_year === 'object' ? 
                       String(updatedTask.fiscal_year.id) : 
                       String(updatedTask.fiscal_year);
        }
      }
      
      // フォーム値を更新
      if (newFormValue !== null) {
        console.log(`Explicitly setting form value for ${field} to: ${newFormValue}`);
        setValue(field, newFormValue);
        
        // 値が設定されたことを確認
        setTimeout(() => {
          const currentValue = getValues(field);
          console.log(`Current form value after setting: ${field} = ${currentValue}`);
          
          // 値が正しく設定されていない場合は再度設定を試みる
          if (currentValue !== newFormValue) {
            console.warn(`Form value not set correctly. Trying again...`);
            setValue(field, newFormValue, { shouldValidate: true });
          }
        }, 10);
      } else {
        console.warn(`No valid form value found for ${field} in API response`);
      }
      
      // 親コンポーネントに完全な更新済みタスクを通知する前に、ログ出力
      console.log("Updated task for parent:", updatedTask);
      
      // 5. 親コンポーネントへの通知
      if (onTaskUpdated && typeof onTaskUpdated === 'function') {
        onTaskUpdated(updatedTask);
      }
      
      // 6. UI更新イベント発火
      window.dispatchEvent(new CustomEvent('task-updated'));
    } 
    catch (error) {
      // エラー処理
      console.error('Failed to update task:', error);
      toast.error(`${getFieldLabel(field)}の更新に失敗しました: ${error.message || '不明なエラー'}`);
      
      // エラー時はフォーム値を元に戻す
      if (originalValue) {
        console.log(`Resetting ${field} to original value: ${originalValue}`);
        setValue(field, originalValue);
      }
    } 
    finally {
      // 処理完了後はフォームの変更をアンロック
      setIsSubmitting(false);
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
  
  // フィールド変更イベント処理を単純化
  const handleFieldChange = (field) => {
    // ログ出力のみを行い、実際の更新は一定時間後に実行する
    console.log(`Field ${field} changed to: ${getValues(field)}`);
    
    // デバウンス処理で複数の変更を一度にまとめる
    const currentValue = getValues(field);
    
    // 500ms待機して、ユーザーが入力を完了するのを待つ
    setTimeout(() => {
      const latestValue = getValues(field);
      // 値が変更されていない場合のみ更新を実行
      if (latestValue === currentValue) {
        updateTaskField(field, latestValue);
      }
    }, 500);
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
                        disabled={isSubmitting}
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
                          onChange={(e) => {
                            console.log("Status selected:", e.target.value);
                            
                            // フォームの値を明示的に設定
                            setValue('status', e.target.value);
                            
                            // 変更をAPI経由で保存
                            if (e.target.value) {
                              // すぐに更新せず、UIの状態を安定させるために少し遅延
                              setTimeout(() => {
                                updateTaskField('status', e.target.value);
                              }, 100);
                            }
                          }}
                          disabled={isSubmitting}
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
                          onChange={(e) => {
                            console.log("Priority selected:", e.target.value);
                            
                            // フォームの値を明示的に設定
                            setValue('priority', e.target.value);
                            
                            // 変更をAPI経由で保存
                            if (e.target.value) {
                              setTimeout(() => {
                                updateTaskField('priority', e.target.value);
                              }, 100);
                            }
                          }}
                          disabled={isSubmitting}
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
                          onChange={(e) => {
                            console.log("Category selected:", e.target.value);
                            
                            // フォームの値を明示的に設定
                            setValue('category', e.target.value);
                            
                            // 変更をAPI経由で保存
                            if (e.target.value) {
                              setTimeout(() => {
                                updateTaskField('category', e.target.value);
                              }, 100);
                            }
                          }}
                          disabled={isSubmitting}
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
                        onChange={(e) => {
                          console.log("Client selected:", e.target.value);
                          
                          // フォームの値を明示的に設定
                          setValue('client', e.target.value);
                          
                          // 変更をAPI経由で保存
                          if (e.target.value) {
                            setTimeout(() => {
                              updateTaskField('client', e.target.value);
                            }, 100);
                          }
                        }}
                        disabled={isSubmitting}
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
                        onChange={(e) => {
                          console.log("Task type selected:", e.target.value);
                          
                          // フォームの値を明示的に設定
                          setValue('is_fiscal_task', e.target.value);
                          
                          // 状態も明示的に更新
                          setIsFiscalTask(e.target.value === 'true');
                          
                          // 変更をAPI経由で保存
                          setTimeout(() => {
                            updateTaskField('is_fiscal_task', e.target.value);
                          }, 100);
                        }}
                        disabled={isSubmitting || !watchedClient}
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
                          onChange={(e) => {
                            console.log("Fiscal year selected:", e.target.value);
                            
                            // フォームの値を明示的に設定
                            setValue('fiscal_year', e.target.value);
                            
                            // 変更をAPI経由で保存
                            if (e.target.value) {
                              setTimeout(() => {
                                updateTaskField('fiscal_year', e.target.value);
                              }, 100);
                            }
                          }}
                          disabled={isSubmitting}
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
                    
                    {/* タスクフィールド一覧 */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h3 className="text-md font-medium text-gray-700 mb-2">タスク情報一覧</h3>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-auto max-h-96">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="text-left py-2 px-3">フィールド</th>
                              <th className="text-left py-2 px-3">値</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">タイトル</td>
                              <td className="py-2 px-3">{task.title || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">説明</td>
                              <td className="py-2 px-3">{task.description || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">ステータス</td>
                              <td className="py-2 px-3">{task.status_data?.name || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">優先度</td>
                              <td className="py-2 px-3">{task.priority_data?.name || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">カテゴリ</td>
                              <td className="py-2 px-3">{task.category_data?.name || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">担当者</td>
                              <td className="py-2 px-3">{task.assignee_name || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">承認者</td>
                              <td className="py-2 px-3">{task.approver_name || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">期限日</td>
                              <td className="py-2 px-3">{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">開始日</td>
                              <td className="py-2 px-3">{task.start_date ? new Date(task.start_date).toLocaleDateString() : '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">完了日</td>
                              <td className="py-2 px-3">{task.completed_at ? new Date(task.completed_at).toLocaleDateString() : '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">見積時間</td>
                              <td className="py-2 px-3">{task.estimated_hours || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">クライアント</td>
                              <td className="py-2 px-3">{task.client_data?.name || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">決算期関連</td>
                              <td className="py-2 px-3">{task.is_fiscal_task ? '✅' : '❌'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">決算期</td>
                              <td className="py-2 px-3">{task.fiscal_year_data ? `第${task.fiscal_year_data.fiscal_period}期` : '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">繰り返しタスク</td>
                              <td className="py-2 px-3">{task.is_recurring ? '✅' : '❌'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">繰り返しパターン</td>
                              <td className="py-2 px-3">{task.recurrence_pattern || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">繰り返し終了日</td>
                              <td className="py-2 px-3">{task.recurrence_end_date ? new Date(task.recurrence_end_date).toLocaleDateString() : '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">テンプレート</td>
                              <td className="py-2 px-3">{task.is_template ? '✅' : '❌'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">テンプレート名</td>
                              <td className="py-2 px-3">{task.template_name || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">作成者</td>
                              <td className="py-2 px-3">{task.creator_name || '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">作成日</td>
                              <td className="py-2 px-3">{task.created_at ? new Date(task.created_at).toLocaleString() : '-'}</td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 px-3 font-medium">更新日</td>
                              <td className="py-2 px-3">{task.updated_at ? new Date(task.updated_at).toLocaleString() : '-'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
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