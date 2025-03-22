import React from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { HiUserCircle, HiOutlineTrash, HiOutlineRefresh, HiOutlineExclamation } from 'react-icons/hi';

/**
 * タスクコメントリストコンポーネント
 * @param {object} props props
 * @param {Array} props.comments コメント一覧
 * @param {boolean} props.loading ローディング状態
 * @param {string|null} props.error エラーメッセージ
 * @param {Function} props.onDeleteComment コメント削除ハンドラ
 * @param {Function} props.onRetry 再試行ハンドラ
 */
const TaskCommentsList = ({ 
  comments = [], 
  loading = false, 
  error = null,
  onDeleteComment,
  onRetry
}) => {
  if (loading) {
    return (
      <div className="comments-loading">
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-600"></div>
        <span>コメントを読み込み中...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="comments-error">
        <HiOutlineExclamation size={24} />
        <p>{error}</p>
        <button className="retry-button" onClick={onRetry}>
          <HiOutlineRefresh size={16} />
          <span>再試行</span>
        </button>
      </div>
    );
  }
  
  if (!comments || comments.length === 0) {
    return (
      <div className="no-comments">
        <p>コメントはありません</p>
      </div>
    );
  }
  
  return (
    <ul className="comments-list">
      {comments.map(comment => (
        <li key={comment.id} className="comment-item">
          <div className="comment-avatar">
            {comment.user?.avatar ? (
              <img src={comment.user.avatar} alt={comment.user.name} />
            ) : (
              <HiUserCircle size={40} />
            )}
          </div>
          
          <div className="comment-content">
            <div className="comment-header">
              <span className="comment-author">{comment.user?.name || '名前なし'}</span>
              <span className="comment-date">
                {comment.created_at && format(
                  new Date(comment.created_at),
                  'yyyy年MM月dd日 HH:mm',
                  { locale: ja }
                )}
              </span>
            </div>
            
            <div className="comment-body">
              {comment.html_content ? (
                <div dangerouslySetInnerHTML={{ __html: comment.html_content }} />
              ) : (
                <p>{comment.content || ''}</p>
              )}
            </div>
            
            <div className="comment-actions">
              <button
                className="delete-button"
                onClick={() => onDeleteComment && onDeleteComment(comment.id)}
                title="削除"
              >
                <HiOutlineTrash size={16} />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default TaskCommentsList; 