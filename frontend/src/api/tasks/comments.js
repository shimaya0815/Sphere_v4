import apiClient from '../client';

// APIキャッシュの設定
const cache = {
  comments: new Map(),
  cacheExpiration: 30000 // 30秒間キャッシュを有効に
};

/**
 * タスクのコメント一覧を取得
 * @param {number} taskId - タスクID
 * @returns {Promise<Array>} コメント一覧
 */
export const getTaskComments = async (taskId) => {
  try {
    const cacheKey = `task_comments_${taskId}`;
    
    // キャッシュにデータがあり、有効期限内であれば使用
    if (cache.comments.has(cacheKey)) {
      const { data, timestamp } = cache.comments.get(cacheKey);
      const now = Date.now();
      
      if (now - timestamp < cache.cacheExpiration) {
        console.log('キャッシュからコメントを取得します', taskId);
        return data;
      }
    }
    
    console.log(`Fetching comments for task ID ${taskId}`);
    // URLパスを修正: 「/api/tasks/${taskId}/comments/」→「/api/tasks/comments/?task=${taskId}」
    const response = await apiClient.get(`/api/tasks/comments/`, {
      params: { task: taskId }
    });
    console.log('Comments response:', response.data);
    
    // データを整形
    let commentsList = [];
    if (response.data && Array.isArray(response.data)) {
      commentsList = response.data;
    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
      commentsList = response.data.results;
    }
    
    // キャッシュに保存
    cache.comments.set(cacheKey, {
      data: commentsList,
      timestamp: Date.now()
    });
    
    return commentsList;
  } catch (error) {
    console.error('Error fetching task comments:', error);
    console.error('Error details:', error.response?.data || error.message);
    return [];
  }
};

/**
 * タスクにコメントを追加
 * @param {number} taskId - タスクID
 * @param {Object} commentData - コメントデータ
 * @returns {Promise<Object>} 作成されたコメント
 */
export const createTaskComment = async (taskId, commentData) => {
  try {
    console.log(`Creating comment for task ID ${taskId}`, commentData);
    
    // FormDataの場合はフィールドの確認
    if (commentData instanceof FormData) {
      if (!commentData.has('task')) {
        commentData.append('task', taskId);
      }
      
      // URLパスを修正: 「/api/tasks/${taskId}/comments/」→「/api/tasks/comments/」
      const response = await apiClient.post(`/api/tasks/comments/`, commentData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      // キャッシュを無効化
      const cacheKey = `task_comments_${taskId}`;
      cache.comments.delete(cacheKey);
      
      console.log('Comment created:', response.data);
      return response.data;
    } else {
      // JSONオブジェクトの場合
      const data = { ...commentData };
      if (!data.task) {
        data.task = taskId;
      }
      
      // URLパスを修正
      const response = await apiClient.post(`/api/tasks/comments/`, data);
      
      // キャッシュを無効化
      const cacheKey = `task_comments_${taskId}`;
      cache.comments.delete(cacheKey);
      
      console.log('Comment created:', response.data);
      return response.data;
    }
  } catch (error) {
    console.error('Error creating task comment:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * コメントを更新
 * @param {number} commentId - コメントID
 * @param {Object} commentData - 更新データ
 * @returns {Promise<Object>} 更新されたコメント
 */
export const updateTaskComment = async (commentId, commentData) => {
  try {
    console.log(`Updating comment ID ${commentId}`, commentData);
    
    // FormDataの場合とJSONオブジェクトの場合で処理を分ける
    let response;
    if (commentData instanceof FormData) {
      response = await apiClient.patch(`/api/tasks/comments/${commentId}/`, commentData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
    } else {
      response = await apiClient.patch(`/api/tasks/comments/${commentId}/`, commentData);
    }
    
    // 関連するキャッシュをすべて削除
    for (const key of cache.comments.keys()) {
      if (key.startsWith('task_comments_')) {
        cache.comments.delete(key);
      }
    }
    
    console.log('Comment updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating task comment:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * コメントを削除
 * @param {number} commentId - コメントID
 * @returns {Promise<Object>} 削除結果
 */
export const deleteTaskComment = async (commentId) => {
  try {
    console.log(`Deleting comment ID ${commentId}`);
    const response = await apiClient.delete(`/api/tasks/comments/${commentId}/`);
    
    // 関連するキャッシュをすべて削除
    for (const key of cache.comments.keys()) {
      if (key.startsWith('task_comments_')) {
        cache.comments.delete(key);
      }
    }
    
    console.log('Comment deleted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error deleting task comment:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

export default {
  getTaskComments,
  createTaskComment,
  updateTaskComment,
  deleteTaskComment
}; 