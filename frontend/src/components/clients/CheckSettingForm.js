import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../api';
import toast from 'react-hot-toast';

const CheckSettingForm = ({ clientId, checkSetting = null, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    client: clientId,
    check_type: 'monthly',
    is_enabled: true,
    cycle: 'monthly',
    create_day: '',
    template: null
  });
  
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  
  useEffect(() => {
    // 編集モードの場合、既存データをフォームにセット
    if (checkSetting) {
      setFormData({
        client: checkSetting.client,
        check_type: checkSetting.check_type,
        is_enabled: checkSetting.is_enabled,
        cycle: checkSetting.cycle,
        create_day: checkSetting.create_day,
        template: checkSetting.template
      });
    }
    
    // タスクテンプレートの取得
    fetchTemplates();
  }, [checkSetting]);
  
  const fetchTemplates = async () => {
    try {
      // 実際のタスクテンプレートAPIを使用
      const tasksApi = (await import('../../api/tasks')).default;
      const data = await tasksApi.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      // フォールバックとしてモックデータを使用
      setTemplates([
        { id: 1, title: 'スタンダード月次チェック' },
        { id: 2, title: '簡易月次チェック' },
        { id: 3, title: '法人税確定申告' },
        { id: 4, title: '所得税確定申告' }
      ]);
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.create_day) {
      toast.error('作成日は必須です');
      return;
    }
    
    // 日付の範囲チェック
    const createDay = parseInt(formData.create_day, 10);
    if (createDay < 1 || createDay > 31) {
      toast.error('作成日は1〜31の範囲で指定してください');
      return;
    }
    
    setLoading(true);
    
    // 送信データを整形
    const submitData = {
      ...formData,
      client: Number(clientId),
      create_day: Number(formData.create_day),
      template: formData.template ? Number(formData.template) : null
    };
    
    console.log('CheckSetting submit data:', submitData);
    
    try {
      if (checkSetting) {
        // 更新
        await clientsApi.updateCheckSetting(checkSetting.id, submitData);
        toast.success('チェック設定を更新しました');
      } else {
        // 新規作成
        await clientsApi.createCheckSetting(clientId, submitData);
        toast.success('チェック設定を追加しました');
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving check setting:', error);
      console.error('Request data:', submitData);
      console.error('Error details:', error.response?.data);
      
      let errorMsg = 'チェック設定の保存に失敗しました';
      if (error.response?.data) {
        const errors = Object.entries(error.response.data)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
        errorMsg += `: ${errors}`;
      } else {
        errorMsg += `: ${error.message}`;
      }
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">
          {checkSetting ? 'チェック設定を編集' : 'チェック設定を追加'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="check_type" className="block text-sm font-medium text-gray-700 mb-1">
                チェック種別 <span className="text-red-500">*</span>
              </label>
              <select
                id="check_type"
                name="check_type"
                value={formData.check_type}
                onChange={handleChange}
                className="select select-bordered w-full"
                required
              >
                <option value="monthly">月次チェック</option>
                <option value="bookkeeping">記帳代行</option>
                <option value="tax_return">税務申告書作成</option>
                <option value="withholding_tax">源泉所得税対応</option>
                <option value="other">その他</option>
              </select>
            </div>
            
            <div className="form-control">
              <label className="label cursor-pointer justify-start">
                <input
                  type="checkbox"
                  id="is_enabled"
                  name="is_enabled"
                  checked={formData.is_enabled}
                  onChange={handleChange}
                  className="checkbox"
                />
                <span className="label-text ml-2">有効</span>
              </label>
            </div>
            
            <div>
              <label htmlFor="cycle" className="block text-sm font-medium text-gray-700 mb-1">
                サイクル <span className="text-red-500">*</span>
              </label>
              <select
                id="cycle"
                name="cycle"
                value={formData.cycle}
                onChange={handleChange}
                className="select select-bordered w-full"
                required
              >
                <option value="monthly">毎月</option>
                <option value="yearly">毎年</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="create_day" className="block text-sm font-medium text-gray-700 mb-1">
                作成日 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="create_day"
                name="create_day"
                value={formData.create_day}
                onChange={handleChange}
                min="1"
                max="31"
                className="input input-bordered w-full"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                毎月または毎年の何日に作成するか（1〜31）
              </p>
            </div>
            
            <div>
              <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
                テンプレート
              </label>
              <select
                id="template"
                name="template"
                value={formData.template || ''}
                onChange={(e) => {
                  // 数値、または空文字に変換
                  const value = e.target.value === '' ? '' : Number(e.target.value);
                  setFormData({
                    ...formData,
                    template: value
                  });
                }}
                className="select select-bordered w-full"
              >
                <option value="">なし</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.template_name || template.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                テンプレートに基づいたタスクが自動的に作成されます
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  保存中...
                </>
              ) : (
                checkSetting ? '更新する' : '追加する'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckSettingForm;