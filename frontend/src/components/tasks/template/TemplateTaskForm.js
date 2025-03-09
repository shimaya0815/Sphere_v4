import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { tasksApi } from '../../../api';
// 共通コンポーネントのインポート
import useTaskFormData from '../common/useTaskFormData';
import { FormSubmitButtons } from '../common/FormFieldGroups';

/**
 * テンプレートタスク作成/編集フォーム
 */
const TemplateTaskForm = ({ parentTemplateId, templateTaskId = null, onSuccess, onCancel }) => {
  // データ取得カスタムフックを使用（クライアント情報は不要）
  const {
    categories,
    statuses,
    priorities,
    workers,
    reviewers,
    isLoadingUsers
  } = useTaskFormData({ fetchClients: false });

  // 追加の状態管理
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCustomSchedule, setHasCustomSchedule] = useState(false);
  const [parentTemplate, setParentTemplate] = useState(null);
  
  // 共通スタイル
  const inputClassName = "shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-2 border-gray-300 rounded-md hover:border-gray-400";
  const selectClassName = "shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-2 border-gray-300 rounded-md hover:border-gray-400";
  
  // React Hook Form
  const { control, handleSubmit, formState, setValue, reset, watch, getValues } = useForm({
    defaultValues: {
      title: '',
      description: '',
      status: '',
      priority: '',
      category: '',
      estimated_hours: '',
      has_custom_schedule: 'false',
      order: '1',
      worker: '',
      reviewer: '',
      schedule_type: 'custom',
      recurrence: 'monthly',
      creation_date_offset: '0',
      deadline_date_offset: '5',
      reference_date_type: 'execution_date'
    }
  });
  
  // 個別フィールドの変更ハンドラー
  const handleFieldChange = (name, value) => {
    // フォーム値更新
    setValue(name, value, {
      shouldDirty: true,
      shouldValidate: true
    });
  };

  // 監視対象のフィールド
  const watchedHasCustomSchedule = watch('has_custom_schedule');

  // カスタムスケジュール状態を更新
  useEffect(() => {
    setHasCustomSchedule(watchedHasCustomSchedule === 'true');
  }, [watchedHasCustomSchedule]);

  // 親テンプレート情報を取得
  useEffect(() => {
    const fetchParentTemplate = async () => {
      if (parentTemplateId) {
        try {
          const data = await tasksApi.getTemplate(parentTemplateId);
          setParentTemplate(data);
        } catch (error) {
          console.error('Error fetching parent template:', error);
          toast.error('親テンプレートの取得に失敗しました');
        }
      }
    };

    fetchParentTemplate();
  }, [parentTemplateId]);

  // 編集モードの場合、初期データをセット
  useEffect(() => {
    if (templateTaskId) {
      const fetchExistingTask = async () => {
        try {
          const task = await tasksApi.getTemplateTask(templateTaskId);
          
          // IDを文字列に変換する関数
          const getIdAsString = (field) => {
            if (!field) return '';
            if (typeof field === 'object' && field.id) return field.id.toString();
            return field.toString();
          };
          
          // Set form values from existing task
          reset({
            title: task.title || '',
            description: task.description || '',
            category: getIdAsString(task.category?.id || task.category),
            status: getIdAsString(task.status?.id || task.status),
            priority: getIdAsString(task.priority?.id || task.priority),
            estimated_hours: task.estimated_hours || '',
            has_custom_schedule: task.has_custom_schedule ? 'true' : 'false',
            order: task.order?.toString() || '1',
            worker: getIdAsString(task.worker?.id || task.worker),
            reviewer: getIdAsString(task.reviewer?.id || task.reviewer),
            schedule_type: task.schedule?.schedule_type || 'custom',
            recurrence: task.schedule?.recurrence || 'monthly',
            creation_date_offset: (task.schedule?.creation_date_offset || 0).toString(),
            deadline_date_offset: (task.schedule?.deadline_date_offset || 5).toString(),
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

  // フォーム送信処理
  const submitTask = async (data) => {
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
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">親テンプレート情報</h3>
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">テンプレート名:</span> {parentTemplate.template_name || parentTemplate.title}</p>
            {parentTemplate.description && (
              <p><span className="font-medium">説明:</span> {parentTemplate.description}</p>
            )}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit(submitTask)}>
        <div className="space-y-4">
          {/* ステータスと優先度フィールド - 最初に表示 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ステータス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">
                ステータス
              </label>
              <div className="mt-1">
                <Controller
                  name="status"
                  control={control}
                  rules={{ required: 'ステータスは必須です' }}
                  render={({ field, fieldState }) => (
                    <div>
                      <select
                        id="status"
                        className={`${selectClassName} ${
                          fieldState.error ? 'border-red-300 ring-1 ring-red-300' : ''
                        }`}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange('status', e.target.value);
                        }}
                      >
                        <option value="">ステータスを選択</option>
                        {statuses.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.name}
                          </option>
                        ))}
                      </select>
                      {fieldState.error && (
                        <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

            {/* 優先度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="priority">
                優先度
              </label>
              <div className="mt-1">
                <Controller
                  name="priority"
                  control={control}
                  rules={{ required: '優先度は必須です' }}
                  render={({ field, fieldState }) => (
                    <div>
                      <select
                        id="priority"
                        className={`${selectClassName} ${
                          fieldState.error ? 'border-red-300 ring-1 ring-red-300' : ''
                        }`}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange('priority', e.target.value);
                        }}
                      >
                        <option value="">優先度を選択</option>
                        {priorities.map((priority) => (
                          <option key={priority.id} value={priority.id}>
                            {priority.priority_value || '未設定'}
                          </option>
                        ))}
                      </select>
                      {fieldState.error && (
                        <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
          
          {/* タイトルフィールド - ステータスの後に表示 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
              タイトル
            </label>
            <Controller
              name="title"
              control={control}
              rules={{ required: 'タイトルは必須です' }}
              render={({ field, fieldState }) => (
                <div>
                  <input
                    type="text"
                    id="title"
                    className={`${inputClassName} ${
                      fieldState.error ? 'border-red-300 ring-1 ring-red-300' : ''
                    }`}
                    placeholder="タスクのタイトルを入力"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('title', e.target.value);
                    }}
                  />
                  {fieldState.error && (
                    <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
          </div>
          
          {/* カテゴリーフィールド - タイトルの後に表示 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="category">
                カテゴリー
              </label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <select
                    id="category"
                    className={selectClassName}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('category', e.target.value);
                    }}
                  >
                    <option value="">カテゴリーを選択</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>
          
          {/* 担当者とレビュアーフィールド - クライアント・決算期の代わりに */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 担当者 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="worker">
                担当者
              </label>
              <Controller
                name="worker"
                control={control}
                render={({ field }) => (
                  <select
                    id="worker"
                    className={selectClassName}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('worker', e.target.value);
                    }}
                    disabled={isLoadingUsers}
                  >
                    <option value="">担当者を選択</option>
                    {workers.map(worker => (
                      <option key={worker.id} value={worker.id}>
                        {worker.first_name || ''} {worker.last_name || ''} {(!worker.first_name && !worker.last_name) ? worker.username || worker.email || `User ${worker.id}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* レビュアー */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reviewer">
                レビュアー
              </label>
              <Controller
                name="reviewer"
                control={control}
                render={({ field }) => (
                  <select
                    id="reviewer"
                    className={selectClassName}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('reviewer', e.target.value);
                    }}
                    disabled={isLoadingUsers}
                  >
                    <option value="">レビュアーを選択</option>
                    {reviewers.map(reviewer => (
                      <option key={reviewer.id} value={reviewer.id}>
                        {reviewer.first_name || ''} {reviewer.last_name || ''} {(!reviewer.first_name && !reviewer.last_name) ? reviewer.username || reviewer.email || `User ${reviewer.id}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>
          
          {/* テンプレート固有のフィールド（実行順序、カスタムスケジュール） - 期限日部分に相当 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 実行順序 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="order">
                実行順序
              </label>
              <Controller
                name="order"
                control={control}
                render={({ field, fieldState }) => (
                  <div>
                    <input
                      type="number"
                      id="order"
                      className={`${inputClassName} ${
                        fieldState.error ? 'border-red-300 ring-1 ring-red-300' : ''
                      }`}
                      placeholder="1"
                      min="1"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('order', e.target.value);
                      }}
                    />
                    <p className="mt-1 text-xs text-gray-500">複数タスクがある場合の実行順序</p>
                    {fieldState.error && (
                      <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* スケジュール設定 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="has_custom_schedule">
                スケジュール設定
              </label>
              <Controller
                name="has_custom_schedule"
                control={control}
                render={({ field }) => (
                  <select
                    id="has_custom_schedule"
                    className={selectClassName}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('has_custom_schedule', e.target.value);
                    }}
                  >
                    <option value="false">親テンプレートの設定を使用</option>
                    <option value="true">カスタムスケジュールを設定</option>
                  </select>
                )}
              />
            </div>
          </div>

          {/* カスタムスケジュール設定フィールド */}
          {hasCustomSchedule && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">スケジュール設定</label>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-2">カスタムスケジュール詳細</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reference_date_type">
                      基準日タイプ
                    </label>
                    <Controller
                      name="reference_date_type"
                      control={control}
                      rules={{ required: hasCustomSchedule ? '基準日タイプは必須です' : false }}
                      render={({ field, fieldState }) => (
                        <div>
                          <select
                            id="reference_date_type"
                            className={`${selectClassName} ${
                              fieldState.error ? 'border-red-300 ring-1 ring-red-300' : ''
                            }`}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange('reference_date_type', e.target.value);
                            }}
                          >
                            <option value="parent_creation">親タスク作成日</option>
                            <option value="execution_date">実行日（バッチ処理実行日）</option>
                            <option value="fiscal_start">決算期開始日</option>
                            <option value="fiscal_end">決算期終了日</option>
                            <option value="month_start">当月初日</option>
                            <option value="month_end">当月末日</option>
                          </select>
                          {fieldState.error && (
                            <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="recurrence">
                      繰り返し
                    </label>
                    <Controller
                      name="recurrence"
                      control={control}
                      rules={{ required: hasCustomSchedule ? '繰り返しタイプは必須です' : false }}
                      render={({ field, fieldState }) => (
                        <div>
                          <select
                            id="recurrence"
                            className={`${selectClassName} ${
                              fieldState.error ? 'border-red-300 ring-1 ring-red-300' : ''
                            }`}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange('recurrence', e.target.value);
                            }}
                          >
                            <option value="with_parent">親テンプレートと同時</option>
                            <option value="monthly">毎月</option>
                            <option value="quarterly">四半期ごと</option>
                            <option value="yearly">毎年</option>
                            <option value="once">一度のみ</option>
                          </select>
                          {fieldState.error && (
                            <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="creation_date_offset">
                      作成日オフセット（日数）
                    </label>
                    <Controller
                      name="creation_date_offset"
                      control={control}
                      rules={{ required: hasCustomSchedule ? '作成日オフセットは必須です' : false }}
                      render={({ field, fieldState }) => (
                        <div>
                          <input
                            type="number"
                            id="creation_date_offset"
                            className={`${inputClassName} ${
                              fieldState.error ? 'border-red-300 ring-1 ring-red-300' : ''
                            }`}
                            placeholder="基準日からの日数"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange('creation_date_offset', e.target.value);
                            }}
                          />
                          <p className="mt-1 text-xs text-gray-500">基準日から何日後に作成するか（0=当日）</p>
                          {fieldState.error && (
                            <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="deadline_date_offset">
                      期限日オフセット（日数）
                    </label>
                    <Controller
                      name="deadline_date_offset"
                      control={control}
                      rules={{ required: hasCustomSchedule ? '期限日オフセットは必須です' : false }}
                      render={({ field, fieldState }) => (
                        <div>
                          <input
                            type="number"
                            id="deadline_date_offset"
                            className={`${inputClassName} ${
                              fieldState.error ? 'border-red-300 ring-1 ring-red-300' : ''
                            }`}
                            placeholder="作成日からの日数"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange('deadline_date_offset', e.target.value);
                            }}
                          />
                          <p className="mt-1 text-xs text-gray-500">作成日から何日後を期限とするか</p>
                          {fieldState.error && (
                            <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 説明フィールド - TaskEditorと同じ位置に */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
              説明
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <textarea
                  id="description"
                  rows="4"
                  className={inputClassName}
                  placeholder="タスクの詳細を入力"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    handleFieldChange('description', e.target.value);
                  }}
                />
              )}
            />
          </div>
          
          {/* 見積時間フィールド - 作業時間記録の一部として */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="estimated_hours">
              見積時間 (時間)
            </label>
            <Controller
              name="estimated_hours"
              control={control}
              rules={{
                validate: value => !value || Number(value) >= 0 || '正の数を入力してください'
              }}
              render={({ field, fieldState }) => (
                <div>
                  <input
                    type="number"
                    id="estimated_hours"
                    step="0.5"
                    min="0"
                    className={`${inputClassName} ${
                      fieldState.error ? 'border-red-300 ring-1 ring-red-300' : ''
                    }`}
                    placeholder="2.5"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('estimated_hours', e.target.value);
                    }}
                  />
                  {fieldState.error && (
                    <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
          </div>
          
          {/* フォーム送信ボタン */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="bg-primary-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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