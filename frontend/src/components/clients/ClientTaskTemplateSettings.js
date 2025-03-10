import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../api';
import toast from 'react-hot-toast';
import { 
  HiOutlineTemplate, 
  HiOutlineClock, 
  HiOutlineCalendar,
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlinePencilAlt,
  HiOutlineCheck,
  HiOutlineX
} from 'react-icons/hi';
import TaskTemplateForm from './TaskTemplateForm';
import TaskTemplateScheduleForm from './TaskTemplateScheduleForm';

const ClientTaskTemplateSettings = ({ clientId, client }) => {
  const [templates, setTemplates] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesData, schedulesData] = await Promise.all([
        clientsApi.getClientTaskTemplates(clientId),
        clientsApi.getTaskTemplateSchedules()
      ]);
      // 配列かどうかを確認してから設定
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching task template data:', error);
      setError('タスクテンプレート情報の取得に失敗しました');
      toast.error('タスクテンプレート情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (templateData) => {
    try {
      await clientsApi.createClientTaskTemplate(clientId, templateData);
      toast.success('タスクテンプレートを作成しました');
      setShowTemplateForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating task template:', error);
      toast.error('タスクテンプレートの作成に失敗しました');
    }
  };

  const handleUpdateTemplate = async (templateData) => {
    try {
      await clientsApi.updateClientTaskTemplate(editingTemplate.id, templateData);
      toast.success('タスクテンプレートを更新しました');
      setShowTemplateForm(false);
      setEditingTemplate(null);
      fetchData();
    } catch (error) {
      console.error('Error updating task template:', error);
      toast.error('タスクテンプレートの更新に失敗しました');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('このタスクテンプレートを削除してもよろしいですか？')) {
      try {
        await clientsApi.deleteClientTaskTemplate(templateId);
        toast.success('タスクテンプレートを削除しました');
        fetchData();
      } catch (error) {
        console.error('Error deleting task template:', error);
        toast.error('タスクテンプレートの削除に失敗しました');
      }
    }
  };

  const handleCreateSchedule = async (scheduleData) => {
    try {
      await clientsApi.createTaskTemplateSchedule(scheduleData);
      toast.success('スケジュール設定を作成しました');
      setShowScheduleForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('スケジュール設定の作成に失敗しました');
    }
  };

  const handleUpdateSchedule = async (scheduleData) => {
    try {
      await clientsApi.updateTaskTemplateSchedule(editingSchedule.id, scheduleData);
      toast.success('スケジュール設定を更新しました');
      setShowScheduleForm(false);
      setEditingSchedule(null);
      fetchData();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('スケジュール設定の更新に失敗しました');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (window.confirm('このスケジュール設定を削除してもよろしいですか？関連するタスクテンプレートも更新する必要があります。')) {
      try {
        await clientsApi.deleteTaskTemplateSchedule(scheduleId);
        toast.success('スケジュール設定を削除しました');
        fetchData();
      } catch (error) {
        console.error('Error deleting schedule:', error);
        toast.error('スケジュール設定の削除に失敗しました');
      }
    }
  };

  const handleGenerateTask = async (templateId) => {
    try {
      const task = await clientsApi.generateTaskFromTemplate(templateId);
      toast.success('タスクを生成しました');
      return task;
    } catch (error) {
      console.error('Error generating task:', error);
      toast.error('タスクの生成に失敗しました');
      return null;
    }
  };

  const getScheduleDescription = (schedule) => {
    switch (schedule.schedule_type) {
      case 'monthly_start':
        return '月初作成（1日）・当月締め切り（5日）';
      case 'monthly_end':
        return '月末作成（25日）・翌月締め切り（10日）';
      case 'fiscal_relative':
        const reference = schedule.fiscal_date_reference_display?.toLowerCase() || '';
        const relativeDays = schedule.deadline_day || 0;
        const daysText = relativeDays > 0 ? `${relativeDays}日後` : `${Math.abs(relativeDays)}日前`;
        return `決算${reference}の${daysText}`;
      case 'custom':
        return 'カスタム設定';
      default:
        return schedule.schedule_type_display || schedule.schedule_type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg shadow">
        <p>{error}</p>
        <button 
          onClick={fetchData}
          className="mt-2 btn btn-sm btn-outline btn-error"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* スケジュール設定セクション */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <HiOutlineClock className="mr-2" /> タスク生成スケジュール設定
          </h2>
          <button
            onClick={() => {
              setEditingSchedule(null);
              setShowScheduleForm(true);
            }}
            className="btn btn-sm btn-ghost bg-white bg-opacity-20 text-white"
          >
            <HiOutlinePlusCircle className="mr-1" /> 新規スケジュール
          </button>
        </div>
        
        <div className="p-4">
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <HiOutlineCalendar className="mx-auto h-12 w-12 mb-4" />
              <p>スケジュール設定がありません。新規作成してください。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(schedules) ? schedules.map(schedule => (
                <div 
                  key={schedule.id} 
                  className={`border rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 ${
                    selectedSchedule?.id === schedule.id ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''
                  }`}
                  onClick={() => setSelectedSchedule(schedule)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-indigo-700">{schedule.name}</h3>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSchedule(schedule);
                          setShowScheduleForm(true);
                        }}
                        className="text-gray-500 hover:text-indigo-600"
                      >
                        <HiOutlinePencilAlt className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSchedule(schedule.id);
                        }}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <HiOutlineTrash className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">タイプ:</span> {schedule.schedule_type_display}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">説明:</span> {getScheduleDescription(schedule)}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">繰り返し:</span> {schedule.recurrence_display}
                  </div>
                </div>
              )) : (
                <div className="col-span-3 text-center py-4 text-gray-500">
                  <p>スケジュールデータの読み込みに失敗しました。</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* タスクテンプレートセクション */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <HiOutlineTemplate className="mr-2" /> クライアントタスクテンプレート
          </h2>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowTemplateForm(true);
            }}
            className="btn btn-sm btn-ghost bg-white bg-opacity-20 text-white"
            disabled={schedules.length === 0}
          >
            <HiOutlinePlusCircle className="mr-1" /> 新規テンプレート
          </button>
        </div>
        
        <div className="p-4">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <HiOutlineTemplate className="mx-auto h-12 w-12 mb-4" />
              <p>タスクテンプレートがありません。新規作成してください。</p>
              {schedules.length === 0 && (
                <p className="text-sm mt-2 text-amber-600">
                  先にスケジュール設定を作成する必要があります。
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>タイトル</th>
                    <th>スケジュール</th>
                    <th>担当者</th>
                    <th>ステータス</th>
                    <th>最終生成</th>
                    <th>アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(templates) ? templates.map(template => (
                    <tr key={template.id} className="hover">
                      <td>{template.title}</td>
                      <td>{template.schedule_name}</td>
                      <td>
                        <div>作業: {template.worker_name || '未設定'}</div>
                        <div>確認: {template.reviewer_name || '未設定'}</div>
                      </td>
                      <td>
                        <span className={`badge ${template.is_active ? 'badge-success' : 'badge-error'}`}>
                          {template.is_active ? '有効' : '無効'}
                        </span>
                      </td>
                      <td>{template.last_generated_at ? new Date(template.last_generated_at).toLocaleString('ja-JP') : '未生成'}</td>
                      <td className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingTemplate(template);
                            setShowTemplateForm(true);
                          }}
                          className="btn btn-sm btn-outline btn-info"
                        >
                          <HiOutlinePencilAlt className="mr-1" /> 編集
                        </button>
                        <button
                          onClick={() => handleGenerateTask(template.id)}
                          className="btn btn-sm btn-outline btn-success"
                        >
                          <HiOutlineCheck className="mr-1" /> タスク生成
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="btn btn-sm btn-outline btn-error"
                        >
                          <HiOutlineTrash className="mr-1" /> 削除
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-gray-500">
                        <p>テンプレートデータの読み込みに失敗しました。</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* フォームモーダル */}
      {showTemplateForm && (
        <TaskTemplateForm
          clientId={clientId}
          template={editingTemplate}
          schedules={schedules}
          onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
          onClose={() => {
            setShowTemplateForm(false);
            setEditingTemplate(null);
          }}
        />
      )}
      
      {showScheduleForm && (
        <TaskTemplateScheduleForm
          schedule={editingSchedule}
          onSubmit={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
          onClose={() => {
            setShowScheduleForm(false);
            setEditingSchedule(null);
          }}
        />
      )}
    </div>
  );
};

export default ClientTaskTemplateSettings;