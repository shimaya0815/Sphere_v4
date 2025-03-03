import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../api';
import toast from 'react-hot-toast';

const FiscalYearForm = ({ clientId, fiscalYear = null, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    client: clientId,
    fiscal_period: '',
    start_date: '',
    end_date: '',
    description: ''
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
        description: fiscalYear.description || ''
      });
    }
  }, [fiscalYear]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
      if (fiscalYear) {
        // 更新
        await clientsApi.updateFiscalYear(fiscalYear.id, submitData);
        toast.success('決算期情報を更新しました');
      } else {
        // 新規作成
        await clientsApi.createFiscalYear(clientId, submitData);
        toast.success('決算期情報を追加しました');
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
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
    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">
          {fiscalYear ? '決算期を編集' : '決算期を追加'}
        </h2>
        
        <form onSubmit={handleSubmit}>
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