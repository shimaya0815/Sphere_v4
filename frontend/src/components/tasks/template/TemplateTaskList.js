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
  HiOutlineCheck,
  HiOutlineX
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
      console.log('Fetching parent template with ID:', templateId);
      const data = await tasksApi.getTemplate(templateId);
      console.log('Parent template data:', data);
      setParentTemplate(data);
      // 成功したらエラーをリセット
      setError(null);
    } catch (error) {
      console.error('Error fetching parent template:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('親テンプレートの取得に失敗しました');
      // エラーを設定するがエラー画面には遷移しない
      setParentTemplate(null);
    }
  };
  
  const fetchTemplateTasks = async () => {
    setLoading(true);
    try {
      console.log('Fetching template child tasks with templateId:', templateId);
      // APIが実装されているので、実際のAPIを使用
      const data = await tasksApi.getTemplateTasks(templateId);
      console.log('Template child tasks:', data);
      
      setTemplateTasks(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching template tasks:', error);
      console.error('Error details:', error.response?.data || error.message);
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
        // 内包タスク用のAPI関数が実装されたのでそれを使用
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
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // 内包タスクの取得に失敗した場合のみエラー画面を表示
  if (error && error.includes('テンプレートタスクの取得に失敗')) {
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
  
  // タスクフォームはメイン画面と同時に表示され、スライドパネルとして表示されます
  // showForm が true の場合のみスライドパネルが表示されます
  
  return (
    <>
      <div className="container mx-auto p-6">
        {/* ヘッダー部分 */}
        <div className="mb-6">
          <button 
            onClick={() => navigate('/tasks/templates')}
            className="btn btn-ghost btn-sm mb-4"
          >
            <HiOutlineArrowLeft className="mr-2" /> テンプレート一覧に戻る
          </button>
          
          {parentTemplate ? (
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
          ) : (
            <div className="bg-yellow-50 p-4 rounded-lg shadow-sm mb-6">
              <h1 className="text-xl font-bold mb-2">テンプレート ID: {templateId}</h1>
              <p className="text-yellow-600">
                親テンプレート情報の取得に失敗しましたが、内包タスクの管理は引き続き行えます。
              </p>
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
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handleCreateNew}
                  className="btn btn-primary"
                >
                  <HiOutlinePlus className="mr-2" /> 内包タスクを追加
                </button>
              </div>
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
                        <div>
                          <span className="badge badge-success badge-sm mb-1">独自設定</span>
                          {task.schedule && (
                            <div className="text-xs">
                              <div className="text-gray-600">
                                {task.schedule.name}
                              </div>
                              <div className="flex items-center mt-1">
                                <HiOutlineCalendar className="text-gray-500 mr-1" size={12} />
                                <span className="text-gray-500">
                                  {task.schedule.schedule_type === 'monthly_start' && '月初作成'}
                                  {task.schedule.schedule_type === 'monthly_end' && '月末作成'}
                                  {task.schedule.schedule_type === 'fiscal_relative' && '決算日基準'}
                                  {task.schedule.schedule_type === 'custom' && 'カスタム'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="badge badge-ghost badge-sm">親と同じ</span>
                          <div className="text-xs text-gray-500 mt-1">
                            <HiOutlineClock className="inline mr-1" size={12} />
                            親タスクのスケジュールを継承
                          </div>
                        </div>
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

      {/* スライドパネル - showFormがtrueの場合のみ表示 */}
      {showForm && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 overflow-hidden">
            {/* オーバーレイ */}
            <div 
              className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleFormCancel}
            />
            
            {/* スライドパネル */}
            <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
              <div className="relative w-screen max-w-2xl transform transition ease-in-out duration-300">
                <div className="h-full flex flex-col bg-white shadow-xl overflow-y-auto">
                  {/* ヘッダー */}
                  <div className="px-4 py-6 bg-white border-b border-gray-200 sm:px-6">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-medium text-gray-900">
                        {editingTask ? 'テンプレートタスクを編集' : '新規テンプレートタスク作成'}
                      </h2>
                      <div className="ml-3 h-7 flex items-center">
                        <button
                          onClick={handleFormCancel}
                          className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <span className="sr-only">閉じる</span>
                          <HiOutlineX className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* フォーム本体 */}
                  <div className="flex-1 py-6 px-4 sm:px-6 overflow-auto">
                    <TemplateTaskForm 
                      parentTemplateId={templateId}
                      templateTaskId={editingTask?.id}
                      onSuccess={handleFormSuccess}
                      onCancel={handleFormCancel}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TemplateTaskList;