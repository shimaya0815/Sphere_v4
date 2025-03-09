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
  const [schedules, setSchedules] = useState([]);
  
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
    // スケジュール関連のフィールド
    schedule: null,
    schedule_type: 'monthly_start',
    recurrence: 'monthly',
    creation_day: '',
    deadline_day: '',
    deadline_next_month: false,
    fiscal_date_reference: 'end_date',
    // 追加: カスタム設定用のフィールド
    creation_date_offset: 0,  // 基準日からの作成日オフセット（日数）
    deadline_date_offset: 5,  // 作成日からの期日オフセット（日数）
    reference_date_type: 'execution_date' // 基準日タイプ（実行日/決算日/当月初日/当月末日）
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
      
      // スケジュール情報をテンプレートから取得
      let scheduleData = {};
      if (data.schedule) {
        try {
          const scheduleResponse = await tasksApi.getTemplateSchedules();
          const matchingSchedule = scheduleResponse.find(s => s.id === data.schedule);
          
          if (matchingSchedule) {
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
          }
        } catch (scheduleError) {
          console.error('Error fetching schedule data:', scheduleError);
        }
      }
      
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
      setError('テンプレートの取得に失敗しました');
      toast.error('テンプレートの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchReferenceData = async () => {
    try {
      // Load categories, priorities, statuses, schedules in parallel
      const [categoriesData, prioritiesData, statusesData, schedulesData] = await Promise.all([
        tasksApi.getCategories(),
        tasksApi.getPriorities(),
        tasksApi.getStatuses(),
        tasksApi.getTemplateSchedules(),
      ]);
      
      setCategories(categoriesData);
      setPriorities(prioritiesData);
      setStatuses(statusesData);
      setSchedules(schedulesData);
      
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
      // スケジュール情報を保存または更新
      let scheduleId = formData.schedule;
      const scheduleData = {
        name: `${formData.template_name}のスケジュール`,
        schedule_type: formData.schedule_type,
        recurrence: formData.recurrence,
        creation_day: formData.creation_day,
        deadline_day: formData.deadline_day,
        deadline_next_month: formData.deadline_next_month,
        fiscal_date_reference: formData.fiscal_date_reference,
        creation_date_offset: formData.creation_date_offset,
        deadline_date_offset: formData.deadline_date_offset,
        reference_date_type: formData.reference_date_type
      };
      
      // 既存のスケジュールを更新するか、新規作成するか
      if (scheduleId) {
        await tasksApi.updateTemplateSchedule(scheduleId, scheduleData);
      } else {
        // 新規スケジュール作成
        const newSchedule = await tasksApi.createDefaultTemplateSchedule(scheduleData);
        scheduleId = newSchedule.id;
      }
      
      // テンプレートタスクの保存/更新
      const taskData = {
        ...formData,
        is_template: true, // 明示的にテンプレートフラグを設定
        schedule: scheduleId
      };
      
      if (templateId) {
        // 既存テンプレート更新
        await tasksApi.updateTask(templateId, taskData);
        toast.success('テンプレートを更新しました');
      } else {
        // 新規テンプレート作成
        await tasksApi.createTask(taskData);
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
        
        {/* スケジュール設定セクション */}
        <div className="col-span-2">
          <h3 className="text-lg font-medium text-gray-700 mb-3">スケジュール設定</h3>
          
          {/* スケジュールタイプ選択 */}
          <div className="mb-4">
            <label htmlFor="schedule_type" className="block text-sm font-medium text-gray-700 mb-1">
              スケジュールタイプ
            </label>
            <select
              id="schedule_type"
              name="schedule_type"
              value={formData.schedule_type}
              onChange={handleChange}
              className="select select-bordered w-full"
            >
              <option value="monthly_start">月初作成・当月締め切り</option>
              <option value="monthly_end">月末作成・翌月締め切り</option>
              <option value="fiscal_relative">決算日基準</option>
              <option value="custom">カスタム設定</option>
            </select>
          </div>
          
          {/* 共通スケジュール設定 */}
          <div className="mb-4">
            <label htmlFor="recurrence" className="block text-sm font-medium text-gray-700 mb-1">
              繰り返し
            </label>
            <select
              id="recurrence"
              name="recurrence"
              value={formData.recurrence}
              onChange={handleChange}
              className="select select-bordered w-full"
            >
              <option value="monthly">毎月</option>
              <option value="quarterly">四半期ごと</option>
              <option value="yearly">毎年</option>
              <option value="once">一度のみ</option>
            </select>
          </div>
          
          {/* スケジュールタイプに応じた設定フィールド */}
          {formData.schedule_type === 'monthly_start' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="creation_day" className="block text-sm font-medium text-gray-700 mb-1">
                  作成日（毎月の日）
                </label>
                <input
                  type="number"
                  id="creation_day"
                  name="creation_day"
                  value={formData.creation_day || 1}
                  onChange={handleChange}
                  min="1"
                  max="28"
                  className="input input-bordered w-full"
                />
                <p className="mt-1 text-xs text-gray-500">1〜28日の間で指定</p>
              </div>
              <div>
                <label htmlFor="deadline_day" className="block text-sm font-medium text-gray-700 mb-1">
                  期限日（毎月の日）
                </label>
                <input
                  type="number"
                  id="deadline_day"
                  name="deadline_day"
                  value={formData.deadline_day || 5}
                  onChange={handleChange}
                  min="1"
                  max="31"
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          )}
          
          {formData.schedule_type === 'monthly_end' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="creation_day" className="block text-sm font-medium text-gray-700 mb-1">
                  作成日（月末から逆算した日）
                </label>
                <input
                  type="number"
                  id="creation_day"
                  name="creation_day"
                  value={formData.creation_day || 5}
                  onChange={handleChange}
                  min="1"
                  max="15"
                  className="input input-bordered w-full"
                />
                <p className="mt-1 text-xs text-gray-500">例: 5は「月末5日前」を意味します</p>
              </div>
              <div>
                <label htmlFor="deadline_day" className="block text-sm font-medium text-gray-700 mb-1">
                  期限日（翌月の日）
                </label>
                <input
                  type="number"
                  id="deadline_day"
                  name="deadline_day"
                  value={formData.deadline_day || 10}
                  onChange={handleChange}
                  min="1"
                  max="28"
                  className="input input-bordered w-full"
                />
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">翌月の日付を使用</span>
                    <input
                      type="checkbox"
                      name="deadline_next_month"
                      checked={formData.deadline_next_month}
                      onChange={(e) => setFormData({...formData, deadline_next_month: e.target.checked})}
                      className="checkbox checkbox-sm"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {formData.schedule_type === 'fiscal_relative' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fiscal_date_reference" className="block text-sm font-medium text-gray-700 mb-1">
                  決算日基準
                </label>
                <select
                  id="fiscal_date_reference"
                  name="fiscal_date_reference"
                  value={formData.fiscal_date_reference}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="start_date">決算期開始日</option>
                  <option value="end_date">決算期終了日</option>
                </select>
              </div>
              <div>
                <label htmlFor="deadline_day" className="block text-sm font-medium text-gray-700 mb-1">
                  基準日からの日数（期限）
                </label>
                <input
                  type="number"
                  id="deadline_day"
                  name="deadline_day"
                  value={formData.deadline_day || 30}
                  onChange={handleChange}
                  min="1"
                  max="90"
                  className="input input-bordered w-full"
                />
                <p className="mt-1 text-xs text-gray-500">基準日から何日後を期限とするか</p>
              </div>
            </div>
          )}
          
          {formData.schedule_type === 'custom' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="reference_date_type" className="block text-sm font-medium text-gray-700 mb-1">
                  基準日タイプ
                </label>
                <select
                  id="reference_date_type"
                  name="reference_date_type"
                  value={formData.reference_date_type}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="execution_date">実行日（バッチ処理実行日）</option>
                  <option value="fiscal_start">決算期開始日</option>
                  <option value="fiscal_end">決算期終了日</option>
                  <option value="month_start">当月初日</option>
                  <option value="month_end">当月末日</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="creation_date_offset" className="block text-sm font-medium text-gray-700 mb-1">
                    作成日オフセット（日数）
                  </label>
                  <input
                    type="number"
                    id="creation_date_offset"
                    name="creation_date_offset"
                    value={formData.creation_date_offset}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="基準日からの日数"
                  />
                  <p className="mt-1 text-xs text-gray-500">基準日から何日後に作成するか（0=当日）</p>
                </div>
                
                <div>
                  <label htmlFor="deadline_date_offset" className="block text-sm font-medium text-gray-700 mb-1">
                    期限日オフセット（日数）
                  </label>
                  <input
                    type="number"
                    id="deadline_date_offset"
                    name="deadline_date_offset"
                    value={formData.deadline_date_offset}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="作成日からの日数"
                  />
                  <p className="mt-1 text-xs text-gray-500">作成日から何日後を期限とするか</p>
                </div>
              </div>
            </div>
          )}
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
                {priority.priority_value || '未設定'}
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