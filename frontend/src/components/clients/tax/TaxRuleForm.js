import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../../api';
import toast from 'react-hot-toast';
import { 
  HiOutlineCalendar, 
  HiOutlineDocumentText, 
  HiOutlineX,
  HiOutlineSave,
  HiOutlineInformationCircle
} from 'react-icons/hi';

const TaxRuleForm = ({ clientId, taxRule = null, taxType = 'income', onClose, onSuccess }) => {
  const initialFormData = {
    client: clientId,
    tax_type: taxType,
    rule_type: 'principle',
    start_date: '',
    end_date: '',
    description: ''
  };
  
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  
  // 編集モードの場合、既存データをフォームにセット
  useEffect(() => {
    if (taxRule) {
      setFormData({
        client: taxRule.client,
        tax_type: taxRule.tax_type,
        rule_type: taxRule.rule_type,
        start_date: taxRule.start_date || '',
        end_date: taxRule.end_date || '',
        description: taxRule.description || ''
      });
    } else {
      // 新規作成モードの場合、デフォルト値をセット（特に税の種類）
      setFormData({
        ...initialFormData,
        tax_type: taxType,
        start_date: new Date().toISOString().split('T')[0], // 今日の日付をデフォルトに
      });
    }
  }, [taxRule, taxType, clientId]);
  
  // フィールド変更ハンドラ
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // フォーム送信ハンドラ
  const handleSubmit = async () => {
    // バリデーション
    if (!formData.rule_type) {
      toast.error('ルール種別は必須です');
      return;
    }
    
    if (!formData.start_date) {
      toast.error('開始日は必須です');
      return;
    }
    
    // 終了日が開始日より前の場合エラー
    if (formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error('終了日は開始日より後の日付を指定してください');
      return;
    }
    
    setLoading(true);
    
    // 送信データを整形
    const submitData = {
      ...formData,
      client: Number(clientId)
    };
    
    // 終了日が空の場合は、nullに設定
    if (submitData.end_date === '') {
      submitData.end_date = null;
    }
    
    console.log('TaxRule submit data:', submitData);
    
    try {
      let response;
      if (taxRule) {
        // 更新
        response = await clientsApi.updateTaxRule(taxRule.id, submitData);
        console.log('Tax rule updated:', response);
        toast.success('税務ルールを更新しました');
      } else {
        // 新規作成
        response = await clientsApi.createTaxRule(clientId, submitData);
        console.log('New tax rule created:', response);
        toast.success('税務ルールを追加しました');
      }
      
      console.log('Closing modal and notifying success');
      onClose();
      
      // 遅延を入れてモーダルが完全に閉じた後にデータ更新を通知
      setTimeout(() => {
        if (onSuccess) {
          console.log('Calling onSuccess callback');
          onSuccess();
        }
      }, 300);
    } catch (error) {
      console.error('Error saving tax rule:', error);
      console.error('Request data:', submitData);
      console.error('Error details:', error.response?.data);
      
      let errorMsg = '税務ルールの保存に失敗しました';
      
      // HTMLレスポンスの検出
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.startsWith('<!DOCTYPE html>')) {
        errorMsg = 'サーバーエラーが発生しました。しばらく経ってから再度お試しください。';
      } else if (error.response?.data) {
        try {
          // オブジェクトの場合
          if (typeof error.response.data === 'object') {
            const errors = Object.entries(error.response.data)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join('; ');
            errorMsg += `: ${errors}`;
          } else {
            // 文字列の場合
            errorMsg += `: ${error.response.data}`;
          }
        } catch (e) {
          errorMsg += `: ${error.message}`;
        }
      } else {
        errorMsg += `: ${error.message}`;
      }
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // 税種別の日本語表示
  const getTaxTypeDisplay = () => {
    return formData.tax_type === 'income' ? '源泉所得税' : '住民税';
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <HiOutlineDocumentText className="mr-2 text-primary-600" />
            {taxRule ? '税務ルールを編集' : '税務ルールを追加'} ({getTaxTypeDisplay()})
          </h2>
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="rule_type" className="block text-sm font-medium text-gray-700 mb-1">
              ルール種別 <span className="text-red-500">*</span>
            </label>
            <select
              id="rule_type"
              name="rule_type"
              value={formData.rule_type}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="principle">原則</option>
              <option value="exception">特例</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              開始日 <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <HiOutlineCalendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="pl-10 focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              終了日 
              <span className="ml-2 text-xs text-gray-500 font-normal">
                (空白の場合は現在まで適用)
              </span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <HiOutlineCalendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date || ''}
                onChange={handleChange}
                className="pl-10 focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="未入力で現在まで適用"
              />
            </div>
            <div className="mt-1 flex items-center text-xs text-gray-500">
              <HiOutlineInformationCircle className="h-4 w-4 mr-1" />
              終了日を入力しない場合、現在も適用中のルールとして扱われます
            </div>
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
              className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="ルールに関する補足情報"
            ></textarea>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                保存中...
              </>
            ) : (
              <>
                <HiOutlineSave className="mr-2 -ml-1 h-5 w-5" />
                {taxRule ? '更新する' : '追加する'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxRuleForm;