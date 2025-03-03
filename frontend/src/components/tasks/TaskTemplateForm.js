import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tasksApi from '../../api/tasks';
import toast from 'react-hot-toast';
import { 
  HiOutlineDocumentText,
  HiOutlineUser,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineOfficeBuilding
} from 'react-icons/hi';

const TaskTemplateForm = ({ templateId = null, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(templateId ? true : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: null,
    priority: null,
    status: null,
    workspace: null,
    estimated_hours: '',
    template_name: '',
    is_template: true,
  });
  
  useEffect(() => {
    // Load template data if editing
    if (templateId) {
      fetchTemplateData();
    }
    
    // Load reference data
    fetchReferenceData();
  }, [templateId]);
  
  const fetchTemplateData = async () => {
    try {
      const data = await tasksApi.getTask(templateId);
      setFormData({
        ...data,
        category: data.category?.id || null,
        priority: data.priority?.id || null,
        status: data.status?.id || null,
        workspace: data.workspace?.id || null,
      });
      setError(null);
    } catch (error) {
      console.error('Error fetching template:', error);
      setError('テンプレートの取得に失敗しました');
      toast.error('テンプレートの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchReferenceData = async () => {
    try {
      // Load categories, priorities, statuses in parallel
      const [categoriesData, prioritiesData, statusesData] = await Promise.all([
        tasksApi.getCategories(),
        tasksApi.getPriorities(),
        tasksApi.getStatuses(),
      ]);
      
      setCategories(categoriesData);
      setPriorities(prioritiesData);
      setStatuses(statusesData);
      
      // For simplicity, assuming we have a function to get workspaces
      // Replace with actual API call
      setWorkspaces([
        { id: 1, name: 'Default Workspace' },
        { id: 2, name: 'Development' },
        { id: 3, name: 'Marketing' },
      ]);
    } catch (error) {
      console.error('Error fetching reference data:', error);
      toast.error('リファレンスデータの取得に失敗しました');
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Handle numeric fields
    if (type === 'number') {
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
    
    if (!formData.template_name) {
      toast.error('テンプレート名は必須です');
      return;
    }
    
    setSaving(true);
    
    try {
      if (templateId) {
        // Update existing template
        await tasksApi.updateTask(templateId, {
          ...formData,
          is_template: true,
        });
        toast.success('テンプレートを更新しました');
      } else {
        // Create new template
        await tasksApi.createTask({
          ...formData,
          is_template: true,
        });
        toast.success('新規テンプレートを作成しました');
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Error saving template:', error);
      
      // Format error message
      let errorMsg = 'テンプレートの保存に失敗しました';
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
          {templateId ? 'タスクテンプレートの編集' : '新規タスクテンプレートの作成'}
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* テンプレート名 */}
        <div className="col-span-2">
          <label htmlFor="template_name" className="block text-sm font-medium text-gray-700 mb-1">
            テンプレート名 <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
              <HiOutlineDocumentText />
            </span>
            <input
              type="text"
              id="template_name"
              name="template_name"
              value={formData.template_name}
              onChange={handleChange}
              className="input input-bordered rounded-l-none w-full"
              required
              placeholder="毎月の締め作業、決算書レビューなど"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">テンプレートを識別するための名前を入力してください</p>
        </div>
        
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
            rows="4"
            className="textarea textarea-bordered w-full"
            placeholder="タスクの詳細な説明"
          ></textarea>
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
                {priority.name}
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
        
        {/* ワークスペース */}
        <div>
          <label htmlFor="workspace" className="block text-sm font-medium text-gray-700 mb-1">
            ワークスペース
          </label>
          <select
            id="workspace"
            name="workspace"
            value={formData.workspace || ''}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="">選択してください</option>
            {workspaces.map(workspace => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
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
          <p className="mt-1 text-sm text-gray-500">時間単位（小数点以下も可）</p>
        </div>
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
            templateId ? '更新する' : '作成する'
          )}
        </button>
      </div>
    </form>
  );
};

export default TaskTemplateForm;