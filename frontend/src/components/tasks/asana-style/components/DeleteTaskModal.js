import React from 'react';
import PropTypes from 'prop-types';
import { HiExclamation } from 'react-icons/hi';

/**
 * タスク削除確認モーダル
 * @param {boolean} isOpen モーダルが開いているかどうか
 * @param {function} onClose モーダルを閉じる際のコールバック
 * @param {function} onConfirm 削除確定時のコールバック
 * @param {object} task 削除対象のタスク
 */
const DeleteTaskModal = ({ isOpen, onClose, onConfirm, task }) => {
  if (!isOpen) return null;

  return (
    <div className="delete-task-modal-overlay">
      <div className="delete-task-modal">
        <div className="modal-header">
          <HiExclamation size={24} className="warning-icon" />
          <h2>タスクを削除しますか？</h2>
        </div>
        
        <div className="modal-body">
          <p>
            タスク「{task?.title || 'このタスク'}」を削除します。この操作は元に戻せません。
          </p>
        </div>
        
        <div className="modal-footer">
          <button 
            type="button" 
            className="cancel-btn"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button 
            type="button" 
            className="delete-btn"
            onClick={() => {
              onConfirm(task?.id);
              onClose();
            }}
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
};

DeleteTaskModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  task: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string
  })
};

export default DeleteTaskModal;