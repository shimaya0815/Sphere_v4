import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { tasksApi, clientsApi } from '../../api';
// 共通コンポーネントのインポート
import useTaskFormData from './common/useTaskFormData';
import { TitleDescriptionFields, AssigneeFields, StatusPriorityFields, CategoryEstimatedHoursFields, FormSubmitButtons } from './common/FormFieldGroups';
import ClientFiscalFields from './common/ClientFiscalFields';
import DueDateField from './common/DueDateField';

/**
 * 標準タスク作成/編集フォーム
 */
const TaskForm = ({ task, onClose, onTaskSaved }) => {
  // データ取得カスタムフックを使用
  const {
    categories,
    statuses,
    priorities,
    clients,
    workers,
    reviewers,
    isLoadingUsers
  } = useTaskFormData();

  // 追加の状態管理
  const [fiscalYears, setFiscalYears] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFiscalTask, setIsFiscalTask] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  
  // React Hook Form
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();

  // 監視対象のフィールド
  const watchedClient = watch('client');
  const watchedIsFiscalTask = watch('is_fiscal_task');

  // クライアントが変更された時、決算期を取得
  useEffect(() => {
    const fetchFiscalYears = async () => {
      if (watchedClient) {
        try {
          const fiscalYearsData = await clientsApi.getFiscalYears(watchedClient);
          setFiscalYears(fiscalYearsData);
          
          // クライアント情報を設定
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

  // 決算期タスク状態を更新
  useEffect(() => {
    setIsFiscalTask(watchedIsFiscalTask === 'true');
  }, [watchedIsFiscalTask]);

  // 編集モードの場合、初期データをセット
  useEffect(() => {
    if (task) {
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
      
      setIsFiscalTask(task.is_fiscal_task);
      if (task.client) {
        setSelectedClient(task.client);
      }
    }
  }, [task, reset]);

  // フォーム送信処理
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // データの整形
      const formattedData = {
        ...data,
        // ID文字列を数値に変換
        status: data.status ? parseInt(data.status) : null,
        priority: data.priority ? parseInt(data.priority) : null,
        category: data.category ? parseInt(data.category) : null,
        client: data.client ? parseInt(data.client) : null,
        worker: data.worker ? parseInt(data.worker) : null,
        reviewer: data.reviewer ? parseInt(data.reviewer) : null,
        // 日付のフォーマット
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        // チェックボックス値の変換
        is_fiscal_task: data.is_fiscal_task === 'true',
        // 決算期タスクの場合のみ決算期を含める
        fiscal_year: data.is_fiscal_task === 'true' && data.fiscal_year ? parseInt(data.fiscal_year) : null,
      };
      
      console.log('タスク送信データ:', formattedData);
      
      let result;
      if (task) {
        // 既存タスクの更新
        result = await tasksApi.updateTask(task.id, formattedData);
        toast.success('タスクが更新されました');
      } else {
        // 新規タスクの作成
        result = await tasksApi.createTask(formattedData);
        toast.success('タスクが作成されました');
      }
      
      console.log('サーバーレスポンス:', result);
      onTaskSaved(result);
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      // エラーメッセージの詳細化
      let errorMessage = 'タスクの保存中にエラーが発生しました';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          // フィールド別エラーのフォーマット
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
          {/* タイトルと説明フィールド */}
          <TitleDescriptionFields register={register} errors={errors} />
          
          {/* クライアントと決算期フィールド */}
          <ClientFiscalFields 
            register={register} 
            errors={errors} 
            clients={clients} 
            fiscalYears={fiscalYears}
            watchedClient={watchedClient}
            isFiscalTask={isFiscalTask}
            selectedClient={selectedClient}
          />
          
          {/* 担当者とレビュアーフィールド */}
          <AssigneeFields 
            register={register} 
            errors={errors} 
            workers={workers} 
            reviewers={reviewers}
            isLoadingUsers={isLoadingUsers} 
          />
          
          {/* ステータスと優先度フィールド */}
          <StatusPriorityFields 
            register={register} 
            errors={errors} 
            statuses={statuses} 
            priorities={priorities} 
          />
          
          {/* カテゴリーと期限日フィールド */}
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
            
            {/* 期限日フィールド */}
            <DueDateField register={register} errors={errors} />
          </div>
          
          {/* 見積時間フィールド */}
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
          
          {/* フォーム送信ボタン */}
          <FormSubmitButtons 
            onCancel={onClose} 
            isSubmitting={isSubmitting} 
            isEdit={!!task} 
          />
        </div>
      </form>
    </div>
  );
};

export default TaskForm;