import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { HiOutlineClock, HiOutlineCalendar } from 'react-icons/hi';

const TaskTemplateScheduleForm = ({ schedule, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    schedule_type: 'monthly_start',
    creation_day: 1,
    deadline_day: 5,
    fiscal_date_reference: 'end_date',
    deadline_next_month: false,
    recurrence: 'monthly'
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name || '',
        schedule_type: schedule.schedule_type || 'monthly_start',
        creation_day: schedule.creation_day !== null ? schedule.creation_day : getDefaultCreationDay(schedule.schedule_type),
        deadline_day: schedule.deadline_day !== null ? schedule.deadline_day : getDefaultDeadlineDay(schedule.schedule_type),
        fiscal_date_reference: schedule.fiscal_date_reference || 'end_date',
        deadline_next_month: schedule.deadline_next_month || false,
        recurrence: schedule.recurrence || 'monthly'
      });
    }
  }, [schedule]);
  
  const getDefaultCreationDay = (scheduleType) => {
    switch (scheduleType) {
      case 'monthly_start': return 1;
      case 'monthly_end': return 25;
      case 'fiscal_relative': return -30; // 30 days before fiscal date
      default: return 1;
    }
  };
  
  const getDefaultDeadlineDay = (scheduleType) => {
    switch (scheduleType) {
      case 'monthly_start': return 5;
      case 'monthly_end': return 10;
      case 'fiscal_relative': return -10; // 10 days before fiscal date
      default: return 5;
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // If schedule_type changes, update default creation_day and deadline_day
    if (name === 'schedule_type') {
      setFormData(prev => ({
        ...prev,
        creation_day: getDefaultCreationDay(value),
        deadline_day: getDefaultDeadlineDay(value),
        [name]: value
      }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'スケジュール名は必須です';
    }
    
    if (formData.schedule_type === 'fiscal_relative' && !formData.fiscal_date_reference) {
      newErrors.fiscal_date_reference = '決算日参照タイプは必須です';
    }
    
    // Day validation
    if (formData.schedule_type === 'monthly_start' || formData.schedule_type === 'monthly_end') {
      if (
        formData.creation_day && 
        (parseInt(formData.creation_day) < 1 || parseInt(formData.creation_day) > 31)
      ) {
        newErrors.creation_day = '作成日は1〜31の間で指定してください';
      }
      
      if (
        formData.deadline_day && 
        (parseInt(formData.deadline_day) < 1 || parseInt(formData.deadline_day) > 31)
      ) {
        newErrors.deadline_day = '期限日は1〜31の間で指定してください';
      }
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
        creation_day: formData.creation_day !== '' ? parseInt(formData.creation_day) : null,
        deadline_day: formData.deadline_day !== '' ? parseInt(formData.deadline_day) : null
      };
      
      // fiscal_relativeタイプ以外の場合はfiscal_date_referenceをnullに設定
      if (formData.schedule_type !== 'fiscal_relative') {
        submissionData.fiscal_date_reference = null;
      }
      
      await onSubmit(submissionData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal
      title={
        <div className="flex items-center text-lg font-semibold">
          <HiOutlineClock className="mr-2" />
          {schedule ? 'スケジュール設定を編集' : 'スケジュール設定を作成'}
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
                <span className="label-text">スケジュール名<span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="月次作業スケジュールなど"
                className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
              />
              {errors.name && <span className="text-error text-sm mt-1">{errors.name}</span>}
            </div>
            
            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text">繰り返しタイプ</span>
              </label>
              <select
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
          </div>
          
          {/* スケジュールタイプ */}
          <div>
            <h3 className="text-md font-semibold mb-3">スケジュールタイプ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`border rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-200 
                  ${formData.schedule_type === 'monthly_start' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-300' : ''}`}
                onClick={() => handleChange({ target: { name: 'schedule_type', value: 'monthly_start' } })}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="schedule_type"
                    value="monthly_start"
                    checked={formData.schedule_type === 'monthly_start'}
                    onChange={handleChange}
                    className="radio radio-primary mr-2"
                  />
                  <span className="font-medium">月初作成・当月締め切り</span>
                </div>
                <p className="text-sm text-gray-600 ml-6">1日に生成、5日が期限</p>
              </div>
              
              <div 
                className={`border rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-200 
                  ${formData.schedule_type === 'monthly_end' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-300' : ''}`}
                onClick={() => handleChange({ target: { name: 'schedule_type', value: 'monthly_end' } })}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="schedule_type"
                    value="monthly_end"
                    checked={formData.schedule_type === 'monthly_end'}
                    onChange={handleChange}
                    className="radio radio-primary mr-2"
                  />
                  <span className="font-medium">月末作成・翌月締め切り</span>
                </div>
                <p className="text-sm text-gray-600 ml-6">25日に生成、翌月10日が期限</p>
              </div>
              
              <div 
                className={`border rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-200 
                  ${formData.schedule_type === 'fiscal_relative' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-300' : ''}`}
                onClick={() => handleChange({ target: { name: 'schedule_type', value: 'fiscal_relative' } })}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="schedule_type"
                    value="fiscal_relative"
                    checked={formData.schedule_type === 'fiscal_relative'}
                    onChange={handleChange}
                    className="radio radio-primary mr-2"
                  />
                  <span className="font-medium">決算日基準</span>
                </div>
                <p className="text-sm text-gray-600 ml-6">決算開始日・終了日からの相対日数</p>
              </div>
              
              <div 
                className={`border rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-200 
                  ${formData.schedule_type === 'custom' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-300' : ''}`}
                onClick={() => handleChange({ target: { name: 'schedule_type', value: 'custom' } })}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="schedule_type"
                    value="custom"
                    checked={formData.schedule_type === 'custom'}
                    onChange={handleChange}
                    className="radio radio-primary mr-2"
                  />
                  <span className="font-medium">カスタム設定</span>
                </div>
                <p className="text-sm text-gray-600 ml-6">自由に日付を設定</p>
              </div>
            </div>
          </div>
          
          {/* スケジュール詳細設定 - 条件によって表示切替 */}
          {['monthly_start', 'monthly_end'].includes(formData.schedule_type) && (
            <div>
              <h3 className="text-md font-semibold mb-3">日付設定</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">タスク作成日（日）</span>
                  </label>
                  <input
                    type="number"
                    name="creation_day"
                    value={formData.creation_day}
                    onChange={handleChange}
                    min="1"
                    max="31"
                    className={`input input-bordered w-full ${errors.creation_day ? 'input-error' : ''}`}
                  />
                  {errors.creation_day && <span className="text-error text-sm mt-1">{errors.creation_day}</span>}
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">タスク期限日（日）</span>
                  </label>
                  <input
                    type="number"
                    name="deadline_day"
                    value={formData.deadline_day}
                    onChange={handleChange}
                    min="1"
                    max="31"
                    className={`input input-bordered w-full ${errors.deadline_day ? 'input-error' : ''}`}
                  />
                  {errors.deadline_day && <span className="text-error text-sm mt-1">{errors.deadline_day}</span>}
                </div>
              </div>
              
              {formData.schedule_type === 'monthly_end' && (
                <div className="form-control mt-3">
                  <label className="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      name="deadline_next_month"
                      checked={formData.deadline_next_month}
                      onChange={handleChange}
                      className="checkbox checkbox-primary"
                    />
                    <span className="label-text">期限日は翌月とする</span>
                  </label>
                </div>
              )}
            </div>
          )}
          
          {formData.schedule_type === 'fiscal_relative' && (
            <div>
              <h3 className="text-md font-semibold mb-3">決算日設定</h3>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">基準日<span className="text-red-500">*</span></span>
                </label>
                <select
                  name="fiscal_date_reference"
                  value={formData.fiscal_date_reference}
                  onChange={handleChange}
                  className={`select select-bordered w-full ${errors.fiscal_date_reference ? 'select-error' : ''}`}
                >
                  <option value="start_date">決算開始日基準</option>
                  <option value="end_date">決算終了日基準</option>
                </select>
                {errors.fiscal_date_reference && <span className="text-error text-sm mt-1">{errors.fiscal_date_reference}</span>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">タスク作成日（相対日数）</span>
                  </label>
                  <input
                    type="number"
                    name="creation_day"
                    value={formData.creation_day}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                  />
                  <span className="text-sm text-gray-500 mt-1">
                    ※負の値は基準日前、正の値は基準日後の日数
                  </span>
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">タスク期限日（相対日数）</span>
                  </label>
                  <input
                    type="number"
                    name="deadline_day"
                    value={formData.deadline_day}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                  />
                  <span className="text-sm text-gray-500 mt-1">
                    ※負の値は基準日前、正の値は基準日後の日数
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {formData.schedule_type === 'custom' && (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
              <p>カスタム設定は将来のリリースで提供予定です。現在は他のスケジュールタイプをご利用ください。</p>
            </div>
          )}
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
            ) : schedule ? '更新' : '作成'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskTemplateScheduleForm;