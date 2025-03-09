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
  const [users, setUsers] = useState([]);
  
  const [parentTemplate, setParentTemplate] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: null,
    priority: null,
    status: null,
    estimated_hours: '',
    order: 1,
    worker: null,
    reviewer: null,
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
      console.log('Fetching parent template details with getTemplate:', parentTemplateId);
      const data = await tasksApi.getTemplate(parentTemplateId);
      console.log('Parent template data received:', data);
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
      // カテゴリ、優先度、ステータス、ユーザー一覧を取得
      const [categoriesData, prioritiesData, statusesData, usersData] = await Promise.all([
        tasksApi.getCategories(),
        tasksApi.getPriorities(),
        tasksApi.getStatuses(),
        tasksApi.getUsers(),
      ]);
      
      setCategories(Array.isArray(categoriesData) ? categoriesData : 
                   (categoriesData?.results || []));
      setPriorities(Array.isArray(prioritiesData) ? prioritiesData : 
                   (prioritiesData?.results || []));
      setStatuses(Array.isArray(statusesData) ? statusesData : 
                 (statusesData?.results || []));
      setUsers(Array.isArray(usersData) ? usersData : 
               (usersData?.results || []));
      
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
    <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-6">
        {templateTaskId ? 'テンプレートタスクの編集' : '新規テンプレートタスクの作成'}
      </h2>
      {parentTemplate && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">親テンプレート: {parentTemplate.template_name || parentTemplate.title}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* タスクタイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
              placeholder="タスクのタイトルを入力"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          
          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
              説明
            </label>
            <textarea
              id="description"
              rows="4"
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
              placeholder="タスクの詳細を入力"
              name="description"
              value={formData.description}
              onChange={handleChange}
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
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
                name="worker"
                value={formData.worker || ''}
                onChange={handleChange}
              >
                <option value="">担当者を選択</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name || ''} {user.last_name || ''} {(!user.first_name && !user.last_name) ? user.username || user.email || `User ${user.id}` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reviewer">
                レビュアー
              </label>
              <select
                id="reviewer"
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
                name="reviewer"
                value={formData.reviewer || ''}
                onChange={handleChange}
              >
                <option value="">レビュアーを選択</option>
                {users.map(reviewer => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.first_name || ''} {reviewer.last_name || ''} {(!reviewer.first_name && !reviewer.last_name) ? reviewer.username || reviewer.email || `User ${reviewer.id}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">
                ステータス
              </label>
              <select
                id="status"
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
              >
                <option value="">ステータスを選択</option>
                {statuses.map(status => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="priority">
                優先度
              </label>
              <select
                id="priority"
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
                name="priority"
                value={formData.priority || ''}
                onChange={handleChange}
              >
                <option value="">優先度を選択</option>
                {priorities.map(priority => (
                  <option key={priority.id} value={priority.id}>
                    {priority.priority_value || '未設定'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="category">
                カテゴリー
              </label>
              <select
                id="category"
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
                name="category"
                value={formData.category || ''}
                onChange={handleChange}
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
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
                placeholder="2.5"
                name="estimated_hours"
                value={formData.estimated_hours || ''}
                onChange={handleChange}
              />
            </div>
          </div>
          
          {/* 実行順序 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="order">
              実行順序
            </label>
            <input
              id="order"
              type="number"
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
              placeholder="1"
              name="order"
              value={formData.order || 1}
              onChange={handleChange}
              min="1"
            />
            <p className="mt-1 text-xs text-gray-500">複数タスクがある場合の実行順序</p>
          </div>
        
          {/* カスタムスケジュールの設定 */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="has_custom_schedule"
                name="has_custom_schedule"
                checked={formData.has_custom_schedule}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="has_custom_schedule" className="ml-2 block text-sm text-gray-700 font-medium">
                このタスク用にカスタムスケジュールを設定する
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500 ml-6">
              チェックしない場合は親テンプレートのスケジュール設定が使用されます
            </p>
          
            {/* カスタムスケジュール設定フィールド（チェックボックスがオンの場合のみ表示） */}
            {formData.has_custom_schedule && (
              <div className="mt-4 space-y-4">
                <h3 className="font-medium text-gray-700 text-sm">スケジュール詳細設定</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reference_date_type">
                    基準日タイプ
                  </label>
                  <select
                    id="reference_date_type"
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
                    name="reference_date_type"
                    value={formData.reference_date_type}
                    onChange={handleChange}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="creation_date_offset">
                      作成日オフセット（日数）
                    </label>
                    <input
                      type="number"
                      id="creation_date_offset"
                      className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
                      placeholder="基準日からの日数"
                      name="creation_date_offset"
                      value={formData.creation_date_offset}
                      onChange={handleChange}
                    />
                    <p className="mt-1 text-xs text-gray-500">基準日から何日後に作成するか（0=当日）</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="deadline_date_offset">
                      期限日オフセット（日数）
                    </label>
                    <input
                      type="number"
                      id="deadline_date_offset"
                      className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
                      placeholder="作成日からの日数"
                      name="deadline_date_offset"
                      value={formData.deadline_date_offset}
                      onChange={handleChange}
                    />
                    <p className="mt-1 text-xs text-gray-500">作成日から何日後を期限とするか</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="recurrence">
                    繰り返し
                  </label>
                  <select
                    id="recurrence"
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm"
                    name="recurrence"
                    value={formData.recurrence}
                    onChange={handleChange}
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
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={onCancel}
              disabled={saving}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className={`w-24 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                saving ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              disabled={saving}
            >
              {saving ? '保存中...' : templateTaskId ? '更新' : '作成'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TemplateTaskForm;