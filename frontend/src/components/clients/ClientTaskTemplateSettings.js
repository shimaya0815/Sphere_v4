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
  const [availableTemplates, setAvailableTemplates] = useState([]);
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
      const [templatesData, schedulesData, availableTemplatesData] = await Promise.all([
        clientsApi.getClientTaskTemplates(clientId),
        clientsApi.getTaskTemplateSchedules(),
        fetch('/api/tasks/templates/?limit=100').then(res => res.json())
      ]);
      
      // 配列かどうかを確認してから設定
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      
      // 利用可能なテンプレートを設定
      if (availableTemplatesData && availableTemplatesData.results && Array.isArray(availableTemplatesData.results)) {
        setAvailableTemplates(availableTemplatesData.results);
      } else if (Array.isArray(availableTemplatesData)) {
        setAvailableTemplates(availableTemplatesData);
      } else {
        setAvailableTemplates([]);
      }
      
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
      console.log('Generating task from template:', templateId);
      
      // テンプレート情報を取得
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        toast.error('テンプレートが見つかりません');
        return null;
      }
      
      try {
        const task = await clientsApi.generateTaskFromTemplate(templateId);
        toast.success('タスクを生成しました');
        return task;
      } catch (error) {
        console.error('Error generating task:', error);
        
        // 400エラーの場合はスケジュールがない場合など
        if (error.response && error.response.status === 400) {
          // スケジュールが設定されていない場合などは、今日の日付で強制的に作成するなどの対処
          toast.warning('スケジュール設定なしでタスクを生成します');
          
          // APIから直接タスクを作成するための別のAPIを呼び出す
          // このAPIは既存のものを利用するか、必要に応じて新しく作成する
          try {
            const templateDetails = await clientsApi.getClientTaskTemplate(templateId);
            const taskData = {
              title: templateDetails.title,
              description: templateDetails.description || '',
              client: client.id,
              template_id: templateDetails.template_task,
              due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 一週間後
              worker: templateDetails.worker,
              reviewer: templateDetails.reviewer,
              is_template: false
            };
            
            // タスク作成APIを呼び出す
            const newTask = await fetch('/tasks/tasks/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(taskData)
            }).then(res => res.json());
            
            toast.success('タスクを手動で生成しました');
            return newTask;
          } catch (innerError) {
            console.error('Error creating task manually:', innerError);
            toast.error('タスクの手動生成に失敗しました');
            return null;
          }
        } else {
          toast.error('タスクの生成に失敗しました');
          return null;
        }
      }
    } catch (error) {
      console.error('Error in handleGenerateTask:', error);
      toast.error('タスク生成処理中にエラーが発生しました');
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

  // 選択されたテンプレートをクライアントに追加する関数
  const handleAddTemplate = async (templateId) => {
    try {
      const templateToAdd = availableTemplates.find(t => t.id === templateId);
      if (!templateToAdd) {
        toast.error('テンプレートが見つかりません');
        return;
      }
      
      // スケジュールが必要なため、一番シンプルなスケジュールをダミーで設定するか既存のものを使う
      let scheduleId = null;
      if (schedules.length > 0) {
        scheduleId = schedules[0].id;
      }
      
      const templateData = {
        title: templateToAdd.title,
        description: templateToAdd.description || '',
        template_task: templateId,
        is_active: true
      };
      
      // スケジュールがある場合のみ設定する
      if (scheduleId) {
        templateData.schedule = scheduleId;
      }
      
      try {
        await clientsApi.createClientTaskTemplate(clientId, templateData);
        toast.success('タスクテンプレートを追加しました');
        fetchData();
      } catch (error) {
        console.error('Error creating template:', error);
        
        // エラーレスポンスの詳細を表示
        if (error.response && error.response.data) {
          const errors = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          toast.error(`テンプレート追加エラー: ${errors}`);
        } else {
          toast.error('テンプレートの追加に失敗しました');
        }
      }
    } catch (error) {
      console.error('Error in handleAddTemplate:', error);
      toast.error('テンプレートの追加処理中にエラーが発生しました');
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
      
      {/* テンプレート設定セクション */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <HiOutlineTemplate className="mr-2" /> タスクテンプレート設定
          </h2>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowTemplateForm(true);
            }}
            className="btn btn-sm btn-ghost bg-white bg-opacity-20 text-white"
          >
            <HiOutlinePlusCircle className="mr-1" /> 新規テンプレート
          </button>
        </div>
        
        <div className="p-4">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <HiOutlineTemplate className="mx-auto h-12 w-12 mb-4" />
              <p>登録されたテンプレートはありません。下のセクションから追加してください。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(templates) ? templates.map(template => (
                <div 
                  key={template.id} 
                  className="border rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-blue-700">{template.title}</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowTemplateForm(true);
                        }}
                        className="btn btn-xs btn-outline btn-info"
                      >
                        <HiOutlinePencilAlt className="mr-1" /> 編集
                      </button>
                      <button
                        onClick={() => handleGenerateTask(template.id)}
                        className="btn btn-xs btn-outline btn-success"
                      >
                        <HiOutlineCheck className="mr-1" /> タスク生成
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="btn btn-xs btn-outline btn-error"
                      >
                        <HiOutlineTrash className="mr-1" /> 削除
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    {template.description || 'テンプレートの説明はありません'}
                  </div>
                  {template.category && (
                    <div className="text-xs mt-2">
                      <span 
                        className="px-2 py-1 rounded-full" 
                        style={{
                          backgroundColor: template.category.color || '#3B82F6',
                          color: 'white'
                        }}
                      >
                        {template.category.name}
                      </span>
                    </div>
                  )}
                </div>
              )) : (
                <div className="col-span-3 text-center py-4 text-gray-500">
                  <p>テンプレートデータの読み込みに失敗しました。</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 利用可能なテンプレート一覧 - 新規追加 */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <h2 className="text-xl font-semibold flex items-center">
            <HiOutlineTemplate className="mr-2" /> 利用可能なテンプレート
          </h2>
          <p className="text-sm mt-1 text-white text-opacity-80">
            以下のテンプレートからクライアントに適用するものを選択してください
          </p>
        </div>
        
        <div className="p-4">
          {availableTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>利用可能なテンプレートがありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTemplates.map(template => (
                <div 
                  key={template.id} 
                  className="border rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-green-700">{template.title}</h3>
                    <button
                      onClick={() => handleAddTemplate(template.id)}
                      className="btn btn-xs btn-outline btn-success"
                    >
                      追加
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    {template.description || 'テンプレートの説明はありません'}
                  </div>
                  {template.category && (
                    <div className="text-xs mt-2">
                      <span 
                        className="px-2 py-1 rounded-full" 
                        style={{
                          backgroundColor: template.category.color || '#3B82F6',
                          color: 'white'
                        }}
                      >
                        {template.category.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
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