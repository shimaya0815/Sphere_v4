import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { clientsApi } from '../../../api';
import { 
  HiOutlineDocumentText, 
  HiOutlineCalendar,
  HiOutlineX,
  HiOutlineSave,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineCheck,
  HiOutlineExclamation,
  HiOutlineArrowLeft
} from 'react-icons/hi';

// 税種別の日本語表示
const getTaxTypeDisplay = (taxType) => {
  return taxType === 'income' ? '源泉所得税' : '住民税';
};

// ルールの種類の日本語表示
const getRuleTypeDisplay = (ruleType) => {
  return ruleType === 'principle' ? '原則' : '特例';
};

// 状態に応じたバッジのスタイルを取得
const getStatusBadgeStyle = (rule) => {
  if (isCurrentRule(rule)) {
    return 'bg-green-100 text-green-800';
  } else if (new Date(rule.start_date) > new Date()) {
    return 'bg-yellow-100 text-yellow-800';
  } else {
    return 'bg-gray-100 text-gray-800';
  }
};

// 状態の表示名を取得
const getStatusDisplay = (rule) => {
  if (isCurrentRule(rule)) {
    return '現在適用中';
  } else if (new Date(rule.start_date) > new Date()) {
    return '将来適用予定';
  } else {
    return '過去のルール';
  }
};

// 現在適用されているルールかどうかを判定
const isCurrentRule = (rule) => {
  const today = new Date();
  const startDate = new Date(rule.start_date);
  const endDate = rule.end_date ? new Date(rule.end_date) : null;
  
  return startDate <= today && (!endDate || endDate >= today);
};

// 日付の表示をフォーマット
const formatDate = (dateString) => {
  if (!dateString) return '現在まで';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP');
  } catch (e) {
    return dateString;
  }
};

const TaxRuleHistoryModal = ({ 
  isOpen, 
  onClose, 
  clientId, 
  taxType,
  onSaveComplete
}) => {
  // ルール履歴のステート
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // フォーム関連のステート
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formData, setFormData] = useState({
    client: clientId,
    tax_type: taxType,
    rule_type: 'principle',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  
  // 初期表示時のローディング
  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen, clientId, taxType]);
  
  // 税務ルールを取得
  const fetchRules = async () => {
    if (!clientId || !taxType) return;
    
    setLoading(true);
    try {
      const response = await clientsApi.getTaxRules(clientId, { tax_type: taxType });
      console.log(`${getTaxTypeDisplay(taxType)}ルール取得:`, response);
      
      // 有効期限の新しい順にソート
      const sortedRules = Array.isArray(response) 
        ? response.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
        : [];
      
      setRules(sortedRules);
      
      // 新規ルールフォームの初期値を設定
      setFormData(prev => ({
        ...prev,
        tax_type: taxType,
        start_date: new Date().toISOString().split('T')[0]
      }));
    } catch (error) {
      console.error('税務ルール取得中のエラー:', error);
      setError('税務ルールの表示に問題が発生しました');
      setRules([]);
    } finally {
      setLoading(false);
    }
  };
  
  // フォーム項目の変更ハンドラ
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // 保存ハンドラ
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
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

    try {
      setSaving(true);
      
      // 送信データを整形
      const submitData = {
        ...formData,
        client: Number(clientId)
      };
      
      // 終了日が空の場合は、nullに設定
      if (submitData.end_date === '') {
        submitData.end_date = null;
      }
      
      console.log('税務ルールデータを保存します:', submitData);
      
      try {
        // 新規作成
        const response = await clientsApi.createTaxRule(clientId, submitData);
        console.log('新しい税務ルールを作成しました:', response);
        toast.success('税務ルールを登録しました');
        
        // フォームをリセット
        setFormData({
          client: clientId,
          tax_type: taxType,
          rule_type: 'principle',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          description: ''
        });
        
        // ルール一覧を再取得
        fetchRules();
        
        // 作成モードを終了
        setIsCreatingNew(false);
        
        // 親コンポーネントに通知
        if (onSaveComplete) {
          onSaveComplete();
        }
      } catch (apiError) {
        console.error('税務ルール保存時のAPIエラー:', apiError);
        
        // エラーメッセージを表示
        let errorMsg = '税務ルールの保存に失敗しました';
        
        if (apiError.response?.data) {
          try {
            // オブジェクトの場合
            if (typeof apiError.response.data === 'object') {
              const errors = Object.entries(apiError.response.data)
                .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                .join('; ');
              errorMsg += `: ${errors}`;
            } else {
              // 文字列の場合
              errorMsg += `: ${apiError.response.data}`;
            }
          } catch (e) {
            errorMsg += `: ${apiError.message}`;
          }
        } else {
          errorMsg += `: ${apiError.message}`;
        }
        
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('保存処理中のエラー:', error);
      toast.error('税務ルールの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };
  
  // 削除ハンドラ
  const handleDelete = async (ruleId) => {
    if (!ruleId) return;
    
    if (!window.confirm('この税務ルールを削除しますか？この操作は元に戻せません。')) {
      return;
    }
    
    try {
      await clientsApi.deleteTaxRule(ruleId, clientId);
      toast.success('税務ルールを削除しました');
      fetchRules();
      
      // 親コンポーネントに通知
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      console.error('税務ルール削除エラー:', error);
      toast.error('税務ルールの削除に失敗しました');
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* モーダルヘッダー */}
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center">
            <button 
              className="mr-2 text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              <HiOutlineArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {getTaxTypeDisplay(taxType)}ルールの履歴
            </h2>
          </div>
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>
        
        {/* モーダルコンテンツ */}
        <div className="overflow-auto flex-grow p-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* 履歴テーブル */}
              {rules.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-700 mb-2">ルール履歴</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            適用期間
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ルール種別
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            状態
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            備考
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div className="flex items-center">
                                <HiOutlineCalendar className="mr-1 text-gray-500" />
                                {formatDate(rule.start_date)} 〜 {formatDate(rule.end_date)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {getRuleTypeDisplay(rule.rule_type)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(rule)}`}>
                                {getStatusDisplay(rule)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate">
                              {rule.description || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={() => handleDelete(rule.id)}
                                className="text-red-600 hover:text-red-900"
                                title="削除"
                              >
                                <HiOutlineTrash className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg mb-6">
                  <HiOutlineExclamation className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">ルール履歴がありません</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {getTaxTypeDisplay(taxType)}のルール履歴はまだ登録されていません。
                  </p>
                </div>
              )}
              
              {/* 新規ルール追加ボタン/フォーム */}
              {isCreatingNew ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-medium text-gray-700">新規ルールの登録</h3>
                    <button
                      onClick={() => setIsCreatingNew(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <HiOutlineX className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* ルール種別 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ルール種別 <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="rule_type"
                        value={formData.rule_type}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="principle">原則</option>
                        <option value="exception">特例</option>
                      </select>
                    </div>
                    
                    {/* 開始日 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        開始日 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    {/* 終了日 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        終了日 (空欄の場合は現在まで適用)
                      </label>
                      <input
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    {/* 備考 */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        備考
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="3"
                        placeholder="ルールに関する補足情報"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mr-3"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      {saving ? (
                        <span className="inline-flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          保存中...
                        </span>
                      ) : (
                        <>
                          <HiOutlineSave className="mr-2 h-4 w-4" />
                          保存
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <HiOutlinePlus className="mr-2 h-4 w-4" />
                  新規ルールを追加
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaxRuleHistoryModal; 