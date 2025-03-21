import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getCategories, 
  getPriorities, 
  getStatuses, 
  getTask, 
  createTask, 
  updateTask
} from '../../api/tasks';
import toast from 'react-hot-toast';
import { 
  HiOutlineDocumentText,
  HiOutlineUser,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineOfficeBuilding
} from 'react-icons/hi';

// スケジュール取得用の関数
const getSchedules = async () => {
  try {
    console.log('Fetching schedules directly...');
    const response = await fetch('/api/tasks/schedules/');
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    
    // DRFのページネーション形式（results配列を含むオブジェクト）に対応
    if (data && data.results && Array.isArray(data.results)) {
      return data.results;
    }
    
    // 直接配列の場合
    if (Array.isArray(data)) {
      return data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }
};

const TaskTemplateForm = ({ templateId = null, templateData = null, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(templateId && !templateData ? true : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  // 初期データをセット
  const initialData = templateData ? {
    ...templateData,
    category: templateData.category?.id || null,
    priority: templateData.priority?.id || null,
    status: templateData.status?.id || null,
    workspace: templateData.workspace?.id || null,
    is_template: true,
    // スケジュール関連のフィールド
    schedule_type: templateData.schedule_type || 'monthly_start',
    recurrence: templateData.recurrence || 'monthly',
    creation_day: templateData.creation_day || '',
    deadline_day: templateData.deadline_day || '',
    deadline_next_month: templateData.deadline_next_month || false,
    fiscal_date_reference: templateData.fiscal_date_reference || 'end_date',
    creation_date_offset: templateData.creation_date_offset || 0,
    deadline_date_offset: templateData.deadline_date_offset || 5,
    reference_date_type: templateData.reference_date_type || 'execution_date'
  } : {
    title: '',
    description: '',
    category: null,
    priority: null,
    status: null,
    workspace: null,
    estimated_hours: '',
    template_name: '',
    is_template: true,
    // スケジュール関連のフィールド
    schedule: null,
    schedule_type: 'monthly_start',
    recurrence: 'monthly',
    creation_day: '',
    deadline_day: '',
    deadline_next_month: false,
    fiscal_date_reference: 'end_date',
    // カスタム設定用のフィールド
    creation_date_offset: 0,
    deadline_date_offset: 5,
    reference_date_type: 'execution_date'
  };
  
  const [formData, setFormData] = useState(initialData);
  
  useEffect(() => {
    console.log('TaskTemplateForm initialized with:', { templateId, templateData });
    
    // 直接渡されたテンプレートデータがない場合のみAPIから取得
    if (templateId && !templateData) {
      fetchTemplateData();
    } else if (templateData) {
      console.log('Using provided template data');
      setLoading(false);
    }
    
    // 参照データを取得
    fetchReferenceData();
  }, [templateId, templateData]);
  
  const fetchTemplateData = async () => {
    try {
      console.log('Fetching template data for ID:', templateId);
      const data = await getTask(templateId);
      console.log('Template data received:', data);
      
      // スケジュール情報をテンプレートから取得
      let scheduleData = {};
      if (data.schedule) {
        try {
          console.log('Fetching schedule data for schedule ID:', data.schedule);
          const scheduleResponse = await getSchedules();
          console.log('Schedule response:', scheduleResponse);
          
          const matchingSchedule = scheduleResponse.find(s => s.id === data.schedule);
          
          if (matchingSchedule) {
            console.log('Found matching schedule:', matchingSchedule);
            scheduleData = {
              schedule: matchingSchedule.id,
              schedule_type: matchingSchedule.schedule_type || 'monthly_start',
              recurrence: matchingSchedule.recurrence || 'monthly',
              creation_day: matchingSchedule.creation_day || '',
              deadline_day: matchingSchedule.deadline_day || '',
              deadline_next_month: matchingSchedule.deadline_next_month || false,
              fiscal_date_reference: matchingSchedule.fiscal_date_reference || 'end_date',
              creation_date_offset: matchingSchedule.creation_date_offset || 0,
              deadline_date_offset: matchingSchedule.deadline_date_offset || 5,
              reference_date_type: matchingSchedule.reference_date_type || 'execution_date'
            };
          } else {
            console.warn('No matching schedule found for ID:', data.schedule);
          }
        } catch (scheduleError) {
          console.error('Error fetching schedule data:', scheduleError);
        }
      }
      
      console.log('Setting form data with:', {
        ...data,
        category: data.category?.id || null,
        priority: data.priority?.id || null,
        status: data.status?.id || null,
        workspace: data.workspace?.id || null,
        ...scheduleData
      });
      
      setFormData({
        ...data,
        category: data.category?.id || null,
        priority: data.priority?.id || null,
        status: data.status?.id || null,
        workspace: data.workspace?.id || null,
        ...scheduleData
      });
      
      setError(null);
    } catch (error) {
      console.error('Error fetching template:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError('テンプレートの取得に失敗しました');
      toast.error('テンプレートの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchReferenceData = async () => {
    try {
      console.log('Fetching reference data...');
      
      // Load categories, priorities, statuses, schedules in parallel
      const [categoriesData, prioritiesData, statusesData, schedulesData] = await Promise.all([
        getCategories(),
        getPriorities(),
        getStatuses(),
        getSchedules(),
      ]);
      
      console.log('Reference data received:', { 
        categories: categoriesData, 
        priorities: prioritiesData,
        statuses: statusesData,
        schedules: schedulesData
      });
      
      // DRFのページネーション形式（results配列を含むオブジェクト）に対応
      const processData = (data) => {
        if (!data) return [];
        
        if (Array.isArray(data)) {
          return data;
        }
        
        if (data.results && Array.isArray(data.results)) {
          return data.results;
        }
        
        return [];
      };
      
      const processedCategories = processData(categoriesData);
      const processedPriorities = processData(prioritiesData);
      const processedStatuses = processData(statusesData);
      const processedSchedules = processData(schedulesData);
      
      console.log('Processed reference data:', { 
        categories: processedCategories, 
        priorities: processedPriorities,
        statuses: processedStatuses,
        schedules: processedSchedules
      });
      
      setCategories(processedCategories);
      setPriorities(processedPriorities);
      setStatuses(processedStatuses);
      setSchedules(processedSchedules);
      
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
  
  // スケジュールを作成または更新する関数
  const createOrUpdateSchedule = async (scheduleId, scheduleData) => {
    try {
      if (scheduleId) {
        // 既存スケジュールを更新
        console.log('Updating schedule:', scheduleId, scheduleData);
        const response = await fetch(`/api/tasks/schedules/${scheduleId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(scheduleData),
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } else {
        // 新規スケジュール作成
        console.log('Creating new schedule:', scheduleData);
        const response = await fetch('/api/tasks/schedules/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(scheduleData),
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      }
    } catch (error) {
      console.error('Error with schedule:', error);
      throw error;
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
      // スケジュールデータの準備
      let scheduleId = formData.schedule;
      let scheduleData = null;
      
      if (formData.schedule_type !== 'none') {
        scheduleData = {
          name: `${formData.template_name || formData.title}のスケジュール`,
          schedule_type: formData.schedule_type,
          recurrence: formData.recurrence || 'monthly',
          // 月初/月末パターン用
          creation_day: formData.creation_day,
          deadline_day: formData.deadline_day,
          deadline_next_month: formData.deadline_next_month,
          // 決算日基準用
          fiscal_date_reference: formData.fiscal_date_reference,
          // カスタム設定用
          reference_date_type: formData.reference_date_type,
          creation_date_offset: formData.creation_date_offset,
          deadline_date_offset: formData.deadline_date_offset
        };
        
        // 既存のスケジュールを更新するか、新規作成するか
        if (scheduleId) {
          const updatedSchedule = await createOrUpdateSchedule(scheduleId, scheduleData);
          scheduleId = updatedSchedule.id;
        } else {
          // 新規スケジュール作成
          const newSchedule = await createOrUpdateSchedule(null, scheduleData);
          scheduleId = newSchedule.id;
        }
      }
      
      // テンプレートタスクの保存/更新
      const taskData = {
        ...formData,
        is_template: true, // 明示的にテンプレートフラグを設定
        schedule: scheduleId
      };
      
      if (templateId) {
        // 既存テンプレート更新
        await updateTask(templateId, taskData);
        toast.success('テンプレートを更新しました');
      } else {
        // 新規テンプレート作成
        await createTask(taskData);
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
      
      <div className="grid grid-cols-1 gap-6">
        {/* テンプレート名 */}
        <div>
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
        <div>
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
        <div>
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