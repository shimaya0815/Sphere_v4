import React from 'react';
import { HiPencilAlt, HiOutlineTrash, HiOutlineClock, HiOutlineClipboardCheck } from 'react-icons/hi';

const TaskTemplateCard = ({ template, onEdit, onDelete, onCreateTask }) => {
  // Deadline type display
  const getDeadlineTypeDisplay = (type) => {
    const types = {
      'business_days': '営業日',
      'calendar_days': 'カレンダー日付',
      'fiscal_date': '決算日基準'
    };
    return types[type] || type;
  };
  
  // Calculate due date description
  const getDueDateDescription = () => {
    if (template.deadline_type === 'business_days') {
      return `${template.deadline_value} 営業日後`;
    } else if (template.deadline_type === 'calendar_days') {
      return `${template.deadline_value} 日後`;
    } else if (template.deadline_type === 'fiscal_date') {
      if (template.deadline_value > 0) {
        return `決算日 ${template.deadline_value} 日後`;
      } else if (template.deadline_value < 0) {
        return `決算日 ${Math.abs(template.deadline_value)} 日前`;
      } else {
        return '決算日当日';
      }
    }
    return '';
  };
  
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${!template.is_active ? 'opacity-60' : ''}`}>
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <HiOutlineClock className="mr-2" /> 
          {template.title}
        </h3>
        <div className="flex items-center">
          {template.is_active ? (
            <span className="badge badge-success mr-3">有効</span>
          ) : (
            <span className="badge badge-ghost mr-3">無効</span>
          )}
          <div className="flex space-x-2">
            <button 
              className="btn btn-ghost btn-xs"
              onClick={onEdit}
            >
              <HiPencilAlt />
            </button>
            <button 
              className="btn btn-ghost btn-xs text-red-500"
              onClick={onDelete}
            >
              <HiOutlineTrash />
            </button>
            {template.is_active && (
              <button 
                className="btn btn-ghost btn-xs text-green-500"
                onClick={onCreateTask}
                title="このテンプレートからタスクを作成"
              >
                <HiOutlineClipboardCheck />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="p-4">
        <table className="w-full">
          <tbody>
            {template.description && (
              <tr>
                <td className="py-2 text-sm font-medium text-gray-500 w-1/3">説明</td>
                <td className="py-2 text-sm">{template.description}</td>
              </tr>
            )}
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500 w-1/3">期限設定</td>
              <td className="py-2 text-sm">
                {getDeadlineTypeDisplay(template.deadline_type)}: {getDueDateDescription()}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">作業担当者</td>
              <td className="py-2 text-sm">{template.worker_name || '未設定'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">レビュー担当者</td>
              <td className="py-2 text-sm">{template.reviewer_name || '未設定'}</td>
            </tr>
            {template.category_name && (
              <tr>
                <td className="py-2 text-sm font-medium text-gray-500">カテゴリ</td>
                <td className="py-2 text-sm">{template.category_name}</td>
              </tr>
            )}
            {template.priority_value && (
              <tr>
                <td className="py-2 text-sm font-medium text-gray-500">優先度</td>
                <td className="py-2 text-sm">{template.priority_value}</td>
              </tr>
            )}
            {template.estimated_hours && (
              <tr>
                <td className="py-2 text-sm font-medium text-gray-500">見積工数</td>
                <td className="py-2 text-sm">{template.estimated_hours} 時間</td>
              </tr>
            )}
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">元テンプレート</td>
              <td className="py-2 text-sm">{template.template_name || '独自作成'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskTemplateCard;