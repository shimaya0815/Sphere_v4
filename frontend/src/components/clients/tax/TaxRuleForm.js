import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../../api';
import toast from 'react-hot-toast';
import { HiOutlineCalendar, HiOutlineDocumentText } from 'react-icons/hi';

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
      onClick={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div 
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg" 
        style={{ position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <HiOutlineDocumentText className="mr-2" />
            {taxRule ? '税務ルールを編集' : '税務ルールを追加'} ({getTaxTypeDisplay()})
          </h2>
          <button 
            type="button" 
            className="text-gray-400 hover:text-gray-500"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            style={{ fontSize: '1.5rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="rule_type" className="block text-sm font-medium text-gray-700 mb-1">
              ルール種別 <span className="text-red-500">*</span>
            </label>
            <select
              id="rule_type"
              name="rule_type"
              value={formData.rule_type}
              onChange={handleChange}
              className="select select-bordered w-full"
            >
              <option value="principle">原則</option>
              <option value="exception">特例</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              開始日 <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlineCalendar />
              </span>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              終了日 <span className="text-gray-400">(空白の場合は現在まで適用)</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlineCalendar />
              </span>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date || ''}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
                placeholder="未入力で現在まで適用"
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
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
              className="textarea textarea-bordered w-full"
            ></textarea>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="btn btn-ghost"
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={() => {
              if (!loading) {
                handleSubmit();
              }
            }}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm mr-2"></span>
                保存中...
              </>
            ) : (
              taxRule ? '更新する' : '追加する'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxRuleForm;