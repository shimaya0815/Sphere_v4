import React from 'react';
import PropTypes from 'prop-types';
import { HiUser } from 'react-icons/hi';

/**
 * 現在の担当者を表示するコンポーネント
 * @param {object} assignee 担当者オブジェクト
 * @param {function} onChange 担当者変更時のコールバック
 */
const CurrentAssignee = ({ assignee, onChange }) => {
  return (
    <div className="current-assignee">
      {assignee ? (
        <div className="assignee-info">
          <div className="assignee-avatar">
            {assignee.avatar ? (
              <img src={assignee.avatar} alt={assignee.name} />
            ) : (
              <div className="avatar-placeholder">
                <HiUser size={16} />
              </div>
            )}
          </div>
          <div className="assignee-name">{assignee.name}</div>
        </div>
      ) : (
        <div className="no-assignee">
          <HiUser size={16} />
          <span>未割り当て</span>
        </div>
      )}
      
      {onChange && (
        <button 
          type="button" 
          className="change-assignee-btn"
          onClick={onChange}
        >
          変更
        </button>
      )}
    </div>
  );
};

CurrentAssignee.propTypes = {
  assignee: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    avatar: PropTypes.string
  }),
  onChange: PropTypes.func
};

export default CurrentAssignee;