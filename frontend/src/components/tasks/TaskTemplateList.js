import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tasksApi from '../../api/tasks';
import toast from 'react-hot-toast';
import TaskTemplateForm from './TaskTemplateForm';
import {
  HiOutlineDocumentText,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineDuplicate,
  HiOutlinePlus,
  HiOutlineTag,
  HiOutlineClock
} from 'react-icons/hi';

const TaskTemplateList = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await tasksApi.getTemplates();
      setTemplates(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('テンプレートの取得に失敗しました');
      toast.error('テンプレートの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('このテンプレートを削除してもよろしいですか？')) {
      try {
        await tasksApi.deleteTask(id);
        toast.success('テンプレートを削除しました');
        fetchTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
        toast.error('テンプレートの削除に失敗しました');
      }
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleApplyTemplate = async (templateId) => {
    try {
      // For now, just create a task from template with default values
      const newTask = await tasksApi.createFromTemplate(templateId, {
        title: templates.find(t => t.id === templateId)?.title || 'New Task',
      });
      
      toast.success('テンプレートからタスクを作成しました');
      
      // Navigate to the new task
      navigate(`/tasks/${newTask.id}`);
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('テンプレートの適用に失敗しました');
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTemplate(null);
    fetchTemplates();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
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
            onClick={() => navigate('/tasks')}
            className="text-red-700 underline"
          >
            タスク一覧に戻る
          </button>
        </p>
      </div>
    );
  }

  if (showForm) {
    return (
      <TaskTemplateForm 
        templateId={editingTemplate?.id}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">タスクテンプレート</h1>
        <button 
          className="btn btn-primary"
          onClick={handleCreateNew}
        >
          <HiOutlinePlus className="mr-2" /> 新規テンプレート
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-lg border border-gray-200">
          <HiOutlineDocumentText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">テンプレートがありません</h3>
          <p className="mt-1 text-gray-500">新しいテンプレートを作成して繰り返しタスクを効率化しましょう。</p>
          <div className="mt-6">
            <button
              onClick={handleCreateNew}
              className="btn btn-primary"
            >
              <HiOutlinePlus className="mr-2" /> 新規テンプレート作成
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="font-semibold text-gray-800 truncate" title={template.template_name}>
                  {template.template_name || template.title}
                </h2>
                <div className="flex space-x-2">
                  <button 
                    className="btn btn-sm btn-ghost text-blue-600"
                    onClick={() => handleEdit(template)}
                    title="編集"
                  >
                    <HiOutlinePencilAlt />
                  </button>
                  <button 
                    className="btn btn-sm btn-ghost text-red-600"
                    onClick={() => handleDelete(template.id)}
                    title="削除"
                  >
                    <HiOutlineTrash />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-gray-600 mb-3 line-clamp-2" title={template.description}>
                  {template.description || '説明なし'}
                </p>
                
                <div className="mb-4 space-y-2">
                  {template.category && (
                    <div className="flex items-center text-sm">
                      <HiOutlineTag className="mr-2 text-gray-500" />
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {template.category.name}
                      </span>
                    </div>
                  )}
                  
                  {template.estimated_hours && (
                    <div className="flex items-center text-sm text-gray-600">
                      <HiOutlineClock className="mr-2 text-gray-500" />
                      <span>{template.estimated_hours}時間</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleApplyTemplate(template.id)}
                  >
                    <HiOutlineDuplicate className="mr-1" /> タスク作成
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskTemplateList;