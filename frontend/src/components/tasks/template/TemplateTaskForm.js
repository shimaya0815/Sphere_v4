import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { tasksApi } from '../../../api';
// 共通コンポーネントのインポート
import useTaskFormData from '../common/useTaskFormData';
import { TitleDescriptionFields, AssigneeFields, StatusPriorityFields, CategoryEstimatedHoursFields, FormSubmitButtons } from '../common/FormFieldGroups';
import TemplateSpecificFields from '../common/TemplateSpecificFields';

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
  
  // React Hook Form
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm();

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

  // フォーム送信処理
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
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">親テンプレート情報</h3>
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">テンプレート名:</span> {parentTemplate.template_name || parentTemplate.title}</p>
            {parentTemplate.description && (
              <p><span className="font-medium">説明:</span> {parentTemplate.description}</p>
            )}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          {/* タイトルと説明フィールド */}
          <TitleDescriptionFields register={register} errors={errors} />
          
          {/* テンプレート固有のフィールド（実行順序、カスタムスケジュール） */}
          <TemplateSpecificFields 
            register={register} 
            errors={errors} 
            hasCustomSchedule={hasCustomSchedule}
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
          
          {/* カテゴリーと見積時間フィールド */}
          <CategoryEstimatedHoursFields 
            register={register} 
            errors={errors} 
            categories={categories} 
          />
          
          {/* フォーム送信ボタン */}
          <FormSubmitButtons 
            onCancel={onCancel} 
            isSubmitting={isSubmitting} 
            isEdit={!!templateTaskId} 
          />
        </div>
      </form>
    </div>
  );
};

export default TemplateTaskForm;