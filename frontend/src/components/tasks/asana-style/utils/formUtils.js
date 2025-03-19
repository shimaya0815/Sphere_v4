/**
 * フォーム関連のユーティリティ関数
 */

/**
 * フォームデータをAPI送信用に整形する
 * @param {Object} formData - フォームデータ
 * @returns {Object} API送信用に整形されたデータ
 */
export const prepareFormDataForSubmission = (formData) => {
  const prepared = { ...formData };
  
  // 文字列の真偽値を実際のブール値に変換
  ['is_fiscal_task', 'is_recurring', 'is_template'].forEach(field => {
    if (prepared[field] !== undefined) {
      prepared[field] = prepared[field] === 'true';
    }
  });
  
  // 空文字列をnullに変換
  Object.keys(prepared).forEach(key => {
    if (prepared[key] === '') {
      prepared[key] = null;
    }
  });
  
  return prepared;
};

/**
 * APIレスポンスデータをフォーム用に整形する
 * @param {Object} taskData - APIから取得したタスクデータ
 * @returns {Object} フォーム用に整形されたデータ
 */
export const prepareTaskDataForForm = (taskData) => {
  if (!taskData) return null;
  
  const formattedTask = { ...taskData };
  
  // boolean値を文字列に変換（フォームコントロールの互換性のため）
  ['is_fiscal_task', 'is_recurring', 'is_template'].forEach(field => {
    if (formattedTask[field] !== undefined) {
      formattedTask[field] = formattedTask[field] ? 'true' : 'false';
    }
  });
  
  // 優先度の数値設定
  if (formattedTask.priority_data && formattedTask.priority_data.priority_value) {
    formattedTask.priority_value = formattedTask.priority_data.priority_value.toString();
  } else {
    formattedTask.priority_value = '';
  }
  
  // nullを空文字列に変換
  Object.keys(formattedTask).forEach(key => {
    if (formattedTask[key] === null) {
      formattedTask[key] = '';
    }
  });
  
  return formattedTask;
}; 