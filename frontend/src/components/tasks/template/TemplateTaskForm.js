import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tasksApi from '../../../api/tasks';
import toast from 'react-hot-toast';
import { 
  HiOutlineDocumentText,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineTag,
} from 'react-icons/hi';

const TemplateTaskForm = ({ parentTemplateId, templateTaskId = null, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(templateTaskId ? true : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  
  const [parentTemplate, setParentTemplate] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: null,
    priority: null,
    status: null,
    estimated_hours: '',
    order: 1,
    has_custom_schedule: false,
    // カスタムスケジュール用のフィールド
    schedule_type: 'custom',
    recurrence: 'monthly',
    creation_date_offset: 0,
    deadline_date_offset: 5,
    reference_date_type: 'execution_date',
    parent_template: parentTemplateId
  });
  
  useEffect(() => {
    // 親テンプレートの情報を取得
    fetchParentTemplate();
    
    // 既存タスクの場合はデータを取得
    if (templateTaskId) {
      fetchTemplateTaskData();
    }
    
    // 参照データを取得
    fetchReferenceData();
  }, [parentTemplateId, templateTaskId]);
  
  const fetchParentTemplate = async () => {
    try {
      const data = await tasksApi.getTask(parentTemplateId);
      setParentTemplate(data);
    } catch (error) {
      console.error('Error fetching parent template:', error);
      toast.error('親テンプレートの取得に失敗しました');
    }
  };
  
  const fetchTemplateTaskData = async () => {
    try {
      const data = await tasksApi.getTemplateTask(templateTaskId);
      
      setFormData({
        ...data,
        category: data.category?.id || null,
        priority: data.priority?.id || null,
        status: data.status?.id || null,
        parent_template: parentTemplateId
      });
      
      setError(null);
    } catch (error) {
      console.error('Error fetching template task:', error);
      setError('テンプレートタスクの取得に失敗しました');
      toast.error('テンプレートタスクの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchReferenceData = async () => {
    try {
      // カテゴリ、優先度、ステータスを取得
      const [categoriesData, prioritiesData, statusesData] = await Promise.all([
        tasksApi.getCategories(),
        tasksApi.getPriorities(),
        tasksApi.getStatuses(),
      ]);
      
      setCategories(Array.isArray(categoriesData) ? categoriesData : 
                   (categoriesData?.results || []));
      setPriorities(Array.isArray(prioritiesData) ? prioritiesData : 
                   (prioritiesData?.results || []));
      setStatuses(Array.isArray(statusesData) ? statusesData : 
                 (statusesData?.results || []));
      
    } catch (error) {
      console.error('Error fetching reference data:', error);
      toast.error('リファレンスデータの取得に失敗しました');
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? '' : parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error('タイトルは必須です');
      return;
    }
    
    setSaving(true);
    
    try {
      // スケジュールデータを準備
      let scheduleData = null;
      if (formData.has_custom_schedule) {
        scheduleData = {
          name: `${formData.title}のスケジュール`,
          schedule_type: formData.schedule_type,
          recurrence: formData.recurrence,
          creation_date_offset: formData.creation_date_offset,
          deadline_date_offset: formData.deadline_date_offset,
          reference_date_type: formData.reference_date_type
        };
      }
      
      // 保存するデータを準備
      const taskData = {
        ...formData,
        parent_template: parentTemplateId,
        is_template_task: true
      };
      
      // カスタムスケジュールの場合、スケジュールデータを設定
      if (formData.has_custom_schedule && scheduleData) {
        // 新規スケジュール作成
        const newSchedule = await tasksApi.createTaskSchedule(scheduleData);
        taskData.schedule = newSchedule.id;
      }
      
      if (templateTaskId) {
        // 既存タスクを更新
        await tasksApi.updateTemplateTask(templateTaskId, taskData);
        toast.success('テンプレートタスクを更新しました');
      } else {
        // 新規タスクを作成
        await tasksApi.createTemplateTask(taskData);
        toast.success('新規テンプレートタスクを作成しました');
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Error saving template task:', error);
      
      // エラーメッセージ表示
      let errorMsg = 'テンプレートタスクの保存に失敗しました';
      if (error.response?.data) {
        const errors = Object.entries(error.response.data)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
        errorMsg += `: ${errors}`;
      } else {
        errorMsg += `: ${error.message}`;
      }
      
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-lg">
        <h3 className="text-lg font-medium">{error}</h3>
        <p className="mt-2">
          <button 
            onClick={onCancel}
            className="text-red-700 underline"
          >
            キャンセル
          </button>
        </p>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white rounded-lg shadow">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          {templateTaskId ? 'テンプレートタスクの編集' : '新規テンプレートタスクの作成'}
        </h2>
        {parentTemplate && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">親テンプレート: {parentTemplate.template_name}</p>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* タスクタイトル */}
        <div className="col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            タスクタイトル <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
              <HiOutlineDocumentText />
            </span>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="input input-bordered rounded-l-none w-full"
              required
              placeholder="タスクのタイトル"
            />
          </div>
        </div>
        
        {/* 説明 */}
        <div className="col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            説明
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            className="textarea textarea-bordered w-full"
            placeholder="タスクの詳細な説明"
          ></textarea>
        </div>
        
        {/* 順番 */}
        <div>
          <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-1">
            実行順序
          </label>
          <input
            type="number"
            id="order"
            name="order"
            value={formData.order || 1}
            onChange={handleChange}
            min="1"
            className="input input-bordered w-full"
          />
          <p className="mt-1 text-xs text-gray-500">複数タスクがある場合の実行順序</p>
        </div>
        
        {/* 見積もり時間 */}
        <div>
          <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-1">
            見積もり時間
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
              <HiOutlineClock />
            </span>
            <input
              type="number"
              id="estimated_hours"
              name="estimated_hours"
              value={formData.estimated_hours || ''}
              onChange={handleChange}
              min="0"
              step="0.5"
              className="input input-bordered rounded-l-none w-full"
              placeholder="例: 2.5"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">時間単位（小数点以下も可）</p>
        </div>
        
        {/* カテゴリ */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            カテゴリ
          </label>
          <select
            id="category"
            name="category"
            value={formData.category || ''}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="">選択してください</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* 優先度 */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            優先度
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority || ''}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="">選択してください</option>
            {priorities.map(priority => (
              <option key={priority.id} value={priority.id}>
                {priority.priority_value || '未設定'}
              </option>
            ))}
          </select>
        </div>
        
        {/* ステータス */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            ステータス
          </label>
          <select
            id="status"
            name="status"
            value={formData.status || ''}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="">選択してください</option>
            {statuses.map(status => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* カスタムスケジュールの設定 */}
        <div className="col-span-2">
          <div className="form-control">
            <label className="label cursor-pointer justify-start">
              <input
                type="checkbox"
                name="has_custom_schedule"
                checked={formData.has_custom_schedule}
                onChange={handleChange}
                className="checkbox checkbox-primary mr-2"
              />
              <span className="label-text">このタスク用にカスタムスケジュールを設定する</span>
            </label>
            <p className="text-xs text-gray-500 ml-7">
              チェックしない場合は親テンプレートのスケジュール設定が使用されます
            </p>
          </div>
        </div>
        
        {/* カスタムスケジュール設定フィールド（チェックボックスがオンの場合のみ表示） */}
        {formData.has_custom_schedule && (
          <div className="col-span-2 p-4 bg-gray-50 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-700">カスタムスケジュール設定</h3>
            
            <div>
              <label htmlFor="reference_date_type" className="block text-sm font-medium text-gray-700 mb-1">
                基準日タイプ
              </label>
              <select
                id="reference_date_type"
                name="reference_date_type"
                value={formData.reference_date_type}
                onChange={handleChange}
                className="select select-bordered w-full"
              >
                <option value="parent_creation">親タスク作成日</option>
                <option value="execution_date">実行日（バッチ処理実行日）</option>
                <option value="fiscal_start">決算期開始日</option>
                <option value="fiscal_end">決算期終了日</option>
                <option value="month_start">当月初日</option>
                <option value="month_end">当月末日</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="creation_date_offset" className="block text-sm font-medium text-gray-700 mb-1">
                  作成日オフセット（日数）
                </label>
                <input
                  type="number"
                  id="creation_date_offset"
                  name="creation_date_offset"
                  value={formData.creation_date_offset}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                  placeholder="基準日からの日数"
                />
                <p className="mt-1 text-xs text-gray-500">基準日から何日後に作成するか（0=当日）</p>
              </div>
              
              <div>
                <label htmlFor="deadline_date_offset" className="block text-sm font-medium text-gray-700 mb-1">
                  期限日オフセット（日数）
                </label>
                <input
                  type="number"
                  id="deadline_date_offset"
                  name="deadline_date_offset"
                  value={formData.deadline_date_offset}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                  placeholder="作成日からの日数"
                />
                <p className="mt-1 text-xs text-gray-500">作成日から何日後を期限とするか</p>
              </div>
            </div>
            
            <div>
              <label htmlFor="recurrence" className="block text-sm font-medium text-gray-700 mb-1">
                繰り返し
              </label>
              <select
                id="recurrence"
                name="recurrence"
                value={formData.recurrence}
                onChange={handleChange}
                className="select select-bordered w-full"
              >
                <option value="with_parent">親テンプレートと同時</option>
                <option value="monthly">毎月</option>
                <option value="quarterly">四半期ごと</option>
                <option value="yearly">毎年</option>
                <option value="once">一度のみ</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* 送信ボタン */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-ghost"
          disabled={saving}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2"></span>
              保存中...
            </>
          ) : (
            templateTaskId ? '更新する' : '作成する'
          )}
        </button>
      </div>
    </form>
  );
};

export default TemplateTaskForm;