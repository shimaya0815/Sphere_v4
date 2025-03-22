import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';

/**
 * タスクステータスセレクター
 * ステータスの選択UIを提供
 * @param {string} value 現在のステータス値
 * @param {function} onChange ステータス変更時のコールバック
 * @param {Array} statuses ステータス選択肢リスト
 * @param {object} props その他のprops
 */
const StatusSelector = forwardRef(({ value = '', onChange, statuses = [], ...props }, ref) => {
  // APIから取得したstatusesがなければデフォルト値を使用する
  const statusOptions = statuses.length > 0 ? statuses : [
    { id: 1, name: '未着手', color: '#9ca3af' },
    { id: 2, name: '進行中', color: '#3b82f6' },
    { id: 3, name: 'レビュー中', color: '#8b5cf6' },
    { id: 4, name: '完了', color: '#10b981' }
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
      {statusOptions.map(status => (
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
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  statuses: PropTypes.array
};

export default StatusSelector; 