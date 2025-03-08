import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../api';
import toast from 'react-hot-toast';

const FiscalYearForm = ({ clientId, fiscalYear = null, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    client: clientId,
    fiscal_period: '',
    start_date: '',
    end_date: '',
    description: '',
    is_current: false,
    is_locked: false
  });
  
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // 編集モードの場合、既存データをフォームにセット
    if (fiscalYear) {
      setFormData({
        client: fiscalYear.client,
        fiscal_period: fiscalYear.fiscal_period,
        start_date: fiscalYear.start_date,
        end_date: fiscalYear.end_date,
        description: fiscalYear.description || '',
        is_current: fiscalYear.is_current || false,
        is_locked: fiscalYear.is_locked || false
      });
    }
  }, [fiscalYear]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.fiscal_period) {
      toast.error('決算期は必須です');
      return;
    }
    
    if (!formData.start_date) {
      toast.error('開始日は必須です');
      return;
    }
    
    if (!formData.end_date) {
      toast.error('終了日は必須です');
      return;
    }
    
    // 終了日が開始日より前の場合エラー
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error('終了日は開始日より後の日付を指定してください');
      return;
    }
    
    setLoading(true);
    
    // 送信データを整形
    const submitData = {
      ...formData,
      client: Number(clientId),
      fiscal_period: Number(formData.fiscal_period)
    };
    
    console.log('FiscalYear submit data:', submitData);
    
    try {
      let response;
      if (fiscalYear) {
        // 更新
        response = await clientsApi.updateFiscalYear(fiscalYear.id, submitData);
        console.log('Fiscal year updated:', response);
        toast.success('決算期情報を更新しました');
      } else {
        // 新規作成
        response = await clientsApi.createFiscalYear(Number(clientId), submitData);
        console.log('New fiscal year created:', response);
        toast.success('決算期情報を追加しました');
      }
      
      console.log('Closing modal and notifying success');
      onClose();
      
      // 遅延を入れてモーダルが完全に閉じた後にデータ更新を通知
      setTimeout(() => {
        // 親コンポーネントに成功を通知
        if (onSuccess) {
          console.log('Calling onSuccess callback');
          onSuccess();
        }
      }, 300);
    } catch (error) {
      console.error('Error saving fiscal year:', error);
      console.error('Request data:', submitData);
      console.error('Error details:', error.response?.data);
      
      let errorMsg = '決算期情報の保存に失敗しました';
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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center" 
      style={{ 
        zIndex: 50000,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onClick={() => onClose()} // 背景のクリックでモーダルを閉じる
    >
      <div 
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg" 
        style={{ position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {fiscalYear ? '決算期を編集' : '決算期を追加'}
          </h2>
          <button 
            type="button" 
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
            style={{ fontSize: '1.5rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} action="">
          <div className="space-y-4">
            <div>
              <label htmlFor="fiscal_period" className="block text-sm font-medium text-gray-700 mb-1">
                決算期（期） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="fiscal_period"
                name="fiscal_period"
                value={formData.fiscal_period}
                onChange={handleChange}
                min="1"
                className="input input-bordered w-full"
                required
              />
            </div>
            
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                開始日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="input input-bordered w-full"
                required
              />
            </div>
            
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                終了日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="input input-bordered w-full"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="textarea textarea-bordered w-full"
              ></textarea>
            </div>
            
            <div className="flex space-x-6">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text mr-2">現在の期</span>
                  <input
                    type="checkbox"
                    name="is_current"
                    checked={formData.is_current}
                    onChange={handleChange}
                    className="checkbox checkbox-primary"
                    disabled={fiscalYear && fiscalYear.is_locked}
                  />
                </label>
                <span className="text-xs text-gray-500">
                  これを現在の期として設定します。一度に1つだけ設定できます。
                </span>
              </div>
              
              {fiscalYear && (
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text mr-2">ロック</span>
                    <input
                      type="checkbox"
                      name="is_locked"
                      checked={formData.is_locked}
                      onChange={handleChange}
                      className="checkbox checkbox-warning"
                    />
                  </label>
                  <span className="text-xs text-gray-500">
                    ロックすると基本データの編集ができなくなります。
                  </span>
                </div>
              )}
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
                fiscalYear ? '更新する' : '追加する'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FiscalYearForm;