import React from 'react';
import { HiOutlineTrash } from 'react-icons/hi';
import { formatDate } from './TaskCommentsUtils';

// 個別コメント表示コンポーネント
const TaskCommentItem = ({ comment, onDelete }) => {
  return (
    <div 
      className={`bg-gray-50 rounded-lg p-4 ${comment.isSending ? 'opacity-70' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">
            {comment.user_name?.[0] || 'U'}
          </div>
          <div className="ml-3">
            <div className="flex items-center">
              <p className="text-sm font-medium text-gray-900">
                {comment.user_name || 'ユーザー'}
              </p>
              {comment.isSending && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  送信中...
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {formatDate(comment.created_at)}
            </p>
          </div>
        </div>
        {!comment.isSending && (
          <button
            className="text-gray-400 hover:text-red-500"
            onClick={() => onDelete(comment.id)}
          >
            <HiOutlineTrash className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* コメント内容表示 */}
      {comment.html_content && comment.html_content !== '<p><br></p>' && comment.html_content !== '<p></p>' ? (
        <div 
          className="mt-3 text-sm text-gray-700 quill-content prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: comment.html_content }}
        />
      ) : (
        <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
          {comment.content}
        </div>
      )}
      
      {/* 画像添付がある場合 */}
      {(comment.attachments && comment.attachments.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {comment.attachments.map((attachment, index) => (
            <a 
              key={index}
              href={attachment.file} 
              target="_blank"
              rel="noopener noreferrer"
              className="block relative"
            >
              <img 
                src={attachment.file} 
                alt={`添付${index + 1}`}
                className="max-w-xs max-h-40 rounded-md shadow-sm border border-gray-200"
              />
            </a>
          ))}
        </div>
      )}
      
      {/* プレビュー用の添付画像 */}
      {comment.imageUrls && comment.imageUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {comment.imageUrls.map((url, index) => (
            <div key={index} className="relative">
              <img 
                src={url} 
                alt={`添付${index + 1}`}
                className="max-w-xs max-h-40 rounded-md shadow-sm border border-gray-200 opacity-70"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-md">
                <span className="text-white font-medium">
                  送信中...
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskCommentItem; 