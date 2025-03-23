/**
 * フォームデータをAPIに送信するための形式に変換
 */
export const prepareFormDataForSubmission = (formData) => {
  // ディープコピーを作成
  const preparedData = { ...formData };
  
  // descriptionフィールドの処理（nullや未定義の場合は空文字列に）
  preparedData.description = preparedData.description || '';
  
  // template_nameの処理 - nullや未定義の場合は空文字列に設定
  // 常に空文字列として送信する（空白の場合も含む）
  preparedData.template_name = '';
  
  // boolean型の変換
  ['is_fiscal_task', 'is_recurring', 'is_template'].forEach(field => {
    if (preparedData[field] !== undefined) {
      preparedData[field] = preparedData[field] === 'true';
    }
  });
  
  // 日付フィールドの処理（空文字列はnullに）
  ['due_date', 'start_date', 'completed_at', 'recurrence_end_date'].forEach(field => {
    if (preparedData[field] === '') {
      preparedData[field] = null;
    }
  });
  
  // 一般的な空文字列フィールドの処理
  Object.keys(preparedData).forEach(key => {
    // descriptionとtemplate_nameは空文字列を許可
    if (key !== 'description' && key !== 'template_name' && preparedData[key] === '') {
      preparedData[key] = null;
    }
  });
  
  return preparedData;
};

/**
 * APIから取得したタスクデータをフォーム用に変換
 */
export const prepareTaskDataForForm = (taskData) => {
  // ディープコピーを作成
  const formData = { ...taskData };
  
  // boolean型を文字列に変換
  ['is_fiscal_task', 'is_recurring', 'is_template'].forEach(field => {
    if (formData[field] !== undefined) {
      formData[field] = formData[field] ? 'true' : 'false';
    }
  });
  
  // template_nameが未定義または空の場合、空文字列を設定
  formData.template_name = formData.template_name || '';
  
  return formData;
};

/**
 * 日付をHTML input[type="date"]用のフォーマットに変換
 * @param {string} dateString - YYYY-MM-DDThh:mm:ss.sssZ形式の日付文字列
 * @returns {string} YYYY-MM-DD形式の日付文字列
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  // ISO形式の日付文字列からYYYY-MM-DD部分を抽出
  if (typeof dateString === 'string') {
    return dateString.split('T')[0];
  }
  
  // 日付オブジェクトの場合
  if (dateString instanceof Date) {
    return dateString.toISOString().split('T')[0];
  }
  
  return '';
};

/**
 * 相対的な日付表示を生成
 * @param {string} dateString - 日付文字列
 * @returns {string} 相対的な日付表示（例: 「今日」「昨日」「3日前」など）
 */
export const getRelativeDateDisplay = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  
  // 日付の差分を計算（ミリ秒）
  const diffTime = dateOnly.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  // YYYY-MM-DD形式
  const formatted = date.toISOString().split('T')[0];
  
  // 相対表示を返す
  if (dateOnly.getTime() === today.getTime()) {
    return `今日 (${formatted})`;
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return `昨日 (${formatted})`;
  } else if (dateOnly.getTime() === tomorrow.getTime()) {
    return `明日 (${formatted})`;
  } else if (diffDays > 0) {
    if (diffDays <= 7) {
      return `${diffDays}日後 (${formatted})`;
    }
    return formatted;
  } else {
    const absDiffDays = Math.abs(diffDays);
    if (absDiffDays <= 7) {
      return `${absDiffDays}日前 (${formatted})`;
    }
    return formatted;
  }
}; 