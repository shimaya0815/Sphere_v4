import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../../api';
import { HiOutlineDocumentText, HiOutlineCalendar, HiOutlinePlus, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import TaxRuleForm from './TaxRuleForm';

const TaxRulesView = ({ clientId }) => {
  const [incomeTaxRules, setIncomeTaxRules] = useState([]);
  const [residenceTaxRules, setResidenceTaxRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [selectedTaxType, setSelectedTaxType] = useState('income'); // 'income' または 'residence'
  
  // 税ルールを取得
  const fetchTaxRules = async () => {
    console.log('Fetching tax rules for client:', clientId);
    setLoading(true);
    
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
      
      setIncomeTaxRules(Array.isArray(incomeRules) ? incomeRules : []);
      setResidenceTaxRules(Array.isArray(residenceRules) ? residenceRules : []);
      setError(null);
    } catch (err) {
      console.error('Error in fetchTaxRules:', err);
      setIncomeTaxRules([]);
      setResidenceTaxRules([]);
      setError('現在データは登録されていません');
    } finally {
      setLoading(false);
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
  
  // 日付の表示をフォーマット
  const formatDate = (dateString) => {
    if (!dateString) return '現在まで';
    return dateString;
  };
  
  if (loading && !incomeTaxRules.length && !residenceTaxRules.length) {
    return (
      <div className="flex justify-center py-4">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* 源泉所得税ルール */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 flex items-center">
            <HiOutlineDocumentText className="mr-2 text-blue-500" />
            源泉所得税ルール
          </h3>
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => handleAddClick('income')}
          >
            <HiOutlinePlus className="mr-1" /> 新規ルール追加
          </button>
        </div>
        
        <div className="p-4">
          {error && (
            <div className="alert alert-info mb-4">
              {error}
            </div>
          )}
          
          {incomeTaxRules.length === 0 ? (
            <div className="alert alert-info">
              源泉所得税ルールが登録されていません。「新規ルール追加」ボタンから登録してください。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>適用期間</th>
                    <th>ルール種別</th>
                    <th>状態</th>
                    <th>備考</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeTaxRules.map((rule) => (
                    <tr key={rule.id} className={isCurrentRule(rule) ? 'bg-blue-50' : ''}>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center">
                          <HiOutlineCalendar className="mr-1 text-gray-500" />
                          {formatDate(rule.start_date)} 〜 {formatDate(rule.end_date)}
                        </div>
                      </td>
                      <td className="font-medium">
                        {getRuleTypeDisplay(rule.rule_type)}
                      </td>
                      <td>
                        {isCurrentRule(rule) ? (
                          <span className="badge badge-success">現在適用中</span>
                        ) : new Date(rule.start_date) > new Date() ? (
                          <span className="badge badge-warning">将来適用予定</span>
                        ) : (
                          <span className="badge badge-ghost">過去のルール</span>
                        )}
                      </td>
                      <td className="max-w-[200px] truncate">{rule.description}</td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            className="btn btn-xs btn-outline"
                            onClick={() => handleEditClick(rule)}
                            title="編集"
                          >
                            <HiOutlinePencilAlt />
                          </button>
                          <button
                            className="btn btn-xs btn-outline btn-error"
                            onClick={() => handleDeleteClick(rule.id)}
                            title="削除"
                          >
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* 住民税ルール */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 flex items-center">
            <HiOutlineDocumentText className="mr-2 text-green-500" />
            住民税ルール
          </h3>
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => handleAddClick('residence')}
          >
            <HiOutlinePlus className="mr-1" /> 新規ルール追加
          </button>
        </div>
        
        <div className="p-4">
          {residenceTaxRules.length === 0 ? (
            <div className="alert alert-info">
              住民税ルールが登録されていません。「新規ルール追加」ボタンから登録してください。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>適用期間</th>
                    <th>ルール種別</th>
                    <th>状態</th>
                    <th>備考</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {residenceTaxRules.map((rule) => (
                    <tr key={rule.id} className={isCurrentRule(rule) ? 'bg-green-50' : ''}>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center">
                          <HiOutlineCalendar className="mr-1 text-gray-500" />
                          {formatDate(rule.start_date)} 〜 {formatDate(rule.end_date)}
                        </div>
                      </td>
                      <td className="font-medium">
                        {getRuleTypeDisplay(rule.rule_type)}
                      </td>
                      <td>
                        {isCurrentRule(rule) ? (
                          <span className="badge badge-success">現在適用中</span>
                        ) : new Date(rule.start_date) > new Date() ? (
                          <span className="badge badge-warning">将来適用予定</span>
                        ) : (
                          <span className="badge badge-ghost">過去のルール</span>
                        )}
                      </td>
                      <td className="max-w-[200px] truncate">{rule.description}</td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            className="btn btn-xs btn-outline"
                            onClick={() => handleEditClick(rule)}
                            title="編集"
                          >
                            <HiOutlinePencilAlt />
                          </button>
                          <button
                            className="btn btn-xs btn-outline btn-error"
                            onClick={() => handleDeleteClick(rule.id)}
                            title="削除"
                          >
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
    </div>
  );
};

export default TaxRulesView;