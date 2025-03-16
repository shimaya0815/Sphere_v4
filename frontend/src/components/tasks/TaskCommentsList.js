import React from 'react';
import TaskCommentItem from './TaskCommentItem';

const TaskCommentsList = ({ comments, loading, error, onDeleteComment, onRetry }) => {
  if (loading && comments.length === 0) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (error && comments.length === 0) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
        {error}
        <button 
          onClick={onRetry} 
          className="ml-2 underline hover:text-red-800"
        >
          再試行
        </button>
      </div>
    );
  }
  
  if (comments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        コメントはまだありません。最初のコメントを投稿しましょう。
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {[...comments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(comment => (
        <TaskCommentItem 
          key={comment.id} 
          comment={comment} 
          onDelete={onDeleteComment} 
        />
      ))}
    </div>
  );
};

export default TaskCommentsList; 