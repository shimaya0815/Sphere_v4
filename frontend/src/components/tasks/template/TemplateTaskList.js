import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import tasksApi from '../../../api/tasks';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineCheck
} from 'react-icons/hi';
import TemplateTaskForm from './TemplateTaskForm';

const TemplateTaskList = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [parentTemplate, setParentTemplate] = useState(null);
  const [templateTasks, setTemplateTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchParentTemplate();
    fetchTemplateTasks();
  }, [templateId]);
  
  const fetchParentTemplate = async () => {
    try {
      const data = await tasksApi.getTask(templateId);
      setParentTemplate(data);
    } catch (error) {
      console.error('Error fetching parent template:', error);
      toast.error('親テンプレートの取得に失敗しました');
      setError('親テンプレートの取得に失敗しました');
    }
  };
  
  const fetchTemplateTasks = async () => {
    setLoading(true);
    try {
      const data = await tasksApi.getTemplateChildTasks(templateId);
      console.log('Template child tasks:', data);
      setTemplateTasks(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching template tasks:', error);
      toast.error('テンプレートタスクの取得に失敗しました');
      setError('テンプレートタスクの取得に失敗しました');
      setTemplateTasks([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (taskId) => {
    if (window.confirm('このテンプレートタスクを削除してもよろしいですか？')) {
      try {
        await tasksApi.deleteTemplateTask(taskId);
        toast.success('テンプレートタスクを削除しました');
        fetchTemplateTasks();
      } catch (error) {
        console.error('Error deleting template task:', error);
        toast.error('テンプレートタスクの削除に失敗しました');
      }
    }
  };
  
  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };
  
  const handleCreateNew = () => {
    setEditingTask(null);
    setShowForm(true);
  };
  
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTask(null);
    fetchTemplateTasks();
  };
  
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTask(null);
  };
  
  if (loading && !parentTemplate) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (error && !parentTemplate) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-lg">
        <h3 className="text-lg font-medium">{error}</h3>
        <p className="mt-2">
          <button 
            onClick={() => navigate('/tasks/templates')}
            className="text-red-700 underline"
          >
            テンプレート一覧に戻る
          </button>
        </p>
      </div>
    );
  }
  
  if (showForm) {
    return (
      <TemplateTaskForm 
        parentTemplateId={templateId}
        templateTaskId={editingTask?.id}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー部分 */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/tasks/templates')}
          className="btn btn-ghost btn-sm mb-4"
        >
          <HiOutlineArrowLeft className="mr-2" /> テンプレート一覧に戻る
        </button>
        
        {parentTemplate && (
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <h1 className="text-2xl font-bold mb-2">{parentTemplate.template_name}</h1>
            <p className="text-gray-600 mb-2">{parentTemplate.description}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {parentTemplate.category && (
                <span className="badge badge-info">
                  {parentTemplate.category.name}
                </span>
              )}
              {parentTemplate.schedule && (
                <span className="badge badge-ghost">
                  スケジュール設定あり
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 操作ボタン */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">内包タスク一覧</h2>
        <button 
          className="btn btn-primary"
          onClick={handleCreateNew}
        >
          <HiOutlinePlus className="mr-2" /> 新規内包タスク
        </button>
      </div>
      
      {/* テンプレートタスク一覧 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : templateTasks.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-lg border border-gray-200">
          <HiOutlineDocumentText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">内包タスクがありません</h3>
          <p className="mt-1 text-gray-500">このテンプレートにはまだ内包タスクが追加されていません。</p>
          <div className="mt-6">
            <button
              onClick={handleCreateNew}
              className="btn btn-primary"
            >
              <HiOutlinePlus className="mr-2" /> 内包タスクを追加
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full table-zebra">
            <thead>
              <tr>
                <th>順序</th>
                <th>タスク名</th>
                <th>説明</th>
                <th>カテゴリ</th>
                <th>スケジュール</th>
                <th>見積時間</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {templateTasks.map((task, index) => (
                <tr key={task.id} className="hover">
                  <td>{task.order || index + 1}</td>
                  <td className="font-medium">{task.title}</td>
                  <td className="max-w-xs truncate" title={task.description}>
                    {task.description || '説明なし'}
                  </td>
                  <td>
                    {task.category ? (
                      <span className="badge badge-info badge-sm">
                        {task.category.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    {task.has_custom_schedule ? (
                      <span className="badge badge-success badge-sm">独自設定</span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">親と同じ</span>
                    )}
                  </td>
                  <td>
                    {task.estimated_hours ? (
                      <span>{task.estimated_hours}時間</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end space-x-1">
                      <button
                        className="btn btn-xs btn-primary"
                        onClick={() => handleEdit(task)}
                        title="編集"
                      >
                        <HiOutlinePencilAlt size={16} />
                      </button>
                      <button
                        className="btn btn-xs btn-error"
                        onClick={() => handleDelete(task.id)}
                        title="削除"
                      >
                        <HiOutlineTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TemplateTaskList;