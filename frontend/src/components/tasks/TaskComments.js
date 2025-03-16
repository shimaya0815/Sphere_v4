import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { tasksApi } from '../../api';
import { quillStyles } from './TaskCommentsStyles';
import TaskCommentsList from './TaskCommentsList';
import TaskCommentForm from './TaskCommentForm';

const TaskComments = ({ taskId, task, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // コメント一覧を取得
  const fetchComments = async () => {
    if (!taskId) return;
    
    setLoading(true);
    try {
      console.log(`Fetching comments for task ID: ${taskId}`);
      const data = await tasksApi.getComments(taskId);
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
      setError(null);
    } catch (error) {
      console.error(`Error fetching comments for task ${taskId}:`, error);
      setError('コメントの取得に失敗しました。ページを再読み込みしてください。');
      toast.error('コメントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  // コメント一覧を取得（初期ロード時）
  useEffect(() => {
    if (taskId) {
      fetchComments();
    } else {
      console.log('No taskId provided, skipping comment fetch');
    }
  }, [taskId]);

  // コメント削除
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('このコメントを削除してもよろしいですか？')) {
      return;
    }

    try {
      await tasksApi.deleteComment(commentId);
      toast.success('コメントが削除されました');
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('コメントの削除に失敗しました');
    }
  };
  
  // コメント追加処理
  const handleAddComment = async (commentData, formData) => {
    if (!taskId) return;
    
    // 楽観的UI更新 - 送信中のコメントを表示
    const tempComment = {
      id: `temp-${Date.now()}`,
      content: commentData.content,
      html_content: commentData.html_content,
      user_name: 'あなた', // 現在のユーザー名は後でAPIから取得
      created_at: new Date().toISOString(),
      isSending: true,
      imageUrls: commentData.imageUrls
    };
    
    // 一時的にコメントを表示（リストの最後に追加）
    setComments(prevComments => [...prevComments, tempComment]);
    
    try {
      console.log(`Sending comment to task ${taskId}`);
      
      // URLにリダイレクトされないようにパス指定を修正
      // APIでコメント追加（FormDataを使用）
      const addedComment = await tasksApi.addCommentWithFiles(taskId, formData);
      console.log('Comment added successfully:', addedComment);
      toast.success('コメントが追加されました');
      
      // 一覧を再取得（一時コメントを実際のコメントで置き換え）
      await fetchComments();
      
      // 送信完了
      setSubmitting(false);
      
      // コールバック関数があれば実行
      if (onCommentAdded && typeof onCommentAdded === 'function') {
        onCommentAdded();
      }
      
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('コメントの追加に失敗しました。もう一度お試しください。');
      
      // エラーが発生した場合、一時コメントを削除
      setComments(prevComments => prevComments.filter(comment => comment.id !== tempComment.id));
      setSubmitting(false);
    }
  };

  // ローディング表示
  if (loading && comments.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // エラー表示
  if (error && comments.length === 0) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Quillエディタ用スタイル */}
      <style>{quillStyles}</style>
      
      {/* コメント一覧 */}
      <div className="mb-6">
        <TaskCommentsList 
          comments={comments}
          loading={loading}
          error={error}
          onDeleteComment={handleDeleteComment}
          onRetry={fetchComments}
        />
      </div>

      {/* コメント入力フォーム */}
      <TaskCommentForm
        taskId={taskId}
        onCommentAdded={handleAddComment}
        submitting={submitting}
        setSubmitting={setSubmitting}
      />
    </div>
  );
};

export default TaskComments;