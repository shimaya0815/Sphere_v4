import apiClient from '../client';

/**
 * タスクのコメント一覧を取得
 * @param {number} taskId - タスクID
 * @returns {Promise<Array>} コメント一覧
 */
export const getTaskComments = async (taskId) => {
  try {
    console.log(`Fetching comments for task ID ${taskId}`);
    const response = await apiClient.get(`/api/tasks/${taskId}/comments/`);
    console.log('Comments response:', response.data);
    
    // ページネーション形式またはシンプルな配列形式に対応
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    
    return [];
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
    
    // FormDataの場合とJSONオブジェクトの場合で処理を分ける
    let response;
    if (commentData instanceof FormData) {
      response = await apiClient.post(`/api/tasks/${taskId}/comments/`, commentData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
    } else {
      response = await apiClient.post(`/api/tasks/${taskId}/comments/`, commentData);
    }
    
    console.log('Comment created:', response.data);
    return response.data;
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