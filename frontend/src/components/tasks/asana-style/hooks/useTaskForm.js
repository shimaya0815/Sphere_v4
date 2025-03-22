import React, { createContext, useContext, useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import toast from 'react-hot-toast';
import { tasksApi } from '../../../../api';

// フォームコンテキストの作成
const TaskFormContext = createContext({});

/**
 * タスクフォームコンテキストを使用するフック
 * @returns {object} フォームコンテキスト
 */
export const useTaskFormContext = () => {
  const context = useContext(TaskFormContext);
  if (!context) {
    throw new Error('useTaskFormContext must be used within a TaskFormProvider');
  }
  return context;
};

/**
 * タスクフォームプロバイダー
 * @param {object} props プロパティ
 * @param {object} props.initialValues 初期値
 * @param {function} props.onSubmit 送信時コールバック
 * @param {boolean} props.autoSave 自動保存有効フラグ
 * @param {number} props.autoSaveDelay 自動保存の遅延時間(ms)
 * @param {React.ReactNode} props.children 子要素
 */
export const TaskFormProvider = forwardRef(({
  initialValues = {},
  onSubmit,
  autoSave = false,
  autoSaveDelay = 2000,
  children
}, ref) => {
  // react-hook-formの設定
  const methods = useForm({
    defaultValues: initialValues,
    mode: 'onChange'
  });
  
  const { handleSubmit, watch, formState, reset, getValues } = methods;
  const { isDirty, errors } = formState;
  
  // 自動保存のタイマーID
  const autoSaveTimerRef = useRef(null);
  // 最後に保存したフォームの値
  const lastSavedValuesRef = useRef({});
  // 保存中フラグ
  const [isSaving, setIsSaving] = useState(false);
  // 最終保存時間
  const [lastSaved, setLastSaved] = useState(null);
  
  // 初期値が変更されたらフォームをリセット
  useEffect(() => {
    reset(initialValues);
    lastSavedValuesRef.current = initialValues;
  }, [initialValues, reset]);
  
  // フォーム送信処理
  const submitForm = useCallback(async (data) => {
    if (!onSubmit) return;
    
    try {
      setIsSaving(true);
      const result = await onSubmit(data);
      lastSavedValuesRef.current = data;
      setLastSaved(new Date());
      return result;
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('フォームの送信に失敗しました');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [onSubmit]);
  
  // 外部からフォームを送信するためのハンドル
  useImperativeHandle(ref, () => ({
    handleSubmit: () => handleSubmit(submitForm)(),
    reset,
    getValues
  }));
  
  // 自動保存の設定
  useEffect(() => {
    if (!autoSave) return;
    
    // フォームの値を監視
    const subscription = watch((formValues) => {
      // 変更がある場合のみ自動保存
      if (isDirty) {
        // 前回のタイマーをクリア
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
        
        // 自動保存のタイマーを設定
        autoSaveTimerRef.current = setTimeout(() => {
          handleSubmit(submitForm)();
        }, autoSaveDelay);
      }
    });
    
    // クリーンアップ
    return () => {
      subscription.unsubscribe();
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [autoSave, autoSaveDelay, watch, isDirty, handleSubmit, submitForm]);
  
  const contextValue = {
    ...methods,
    isSaving,
    lastSaved,
    submitForm
  };
  
  return (
    <TaskFormContext.Provider value={contextValue}>
      <FormProvider {...methods}>
        {children}
      </FormProvider>
    </TaskFormContext.Provider>
  );
});

TaskFormProvider.displayName = 'TaskFormProvider';

/**
 * タスク操作のための独立したフック
 * @param {string|number} taskId タスクID
 * @param {function} onSuccess 成功時コールバック
 * @returns {object} タスク操作用のメソッド
 */
export const useTaskForm = (taskId, onSuccess) => {
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // react-hook-formの設定
  const formMethods = useForm({
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      due_date: null,
      assigned_to: null,
      project: null,
      tags: []
    }
  });
  
  const { reset, handleSubmit, setError, formState } = formMethods;
  
  // タスクデータの取得
  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      const data = await tasksApi.getTask(taskId);
      setTask(data);
      
      // フォームの初期値を設定
      reset({
        title: data.title || '',
        description: data.description || '',
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        due_date: data.due_date || null,
        assigned_to: data.assigned_to || null,
        project: data.project || null,
        tags: data.tags || []
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('タスクの取得に失敗しました');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [taskId, reset]);
  
  // コンポーネントマウント時とタスクID変更時にタスクを取得
  useEffect(() => {
    fetchTask();
  }, [fetchTask]);
  
  // タスクの保存処理
  const saveTask = async (formData) => {
    setIsSaving(true);
    try {
      let result;
      
      if (taskId) {
        // 既存タスクの更新
        result = await tasksApi.updateTask(taskId, formData);
        toast.success('タスクを更新しました');
      } else {
        // 新規タスクの作成
        result = await tasksApi.createTask(formData);
        toast.success('タスクを作成しました');
      }
      
      // コールバック実行
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('タスクの保存に失敗しました');
      
      // APIからのバリデーションエラーを処理
      if (error.response && error.response.data) {
        const { data } = error.response;
        
        // フィールドごとのエラーを設定
        Object.keys(data).forEach(field => {
          if (typeof setError === 'function') {
            setError(field, {
              type: 'manual',
              message: Array.isArray(data[field]) ? data[field][0] : data[field]
            });
          }
        });
      }
      
      throw error;
    } finally {
      setIsSaving(false);
    }
  };
  
  // フォーム送信ハンドラ
  const onSubmit = handleSubmit(saveTask);
  
  // タスクのフィールド更新（部分更新）
  const updateTaskField = async (field, value) => {
    if (!taskId) return;
    
    try {
      const updatedTask = await tasksApi.updateTask(taskId, { [field]: value });
      setTask(updatedTask);
      return updatedTask;
    } catch (error) {
      console.error(`Error updating task field ${field}:`, error);
      toast.error('フィールドの更新に失敗しました');
      throw error;
    }
  };
  
  return {
    task,
    isLoading,
    isSaving,
    formMethods,
    fetchTask,
    saveTask,
    updateTaskField,
    onSubmit
  };
};

// TaskFormContext用のフックはuseTaskFormContextとしてエクスポート
// タスク操作用フックはuseTaskFormとしてデフォルトエクスポート
export default useTaskForm; 