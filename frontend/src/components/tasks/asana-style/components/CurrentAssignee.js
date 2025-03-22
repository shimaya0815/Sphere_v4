import React from 'react';
import PropTypes from 'prop-types';
import { HiUser } from 'react-icons/hi';

/**
 * 現在の担当者を表示するコンポーネント
 * @param {string|number} assigneeId 担当者ID
 * @param {array} users ユーザーリスト
 * @param {string} label 表示ラベル
 * @param {node} icon アイコン
 * @param {function} onChange 担当者変更時のコールバック
 */
const CurrentAssignee = ({ assigneeId, users = [], label = "担当者", icon = <HiUser size={16} />, onChange }) => {
  // ユーザーリストから該当するユーザーを見つける
  const assignee = users.find(user => String(user.id) === String(assigneeId));
  
  // ユーザーのフルネームを取得する関数
  const getUserFullName = (user) => {
    if (!user) return '';
    
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    
    if (user.full_name) return user.full_name;
    if (user.name) return user.name;
    if (user.username) return user.username;
    if (user.email) return user.email;
    
    return `ユーザー ${user.id}`;
  };
  
  return (
    <div className="bg-gray-50 rounded p-2 flex-1">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {assignee ? (
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-2">
            {icon}
          </div>
          <div className="text-sm font-medium text-gray-900">
            {getUserFullName(assignee)}
          </div>
        </div>
      ) : (
        <div className="flex items-center text-gray-500">
          <div className="flex-shrink-0 mr-2">
            {icon}
          </div>
          <span className="text-sm">未割り当て</span>
        </div>
      )}
      
      {onChange && (
        <button 
          type="button" 
          className="mt-1 text-xs text-blue-600 hover:text-blue-800"
          onClick={onChange}
        >
          変更
        </button>
      )}
    </div>
  );
};

CurrentAssignee.propTypes = {
  assigneeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  users: PropTypes.array,
  label: PropTypes.string,
  icon: PropTypes.node,
  onChange: PropTypes.func
};

export default CurrentAssignee;