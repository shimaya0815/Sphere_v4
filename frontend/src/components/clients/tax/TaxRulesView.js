import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../../api';
import { 
  HiOutlineDocumentText, 
  HiOutlineCalendar, 
  HiOutlinePlus, 
  HiOutlinePencilAlt, 
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineClock
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import TaxRuleForm from './TaxRuleForm';
import TaxRuleHistoryModal from './TaxRuleHistoryModal';

const TaxRulesView = ({ clientId }) => {
  const [incomeTaxRules, setIncomeTaxRules] = useState([]);
  const [residenceTaxRules, setResidenceTaxRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [selectedTaxType, setSelectedTaxType] = useState('income'); // 'income' または 'residence'
  const [refreshing, setRefreshing] = useState(false);
  
  // 履歴モーダル関連のステート
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTaxType, setHistoryTaxType] = useState(null);
  
  // 税ルールを取得
  const fetchTaxRules = async () => {
    console.log('Fetching tax rules for client:', clientId);
    setLoading(true);
    setRefreshing(true);
    
    try {
      // 源泉所得税と住民税のルールを同時に取得
      let incomeRules = [];
      let residenceRules = [];
      
      try {
        incomeRules = await clientsApi.getTaxRules(clientId, { tax_type: 'income' });
        console.log('Income tax rules fetched:', incomeRules);
      } catch (incomeErr) {
        console.error('Error fetching income tax rules:', incomeErr);
        // エラーの場合は空配列を使用
        incomeRules = [];
      }
      
      try {
        residenceRules = await clientsApi.getTaxRules(clientId, { tax_type: 'residence' });
        console.log('Residence tax rules fetched:', residenceRules);
      } catch (residenceErr) {
        console.error('Error fetching residence tax rules:', residenceErr);
        // エラーの場合は空配列を使用
        residenceRules = [];
      }
      
      // 現在適用中のルールが先頭に来るようにソート
      const sortedIncomeRules = sortRulesByStatus(Array.isArray(incomeRules) ? incomeRules : []);
      const sortedResidenceRules = sortRulesByStatus(Array.isArray(residenceRules) ? residenceRules : []);
      
      setIncomeTaxRules(sortedIncomeRules);
      setResidenceTaxRules(sortedResidenceRules);
      setError(null);
    } catch (err) {
      console.error('Error in fetchTaxRules:', err);
      setIncomeTaxRules([]);
      setResidenceTaxRules([]);
      setError('現在データは登録されていません');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // ルールを状態でソート (現在適用中 -> 将来適用予定 -> 過去のルール)
  const sortRulesByStatus = (rules) => {
    return rules.sort((a, b) => {
      const aStatus = getRuleStatusValue(a);
      const bStatus = getRuleStatusValue(b);
      
      // 状態が異なる場合は状態でソート
      if (aStatus !== bStatus) {
        return aStatus - bStatus;
      }
      
      // 状態が同じ場合は開始日で降順ソート（新しい順）
      return new Date(b.start_date) - new Date(a.start_date);
    });
  };
  
  // ルールの状態を数値化 (ソート用)
  const getRuleStatusValue = (rule) => {
    if (isCurrentRule(rule)) {
      return 0; // 現在適用中
    } else if (new Date(rule.start_date) > new Date()) {
      return 1; // 将来適用予定
    } else {
      return 2; // 過去のルール
    }
  };
  
  // 初回ロード時に税ルールを取得
  useEffect(() => {
    if (clientId) {
      fetchTaxRules();
    }
  }, [clientId]);
  
  // ルール追加ボタンのクリックハンドラ
  const handleAddClick = (taxType) => {
    setSelectedRule(null);
    setSelectedTaxType(taxType);
    setShowForm(true);
  };
  
  // ルール編集ボタンのクリックハンドラ
  const handleEditClick = (rule) => {
    setSelectedRule(rule);
    setSelectedTaxType(rule.tax_type);
    setShowForm(true);
  };
  
  // ルール削除ボタンのクリックハンドラ
  const handleDeleteClick = async (ruleId) => {
    if (!window.confirm('この税務ルールを削除してもよろしいですか？')) {
      return;
    }
    
    try {
      await clientsApi.deleteTaxRule(ruleId);
      toast.success('税務ルールを削除しました');
      fetchTaxRules(); // ルール一覧を再取得
    } catch (error) {
      console.error('Error deleting tax rule:', error);
      toast.error('税務ルールの削除に失敗しました');
    }
  };
  
  // フォームを閉じる
  const handleFormClose = () => {
    setShowForm(false);
    setSelectedRule(null);
  };
  
  // フォーム送信成功時のハンドラ
  const handleFormSuccess = () => {
    console.log('Form success callback triggered');
    fetchTaxRules(); // ルール一覧を再取得
    setShowForm(false);
  };
  
  // 履歴表示ハンドラ
  const handleShowHistory = (e, taxType) => {
    e.preventDefault();
    e.stopPropagation();
    setHistoryTaxType(taxType);
    setShowHistoryModal(true);
  };
  
  // 更新ボタンクリックハンドラ
  const handleRefreshClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    toast.loading('税務ルール情報を更新中...', { id: 'tax-rules-update' });
    
    fetchTaxRules()
      .then(() => {
        toast.success('税務ルール情報を更新しました', { id: 'tax-rules-update' });
      })
      .catch(() => {
        toast.error('税務ルール情報の更新に失敗しました', { id: 'tax-rules-update' });
      });
  };
  
  // 現在適用されているルールかどうかを判定
  const isCurrentRule = (rule) => {
    const today = new Date();
    const startDate = new Date(rule.start_date);
    const endDate = rule.end_date ? new Date(rule.end_date) : null;
    
    return startDate <= today && (!endDate || endDate >= today);
  };
  
  // ルールの種類を日本語表示
  const getRuleTypeDisplay = (ruleType) => {
    return ruleType === 'principle' ? '原則' : '特例';
  };
  
  // 税種別の日本語表示
  const getTaxTypeDisplay = (taxType) => {
    return taxType === 'income' ? '源泉所得税' : '住民税';
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
  
  // 現在適用中のルールを取得
  const getCurrentRule = (rules) => {
    return rules.find(isCurrentRule) || null;
  };
  
  const currentIncomeRule = getCurrentRule(incomeTaxRules);
  const currentResidenceRule = getCurrentRule(residenceTaxRules);
  
  if (loading && !incomeTaxRules.length && !residenceTaxRules.length) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* 源泉所得税ルール */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 flex items-center">
            <HiOutlineDocumentText className="mr-2 text-blue-500" />
            源泉所得税ルール
          </h3>
          <div className="flex space-x-2">
            <button 
              className={`flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none ${refreshing ? 'animate-spin text-primary-600' : ''}`}
              onClick={handleRefreshClick}
              disabled={refreshing}
              title="更新"
            >
              <HiOutlineRefresh className="h-5 w-5" />
            </button>
            <button 
              className="flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none"
              onClick={(e) => handleShowHistory(e, 'income')}
              title="履歴"
            >
              <HiOutlineClock className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {error && (
            <div className="p-4 mb-4 text-blue-700 bg-blue-100 rounded-lg">
              {error}
            </div>
          )}
          
          {incomeTaxRules.length === 0 ? (
            <div className="p-4 text-blue-700 bg-blue-100 rounded-lg">
              源泉所得税ルールが登録されていません。下のボタンから登録してください。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ルール種別
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      適用期間
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状態
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      備考
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {incomeTaxRules.slice(0, 3).map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getRuleTypeDisplay(rule.rule_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <HiOutlineCalendar className="mr-1 text-gray-500" />
                          {formatDate(rule.start_date)} 〜 {formatDate(rule.end_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isCurrentRule(rule) ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            現在適用中
                          </span>
                        ) : new Date(rule.start_date) > new Date() ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            将来適用予定
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            過去のルール
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate">
                        {rule.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {incomeTaxRules.length > 3 && (
                <div className="p-2 text-center text-sm text-gray-500">
                  <button 
                    className="text-primary-600 hover:text-primary-800 hover:underline focus:outline-none"
                    onClick={(e) => handleShowHistory(e, 'income')}
                  >
                    すべての履歴を表示...
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4">
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => handleAddClick('income')}
            >
              <HiOutlinePlus className="mr-2 -ml-1 h-5 w-5" /> 新規ルール追加
            </button>
          </div>
        </div>
      </div>
      
      {/* 住民税ルール */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 flex items-center">
            <HiOutlineDocumentText className="mr-2 text-green-500" />
            住民税ルール
          </h3>
          <div className="flex space-x-2">
            <button 
              className={`flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none ${refreshing ? 'animate-spin text-primary-600' : ''}`}
              onClick={handleRefreshClick}
              disabled={refreshing}
              title="更新"
            >
              <HiOutlineRefresh className="h-5 w-5" />
            </button>
            <button 
              className="flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none"
              onClick={(e) => handleShowHistory(e, 'residence')}
              title="履歴"
            >
              <HiOutlineClock className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {residenceTaxRules.length === 0 ? (
            <div className="p-4 text-blue-700 bg-blue-100 rounded-lg">
              住民税ルールが登録されていません。下のボタンから登録してください。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ルール種別
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      適用期間
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状態
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      備考
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {residenceTaxRules.slice(0, 3).map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getRuleTypeDisplay(rule.rule_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <HiOutlineCalendar className="mr-1 text-gray-500" />
                          {formatDate(rule.start_date)} 〜 {formatDate(rule.end_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isCurrentRule(rule) ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            現在適用中
                          </span>
                        ) : new Date(rule.start_date) > new Date() ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            将来適用予定
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            過去のルール
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate">
                        {rule.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {residenceTaxRules.length > 3 && (
                <div className="p-2 text-center text-sm text-gray-500">
                  <button 
                    className="text-primary-600 hover:text-primary-800 hover:underline focus:outline-none"
                    onClick={(e) => handleShowHistory(e, 'residence')}
                  >
                    すべての履歴を表示...
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4">
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => handleAddClick('residence')}
            >
              <HiOutlinePlus className="mr-2 -ml-1 h-5 w-5" /> 新規ルール追加
            </button>
          </div>
        </div>
      </div>
      
      {/* 税ルール追加/編集フォームモーダル */}
      {showForm && (
        <TaxRuleForm
          clientId={clientId}
          taxRule={selectedRule}
          taxType={selectedTaxType}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
      
      {/* 税ルール履歴モーダル */}
      <TaxRuleHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        clientId={clientId}
        taxType={historyTaxType}
        onSaveComplete={fetchTaxRules}
      />
    </div>
  );
};

export default TaxRulesView;