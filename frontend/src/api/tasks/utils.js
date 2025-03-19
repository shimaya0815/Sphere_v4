/**
 * タスクAPIのユーティリティ関数
 */

/**
 * オブジェクトから不要なフィールドを削除する
 * @param {Object} data - クリーンアップするデータオブジェクト
 * @param {Array} preserveNullFields - nullを保持するフィールドの配列
 * @returns {Object} クリーンアップされたデータオブジェクト
 */
export const cleanData = (data, preserveNullFields = ['category', 'client', 'fiscal_year', 'worker', 'reviewer']) => {
  // クリーンなデータオブジェクトを作成
  const cleanedData = { ...data };
  
  // nullとundefinedと空文字列を削除する - 特定のフィールドは例外的に処理
  Object.keys(cleanedData).forEach(key => {
    // 説明フィールドは常に送信する（空文字列も保持）
    if (key === 'description') {
      // 説明フィールドは空文字列もnullも明示的に送信
      console.log(`Preserving description value: "${cleanedData[key]}"`);
      return;
    }
    
    // 特定のフィールドはnullを保持する
    if (preserveNullFields.includes(key) && cleanedData[key] === null) {
      // これらのフィールドはnullの場合でも保持する（クリアする意図がある）
      console.log(`Preserving null value for ${key}`);
    } else if (cleanedData[key] === null || cleanedData[key] === undefined || cleanedData[key] === '') {
      delete cleanedData[key];
    }
  });
  
  return cleanedData;
};

/**
 * 日付フィールドをISO 8601形式に変換
 * @param {Object} data - 変換するデータオブジェクト
 * @param {Array} dateFields - 日付フィールドの配列
 * @returns {Object} 日付が変換されたデータオブジェクト
 */
export const formatDateFields = (data, dateFields = ['due_date', 'start_date', 'completed_at', 'recurrence_end_date']) => {
  const formattedData = { ...data };
  
  // 日付フィールドをISO 8601形式に変換（存在する場合のみ）
  dateFields.forEach(field => {
    if (field in formattedData && formattedData[field]) {
      // YYYY-MM-DD形式の場合、ISO 8601形式に変換
      if (typeof formattedData[field] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(formattedData[field])) {
        formattedData[field] = `${formattedData[field]}T00:00:00Z`;
        console.log(`Converted ${field} to ISO format:`, formattedData[field]);
      }
    }
  });
  
  return formattedData;
};

/**
 * 繰り返しパターンの曜日設定を処理
 * @param {Object} data - 処理するデータオブジェクト
 * @returns {Object} 処理されたデータオブジェクト
 */
export const processRecurrenceFields = (data) => {
  const processedData = { ...data };
  
  // 週次繰り返しの曜日処理
  if ('weekday' in processedData) {
    if (processedData.weekday === '' || processedData.weekday === undefined) {
      processedData.weekday = null;
      console.log('週次繰り返しの曜日が空のため、nullに設定します');
    } else if (typeof processedData.weekday === 'string' && !isNaN(parseInt(processedData.weekday, 10))) {
      // 文字列の場合は数値に変換
      processedData.weekday = parseInt(processedData.weekday, 10);
      console.log('週次繰り返しの曜日を数値に変換しました:', processedData.weekday);
    }
  }
  
  // 複数曜日指定の処理
  if ('weekdays' in processedData && Array.isArray(processedData.weekdays)) {
    // 曜日配列の処理（数値配列を文字列にJSONシリアライズ）
    processedData.weekdays = JSON.stringify(processedData.weekdays);
    console.log('週次繰り返しの複数曜日を文字列に変換しました:', processedData.weekdays);
  }
  
  // 月次繰り返しの日にち処理
  if ('monthday' in processedData) {
    if (processedData.monthday === '' || processedData.monthday === undefined) {
      processedData.monthday = null;
      console.log('月次繰り返しの日にちが空のため、nullに設定します');
    } else if (typeof processedData.monthday === 'string') {
      // 文字列の場合は数値に変換
      const day = parseInt(processedData.monthday, 10);
      if (day >= 1 && day <= 31) {
        processedData.monthday = day;
        console.log('月次繰り返しの日にちを数値に変換しました:', processedData.monthday);
      } else {
        processedData.monthday = null;
        console.log('無効な月次繰り返しの日にちのため、nullに設定します');
      }
    }
  }
  
  // 月次繰り返しの営業日処理
  if ('business_day' in processedData) {
    if (processedData.business_day === '' || processedData.business_day === undefined) {
      processedData.business_day = null;
      console.log('月次繰り返しの営業日が空のため、nullに設定します');
    } else if (typeof processedData.business_day === 'string') {
      // 文字列の場合は数値に変換
      const day = parseInt(processedData.business_day, 10);
      if (day >= 1 && day <= 31) {
        processedData.business_day = day;
        console.log('月次繰り返しの営業日指定を数値に変換しました:', processedData.business_day);
      } else {
        processedData.business_day = 0; // 無効な値の場合は0
        console.log('無効な月次繰り返しの営業日指定のため、0に設定します');
      }
    }
  }
  
  return processedData;
};

export default {
  cleanData,
  formatDateFields,
  processRecurrenceFields
}; 