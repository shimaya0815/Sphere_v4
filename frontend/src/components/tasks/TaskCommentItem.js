import React from 'react';
import { formatDate } from './TaskCommentsUtils';
import { HiOutlinePaperClip } from 'react-icons/hi';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';
import tasksApi from '../../api/tasks';
import { useAuth } from '../../context/AuthContext';

// インラインスタイル
const styles = {
  commentImage: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '4px',
    margin: '10px 0',
    height: 'auto',
    objectFit: 'contain'
  }
};

// 個別コメント表示コンポーネント
const TaskCommentItem = ({ comment, onDelete }) => {
  // 認証コンテキストからユーザー情報を取得
  const { currentUser } = useAuth();

  // ユーザー名を取得する関数
  const getUserName = () => {
    return comment.user_name || '不明なユーザー';
  };
  
  // ユーザーのイニシャルを取得
  const getUserInitials = () => {
    if (!comment.user_name) return 'U';
    return comment.user_name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // タスクコメントの削除処理
  const handleDelete = async () => {
    if (window.confirm('このコメントを削除してもよろしいですか？')) {
      try {
        await tasksApi.deleteComment(comment.id);
        toast.success('コメントが削除されました');
        if (onDelete) onDelete(comment.id);
      } catch (error) {
        console.error('コメント削除エラー:', error);
        toast.error('コメントの削除中にエラーが発生しました');
      }
    }
  };
  
  // HTML内容が存在する場合は、それを使用、そうでなければプレーンテキストをフォールバックとして使用
  const renderContent = () => {
    if (comment.html_content) {
      // dangerouslySetInnerHTMLを使用してHTMLコンテンツを表示
      // DOMPurifyを使用してサニタイズする
      const sanitizedHTML = DOMPurify.sanitize(comment.html_content);
      return (
        <div 
          className="comment-html-content"
          dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
          ref={ref => {
            // コンテンツがレンダリングされた後に画像スタイルを調整
            if (ref) {
              const imgElements = ref.querySelectorAll('img');
              if (imgElements.length > 0) {
                imgElements.forEach(img => {
                  // スタイルを適用
                  img.style.maxWidth = '100%';
                  img.style.maxHeight = '400px';
                  img.style.borderRadius = '4px';
                  img.style.margin = '10px 0';
                  img.style.height = 'auto';
                  img.style.objectFit = 'contain';
                });
              }
            }
          }}
        />
      );
    } else {
      // プレーンテキストフォールバック
      return <div className="comment-content">{comment.content}</div>;
    }
  };

  return (
    <div className="border-b border-gray-200 py-4 last:border-b-0">
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
            {/* ユーザーイニシャル表示 */}
            {getUserInitials()}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{getUserName()}</h4>
            <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
          </div>
          
          {/* コンテンツ表示 */}
          <div className="mt-1">
            {renderContent()}
          </div>
          
          {/* 添付ファイル表示 */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-2">
              <h5 className="text-xs font-medium mb-1">添付ファイル:</h5>
              <div className="flex flex-wrap gap-2">
                {comment.attachments.map(attachment => (
                  <a
                    key={attachment.id}
                    href={attachment.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center"
                  >
                    <HiOutlinePaperClip className="mr-1" size={14} />
                    {attachment.filename || '添付ファイル'}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {/* コメント削除ボタン */}
          <div className="mt-2 flex justify-end">
            {comment.user === currentUser?.id && (
              <button
                onClick={handleDelete}
                className="text-xs text-red-600 hover:text-red-800"
              >
                削除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCommentItem; 