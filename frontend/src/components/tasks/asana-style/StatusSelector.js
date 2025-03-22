import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';

/**
 * タスクステータスセレクター
 * ステータスの選択UIを提供
 * @param {string} value 現在のステータス値
 * @param {function} onChange ステータス変更時のコールバック
 * @param {object} props その他のprops
 */
const StatusSelector = forwardRef(({ value = 'todo', onChange, ...props }, ref) => {
  // ステータスの選択肢
  const statuses = [
    { id: 'todo', name: '未着手', color: '#9ca3af' },
    { id: 'in_progress', name: '進行中', color: '#3b82f6' },
    { id: 'review', name: 'レビュー中', color: '#8b5cf6' },
    { id: 'done', name: '完了', color: '#10b981' }
  ];
  
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };
  
  return (
    <select
      ref={ref}
      value={value}
      onChange={handleChange}
      className="status-selector"
      {...props}
    >
      {statuses.map(status => (
        <option
          key={status.id}
          value={status.id}
          style={{ backgroundColor: status.color + '20' }}
        >
          {status.name}
        </option>
      ))}
    </select>
  );
});

StatusSelector.displayName = 'StatusSelector';

StatusSelector.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func
};

export default StatusSelector; 