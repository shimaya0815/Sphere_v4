import React, { useState } from 'react';
import { HiOutlinePaperClip, HiOutlineEmojiHappy, HiUserCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';

/**
 * タスクコメントフォームコンポーネント
 * @param {object} props props
 * @param {Function} props.onSubmit 送信ハンドラ
 * @param {object} props.user ユーザー情報
 * @param {boolean} props.isSubmitting 送信中フラグ
 */
const TaskCommentForm = ({ onSubmit, user, isSubmitting = false }) => {
  const [comment, setComment] = useState('');
  
  // コメント送信処理
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      return;
    }
    
    // 送信ハンドラを呼び出し
    if (onSubmit) {
      onSubmit(comment);
      setComment('');
    }
  };
  
  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <div className="user-avatar">
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} />
        ) : (
          <HiUserCircle size={32} />
        )}
      </div>
      
      <div className="comment-input-container">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="コメントを入力..."
          className="comment-input"
          disabled={isSubmitting}
        />
        
        <div className="comment-actions">
          <button type="button" className="action-button">
            <HiOutlinePaperClip size={18} />
          </button>
          <button type="button" className="action-button">
            <HiOutlineEmojiHappy size={18} />
          </button>
        </div>
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={!comment.trim() || isSubmitting}
        >
          {isSubmitting ? '送信中...' : '送信'}
        </button>
      </div>
    </form>
  );
};

export default TaskCommentForm; 