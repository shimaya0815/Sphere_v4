import React from 'react';
import { HiUser } from 'react-icons/hi';

/**
 * 現在のタスク担当者を表示するコンポーネント
 * ステータスに応じた担当者（作業者/レビュアー）を適切に表示
 */
const CurrentAssignee = ({ task, users }) => {
  // 担当者名を決定するヘルパー関数
  const determineAssigneeName = () => {
    // 担当者表示のための関数
    if (task.assignee_name) return task.assignee_name;
    
    // status_dataが取得できている場合
    if (task.status_data && task.status_data.assignee_type) {
      const assigneeType = task.status_data.assignee_type;
      
      // 作業者タイプの場合
      if (assigneeType === 'worker') {
        // worker_nameが利用可能ならそれを使う
        if (task.worker_name) return task.worker_name;
        // worker_dataが利用可能ならそれを使う
        if (task.worker_data && task.worker_data.get_full_name) 
          return task.worker_data.get_full_name;
        // workerのIDがあり、usersリストで見つかれば名前を表示
        if (task.worker && users && users.find(u => u.id === task.worker || u.id === parseInt(task.worker)))
          return users.find(u => u.id === task.worker || u.id === parseInt(task.worker)).get_full_name || 
                 users.find(u => u.id === task.worker || u.id === parseInt(task.worker)).email;
        
        return '作業担当者';
      }
      
      // レビュアータイプの場合
      if (assigneeType === 'reviewer') {
        // reviewer_nameが利用可能ならそれを使う
        if (task.reviewer_name) return task.reviewer_name;
        // reviewer_dataが利用可能ならそれを使う
        if (task.reviewer_data && task.reviewer_data.get_full_name) 
          return task.reviewer_data.get_full_name;
        // reviewerのIDがあり、usersリストで見つかれば名前を表示
        if (task.reviewer && users && users.find(u => u.id === task.reviewer || u.id === parseInt(task.reviewer)))
          return users.find(u => u.id === task.reviewer || u.id === parseInt(task.reviewer)).get_full_name || 
                 users.find(u => u.id === task.reviewer || u.id === parseInt(task.reviewer)).email;
        
        return 'レビュー担当者';
      }
    }
    
    return '担当者なし';
  };

  if (!task) return null;

  return (
    <div className="bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 flex items-center">
      <HiUser className="mr-1.5 text-blue-500" />
      <div className="flex items-center">
        <span className="text-blue-700 mr-1">現在の担当者:</span>
        <span className="text-blue-800 font-medium">
          {determineAssigneeName()}
        </span>
      </div>
    </div>
  );
};

export default CurrentAssignee;