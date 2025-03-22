import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineChat, HiOutlinePaperClip, HiOutlineEmojiHappy, HiUserCircle } from 'react-icons/hi';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { tasksApi } from '../../api';
import { quillStyles } from './TaskCommentsStyles';
import TaskCommentsList from '../TaskCommentsList';
import TaskCommentForm from '../TaskCommentForm';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../ui/Loader';

/**
 * タスクコメントコンポーネント
 * @param {object} props props
 * @param {number} props.taskId タスクID
 */
const TaskComments = ({ taskId, task, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const { user } = useAuth();
  
  // コメント一覧を取得
  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      console.log(`Fetching comments for task ID: ${taskId}`);
      const data = await tasksApi.getTaskComments(taskId);
      const commentsList = data.results || data;
      console.log(`Received ${commentsList.length} comments for task ${taskId}`);
      
      // データの前処理
      const processedComments = commentsList.map(comment => {
        // HTMLコンテンツの検証
        if (comment.html_content) {
          // 空のHTMLをチェック
          if (comment.html_content === '<p><br></p>' || comment.html_content === '<p></p>') {
            // コンテンツからHTMLを生成
            return {
              ...comment,
              html_content: comment.content ? `<p>${comment.content.replace(/\n/g, '</p><p>')}</p>` : null
            };
          }
        } else if (comment.content) {
          // HTMLがなく、コンテンツがある場合は変換
          return {
            ...comment,
            html_content: `<p>${comment.content.replace(/\n/g, '</p><p>')}</p>`
          };
        }
        
        return comment;
      });
      
      setComments(processedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('コメントの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);
  
  // コンポーネントマウント時とタスクID変更時にコメントを取得
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);
  
  // 新規コメント投稿
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim() || !taskId) return;
    
    try {
      // APIが実際に存在することを前提としています
      const createdComment = await tasksApi.createTaskComment(taskId, {
        content: newComment,
        task: taskId
      });
      
      // コメント一覧を更新
      setComments(prev => [createdComment, ...prev]);
      
      // 入力フィールドをクリア
      setNewComment('');
      
      // コールバック関数があれば実行
      if (onCommentAdded && typeof onCommentAdded === 'function') {
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('コメントの追加に失敗しました。もう一度お試しください。');
    }
  };
  
  // モックデータ（実際の実装では削除）
  const mockComments = [
    {
      id: 1,
      content: 'このタスクについて詳細を確認したいです。',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      user: {
        id: 1,
        name: '山田太郎',
        avatar: null
      }
    },
    {
      id: 2,
      content: '承知しました。明日までに対応します。',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      user: {
        id: 2,
        name: '佐藤次郎',
        avatar: null
      }
    }
  ];
  
  // 開発用にモックデータを使用
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && comments.length === 0 && !isLoading) {
      setComments(mockComments);
    }
  }, [comments.length, isLoading]);
  
  // コメント削除
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('このコメントを削除してもよろしいですか？')) {
      return;
    }

    try {
      await tasksApi.deleteTaskComment(commentId);
      toast.success('コメントが削除されました');
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('コメントの削除に失敗しました');
    }
  };

  // ローディング表示
  if (isLoading && comments.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="task-comments">
      {/* Quillエディタ用スタイル */}
      <style>{quillStyles}</style>
      
      {/* コメント入力フォーム */}
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
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            className="comment-input"
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
            disabled={!newComment.trim()}
          >
            送信
          </button>
        </div>
      </form>
      
      {/* コメント一覧 */}
      <div className="comments-list">
        {isLoading ? (
          <div className="comments-loading">
            <Loader size="sm" />
            <span>コメントを読み込み中...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="no-comments">
            <HiOutlineChat size={24} />
            <p>コメントはありません</p>
          </div>
        ) : (
          <TaskCommentsList 
            comments={comments}
            loading={isLoading}
            error={null}
            onDeleteComment={handleDeleteComment}
            onRetry={fetchComments}
          />
        )}
      </div>
    </div>
  );
};

export default TaskComments;