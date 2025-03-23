import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../api';
import Modal from '../common/Modal';
import { HiOutlineTemplate, HiOutlineExclamation } from 'react-icons/hi';

const TaskTemplateForm = ({ clientId, template, schedules, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    schedule: '',
    template_task: '',
    category: '',
    estimated_hours: '',
    worker: '',
    reviewer: '',
    is_active: true,
    order: 0,
  });
  
  const [templateTasks, setTemplateTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title || '',
        description: template.description || '',
        schedule: template.schedule || '',
        template_task: template.template_task || '',
        category: template.category || '',
        estimated_hours: template.estimated_hours || '',
        worker: template.worker || '',
        reviewer: template.reviewer || '',
        is_active: template.is_active !== undefined ? template.is_active : true,
        order: template.order || 0,
      });
    }
  }, [template]);
  
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 並列にデータを取得
      const [templatesRes, categoriesRes, usersRes] = await Promise.all([
        clientsApi.getTaskTemplates(),
        fetch('/api/tasks/categories/').then(res => res.json()),
        fetch('/api/users/').then(res => res.json()),
      ]);
      
      setTemplateTasks(templatesRes);
      setCategories(categoriesRes);
      setUsers(usersRes);
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です';
    }
    
    if (!formData.template_task) {
      newErrors.template_task = 'テンプレートタスクは必須です';
    }
    
    // Numeric validation
    if (formData.estimated_hours && isNaN(parseFloat(formData.estimated_hours))) {
      newErrors.estimated_hours = '見積工数は数値で入力してください';
    }
    
    if (formData.order && isNaN(parseInt(formData.order))) {
      newErrors.order = '表示順は整数で入力してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert string values to numbers where needed
      const submissionData = {
        ...formData,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        order: formData.order ? parseInt(formData.order) : 0,
      };
      
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Modal title="Loading" onClose={onClose}>
        <div className="flex justify-center items-center p-8">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </Modal>
    );
  }
  
  return (
    <Modal
      title={
        <div className="flex items-center text-lg font-semibold">
          <HiOutlineTemplate className="mr-2" />
          {template ? 'タスクテンプレートを編集' : 'タスクテンプレートを作成'}
        </div>
      }
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* 基本情報 */}
          <div>
            <h3 className="text-md font-semibold mb-3">基本情報</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text">タイトル<span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="月次帳簿チェックなど"
                className={`input input-bordered w-full ${errors.title ? 'input-error' : ''}`}
              />
              {errors.title && <span className="text-error text-sm mt-1">{errors.title}</span>}
            </div>
            
            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text">説明</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="タスクの詳細な説明"
                className="textarea textarea-bordered"
                rows="3"
              ></textarea>
            </div>
            
            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text">スケジュール</span>
              </label>
              <select
                name="schedule"
                value={formData.schedule}
                onChange={handleChange}
                className={`select select-bordered w-full ${errors.schedule ? 'select-error' : ''}`}
              >
                <option value="">スケジュールを選択</option>
                {Array.isArray(schedules) && schedules.map(schedule => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.name} ({schedule.schedule_type_display})
                  </option>
                ))}
              </select>
              {errors.schedule && <span className="text-error text-sm mt-1">{errors.schedule}</span>}
              
              {(!Array.isArray(schedules) || schedules.length === 0) && (
                <div className="alert alert-warning mt-2">
                  <HiOutlineExclamation className="h-5 w-5" />
                  <span>スケジュールが設定されていない場合、タスクの自動生成は行われません</span>
                </div>
              )}
            </div>
          </div>
          
          {/* テンプレート設定 */}
          <div>
            <h3 className="text-md font-semibold mb-3">テンプレート設定</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text">テンプレートタスク<span className="text-red-500">*</span></span>
              </label>
              <select
                name="template_task"
                value={formData.template_task}
                onChange={handleChange}
                className={`select select-bordered w-full ${errors.template_task ? 'select-error' : ''}`}
              >
                <option value="">テンプレートを選択</option>
                {Array.isArray(templateTasks) && templateTasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              {errors.template_task && <span className="text-error text-sm mt-1">{errors.template_task}</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">カテゴリ</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="">カテゴリを選択</option>
                  {Array.isArray(categories) && categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text">見積工数（時間）</span>
              </label>
              <input
                type="number"
                name="estimated_hours"
                value={formData.estimated_hours}
                onChange={handleChange}
                placeholder="例: 2.5"
                step="0.25"
                min="0"
                className={`input input-bordered w-full ${errors.estimated_hours ? 'input-error' : ''}`}
              />
              {errors.estimated_hours && <span className="text-error text-sm mt-1">{errors.estimated_hours}</span>}
            </div>
          </div>
          
          {/* 担当者設定 */}
          <div>
            <h3 className="text-md font-semibold mb-3">担当者設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">作業担当者</span>
                </label>
                <select
                  name="worker"
                  value={formData.worker}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="">担当者を選択</option>
                  {Array.isArray(users) && users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.username}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">レビュー担当者</span>
                </label>
                <select
                  name="reviewer"
                  value={formData.reviewer}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="">担当者を選択</option>
                  {Array.isArray(users) && users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* その他の設定 */}
          <div>
            <h3 className="text-md font-semibold mb-3">その他の設定</h3>
            <div className="flex space-x-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text mr-3">有効</span>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="toggle toggle-primary"
                  />
                </label>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">表示順</span>
                </label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className={`input input-bordered w-24 ${errors.order ? 'input-error' : ''}`}
                />
                {errors.order && <span className="text-error text-sm mt-1">{errors.order}</span>}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            disabled={isSubmitting}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : template ? '更新' : '作成'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskTemplateForm;