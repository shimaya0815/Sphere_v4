import tasksApi from '../api/tasks';
import toast from 'react-hot-toast';

// 既存のテンプレートを全て削除する関数
export const deleteAllTemplates = async () => {
  try {
    console.log('全てのテンプレートを削除します...');
    const existingTemplates = await tasksApi.getTemplates();
    
    if (existingTemplates && existingTemplates.length > 0) {
      for (const template of existingTemplates) {
        try {
          await tasksApi.deleteTask(template.id);
          console.log(`テンプレート ${template.id}: ${template.title} を削除しました`);
        } catch (err) {
          if (err.response && err.response.status === 404) {
            console.log(`テンプレート ${template.id} は既に削除されているか存在しません`);
          } else {
            console.error(`テンプレート削除エラー ${template.id}:`, err);
          }
        }
      }
      console.log('すべてのテンプレートを削除しました');
      return true;
    } else {
      console.log('削除するテンプレートがありません');
      return true;
    }
  } catch (error) {
    console.error('テンプレート削除エラー:', error);
    return false;
  }
}; 