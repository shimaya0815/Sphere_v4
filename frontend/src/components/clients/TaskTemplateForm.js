import React, { useState, useEffect } from 'react';
import { clientsApi, usersApi, tasksApi } from '../../api';
import toast from 'react-hot-toast';
import { HiX } from 'react-icons/hi';

const TaskTemplateForm = ({ clientId, template = null, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline_type: 'calendar_days',
    deadline_value: 30,
    worker: null,
    reviewer: null,
    category: null,
    priority: null,
    estimated_hours: '',
    is_active: true,
    template: null
  });
  
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Load available templates
        const templatesData = await clientsApi.getTaskTemplates();
        setAvailableTemplates(templatesData);
        
        // Load users
        const usersData = await usersApi.getUsers();
        setUsers(usersData);
        
        // Load categories and priorities
        const categoriesData = await tasksApi.getCategories();
        setCategories(categoriesData);
        
        const prioritiesData = await tasksApi.getPriorities();
        setPriorities(prioritiesData);
        
        // If editing existing template, load its data
        if (template) {
          setFormData({
            title: template.title || '',
            description: template.description || '',
            deadline_type: template.deadline_type || 'calendar_days',
            deadline_value: template.deadline_value || 30,
            worker: template.worker || null,
            reviewer: template.reviewer || null,
            category: template.category || null,
            priority: template.priority || null,
            estimated_hours: template.estimated_hours || '',
            is_active: template.is_active !== false,
            template: template.template || null
          });
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        toast.error('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [clientId, template]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle different input types
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'worker' || name === 'reviewer' || name === 'category' || name === 'priority' || name === 'template') {
      // Handle select inputs that should be numbers or null
      const numValue = value === '' ? null : Number(value);
      setFormData({ ...formData, [name]: numValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      let result;
      
      // Prepare data for submission
      const submitData = {
        ...formData,
        client: clientId
      };
      
      if (template) {
        // Update existing template
        result = await clientsApi.updateClientTaskTemplate(template.id, submitData);
        toast.success('テンプレート設定を更新しました');
      } else {
        // Create new template
        result = await clientsApi.createClientTaskTemplate(clientId, submitData);
        toast.success('テンプレート設定を作成しました');
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.detail || 'テンプレート設定の保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };
  
  // When template selection changes, populate form with template data
  const handleTemplateChange = async (e) => {
    const templateId = e.target.value === '' ? null : Number(e.target.value);
    setFormData({ ...formData, template: templateId });
    
    if (templateId) {
      // Find the selected template
      const selectedTemplate = availableTemplates.find(t => t.id === templateId);
      if (selectedTemplate) {
        // Update form with template data
        setFormData({
          ...formData,
          template: templateId,
          title: selectedTemplate.title || '',
          description: selectedTemplate.description || '',
          category: selectedTemplate.category?.id || null,
          priority: selectedTemplate.priority?.id || null,
          estimated_hours: selectedTemplate.estimated_hours || ''
        });
      }
    }
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {template ? 'テンプレート設定の編集' : 'テンプレート設定の追加'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <HiX size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* テンプレート選択 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              元テンプレート
            </label>
            <select
              name="template"
              value={formData.template || ''}
              onChange={handleTemplateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">選択してください</option>
              {availableTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              既存のテンプレートを選択すると、その内容が自動的に入力されます
            </p>
          </div>
          
          {/* タイトル */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* 説明 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* 期限タイプ */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              期限タイプ <span className="text-red-500">*</span>
            </label>
            <select
              name="deadline_type"
              value={formData.deadline_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="calendar_days">カレンダー日付</option>
              <option value="business_days">営業日</option>
              <option value="fiscal_date">決算日基準</option>
            </select>
          </div>
          
          {/* 期限値 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              期限値 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="deadline_value"
              value={formData.deadline_value}
              onChange={handleChange}
              required
              min="-365"
              max="365"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="mt-1 text-sm text-gray-500">
              {formData.deadline_type === 'calendar_days' && '現在日から何日後が期限か'}
              {formData.deadline_type === 'business_days' && '現在日から何営業日後が期限か'}
              {formData.deadline_type === 'fiscal_date' && '決算日から±何日が期限か（マイナス値可）'}
            </p>
          </div>
          
          {/* 担当者 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作業担当者
              </label>
              <select
                name="worker"
                value={formData.worker || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">担当者を選択</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                レビュー担当者
              </label>
              <select
                name="reviewer"
                value={formData.reviewer || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">担当者を選択</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* カテゴリとプライオリティ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                カテゴリ
              </label>
              <select
                name="category"
                value={formData.category || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">カテゴリを選択</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                優先度
              </label>
              <select
                name="priority"
                value={formData.priority || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">優先度を選択</option>
                {priorities.map(priority => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name || priority.priority_value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* 見積工数 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              見積工数（時間）
            </label>
            <input
              type="number"
              name="estimated_hours"
              value={formData.estimated_hours}
              onChange={handleChange}
              step="0.25"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* 有効/無効 */}
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">有効</span>
            </label>
          </div>
          
          {/* 送信ボタン */}
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost mr-2"
              disabled={submitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </span>
              ) : (
                '保存'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskTemplateForm;