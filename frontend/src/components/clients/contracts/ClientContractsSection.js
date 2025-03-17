import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import clientsApi from '../../../api/clients';
import ClientContractForm from './ClientContractForm';
import ContractHistoryModal from './ContractHistoryModal';
import { 
  HiOutlineDocumentText, 
  HiOutlineCalendar,
  HiOutlineCurrencyYen,
  HiOutlinePlus,
  HiOutlinePencilAlt,
  HiOutlineRefresh,
  HiOutlineClipboardCheck,
  HiOutlineCheck,
  HiOutlineClipboard
} from 'react-icons/hi';

const ContractTypes = [
  { id: 'advisory', name: '顧問契約' },
  { id: 'bookkeeping', name: '記帳代行' },
  { id: 'payroll', name: '給与計算' },
  { id: 'tax_withholding_standard', name: '源泉所得税(原則)' },
  { id: 'tax_withholding_special', name: '源泉所得税(特例)' },
  { id: 'resident_tax_standard', name: '住民税(原則)' },
  { id: 'resident_tax_special', name: '住民税(特例)' },
  { id: 'social_insurance', name: '社会保険' },
  { id: 'other', name: 'その他' }
];

const ClientContractsSection = ({ clientId }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [contractStatuses, setContractStatuses] = useState({});
  
  // 履歴モーダル用のステート
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedContractType, setSelectedContractType] = useState(null);
  const [selectedContractTypeName, setSelectedContractTypeName] = useState('');

  // 契約データを取得
  const fetchContracts = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      console.log(`契約情報を取得中 - クライアントID: ${clientId}`);
      
      // まずローカルストレージをチェック
      const localStorageKey = `client_${clientId}_contracts`;
      let localData = [];
      
      try {
        const storedData = localStorage.getItem(localStorageKey);
        
        if (storedData) {
          localData = JSON.parse(storedData);
          
          if (!Array.isArray(localData)) {
            console.warn('ローカルストレージのデータが配列ではありません:', localData);
            localData = [];
          } else if (localData.length > 0) {
            console.log(`ローカルストレージから ${localData.length} 件の契約情報を読み込みました`);
          }
        } else {
          console.log('ローカルストレージに契約情報がありません');
        }
      } catch (localStorageError) {
        console.error('ローカルストレージからの読み込みエラー:', localStorageError);
      }
      
      // ローカルストレージにデータがあればそれを使用する
      if (localData.length > 0) {
        console.log('ローカルストレージのデータを使用します');
        setContracts(localData);
        updateContractStatusMap(localData);
        setError(null);
      } else {
        // ローカルストレージにデータがない場合は空の配列を設定
        console.log('契約データがないため、空の契約リストを表示します');
        setContracts([]);
        updateContractStatusMap([]);
        setError(null);
        
        // 開発環境でのみAPIリクエストを試行（オプション）
        if (process.env.NODE_ENV === 'development' && false) { // falseにして無効化
          try {
            console.log('開発環境: APIからの契約データ取得を試みます');
            const response = await clientsApi.getClientContracts(clientId);
            if (response && Array.isArray(response) && response.length > 0) {
              console.log('APIから契約データを取得しました');
              // データをローカルストレージに保存
              localStorage.setItem(localStorageKey, JSON.stringify(response));
              setContracts(response);
              updateContractStatusMap(response);
            }
          } catch (apiError) {
            // APIエラーは無視
            console.log('APIエンドポイントは利用できません');
          }
        }
      }
    } catch (error) {
      console.error('契約情報取得中のエラー:', error);
      setError(`契約情報の表示に問題が発生しました`);
      setContracts([]);
      updateContractStatusMap([]);
    } finally {
      setLoading(false);
    }
  };
  
  // 契約ステータスマップの更新（共通処理を関数化）
  const updateContractStatusMap = (contractsData) => {
    const statusMap = {};
    ContractTypes.forEach(type => {
      // 対応する契約があるか確認
      const existingContract = contractsData.find(contract => {
        const serviceName = contract.service_name || contract.custom_service_name || '';
        
        // 特殊なマッピング処理（既存の契約を新しい契約タイプに紐付ける）
        if (type.id === 'tax_withholding_standard' && serviceName.includes('源泉所得税') && 
            (serviceName.includes('原則') || !serviceName.includes('特例'))) {
          return true;
        }
        if (type.id === 'tax_withholding_special' && serviceName.includes('源泉所得税') && 
            serviceName.includes('特例')) {
          return true;
        }
        if (type.id === 'resident_tax_standard' && serviceName.includes('住民税') && 
            (serviceName.includes('原則') || !serviceName.includes('特例'))) {
          return true;
        }
        if (type.id === 'resident_tax_special' && serviceName.includes('住民税') && 
            serviceName.includes('特例')) {
          return true;
        }
        
        // 通常のマッチング（名前が含まれているかどうか）
        return serviceName.includes(type.name);
      });
      
      statusMap[type.id] = {
        exists: !!existingContract,
        status: existingContract?.status || 'none',
        contract: existingContract
      };
    });
    
    setContractStatuses(statusMap);
  };

  // 初回レンダリング時にデータ取得
  useEffect(() => {
    fetchContracts();
  }, [clientId]);

  // 契約編集の開始
  const handleEditContract = (contract) => {
    setEditingContract(contract);
    setShowForm(true);
  };

  // 新規契約追加の開始
  const handleAddContract = (contractType = null) => {
    setEditingContract(null);
    setShowForm(true);
    // 選択された契約タイプを記憶
    window.selectedContractType = contractType;
  };

  // フォームのキャンセル
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingContract(null);
  };

  // 契約保存後の処理
  const handleSaveContract = () => {
    setShowForm(false);
    setEditingContract(null);
    fetchContracts();
  };

  // 契約削除後の処理
  const handleDeleteContract = () => {
    setShowForm(false);
    setEditingContract(null);
    fetchContracts();
  };

  // 契約履歴モーダルを表示
  const handleShowHistory = (contractType, contractTypeName) => {
    setSelectedContractType(contractType);
    setSelectedContractTypeName(contractTypeName);
    setShowHistoryModal(true);
  };

  // 履歴モーダルからの保存完了時の処理
  const handleHistorySaveComplete = () => {
    fetchContracts();
  };

  // 契約状態に応じたバッジのスタイルを取得
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 契約状態の表示名を取得
  const getStatusDisplay = (status) => {
    const statusMap = {
      'active': '契約中',
      'suspended': '休止中',
      'terminated': '終了',
      'preparing': '準備中',
      'none': '未設定'
    };
    return statusMap[status] || status;
  };

  // 報酬サイクルの表示名を取得
  const getFeeCycleDisplay = (cycle) => {
    const cycleMap = {
      'monthly': '月次',
      'quarterly': '四半期',
      'yearly': '年次',
      'one_time': '一時金'
    };
    return cycleMap[cycle] || cycle;
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">契約情報</h3>
          <div className="flex space-x-2">
            <button
              onClick={fetchContracts}
              disabled={loading}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <HiOutlineRefresh className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              更新
            </button>
            <button
              onClick={() => handleAddContract()}
              disabled={loading}
              className="flex items-center text-sm bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1 rounded-md"
            >
              <HiOutlinePlus className="mr-1" />
              新規契約
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700">
          <p>{error}</p>
        </div>
      )}

      {showForm ? (
        <div className="p-4">
          <ClientContractForm
            clientId={clientId}
            contract={editingContract}
            contractType={window.selectedContractType}
            onSave={handleSaveContract}
            onCancel={handleCancelForm}
            onDelete={handleDeleteContract}
          />
        </div>
      ) : (
        <>
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="p-4">
              <table className="w-full table-auto border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">契約タイプ</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">契約状況</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">契約期間</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">報酬</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {ContractTypes.map(type => {
                    const contractStatus = contractStatuses[type.id] || { exists: false, status: 'none' };
                    const contract = contractStatus.contract;
                    
                    return (
                      <tr 
                        key={type.id} 
                        className={`border-b hover:bg-gray-50 ${contractStatus.exists ? '' : 'opacity-60'}`}
                      >
                        <td className="px-4 py-3 font-medium">
                          {type.name}
                        </td>
                        <td className="px-4 py-3">
                          {contractStatus.exists ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(contractStatus.status)}`}>
                              {getStatusDisplay(contractStatus.status)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">未登録</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {contractStatus.exists && contract.start_date ? (
                            <>
                              {new Date(contract.start_date).toLocaleDateString('ja-JP')}
                              {contract.end_date && ` 〜 ${new Date(contract.end_date).toLocaleDateString('ja-JP')}`}
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {contractStatus.exists && contract.fee ? (
                            `${parseInt(contract.fee).toLocaleString()}円 (${getFeeCycleDisplay(contract.fee_cycle) || '未設定'})`
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleShowHistory(type.id, type.name)}
                              className="text-gray-600 hover:text-gray-800"
                              title="履歴を表示"
                            >
                              <HiOutlineClipboard className="h-5 w-5" />
                            </button>
                            
                            {contractStatus.exists ? (
                              <button
                                onClick={() => handleEditContract(contract)}
                                className="text-primary-600 hover:text-primary-800"
                                title="編集"
                              >
                                <HiOutlinePencilAlt className="h-5 w-5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddContract(type.id)}
                                className="text-green-600 hover:text-green-800"
                                title="登録"
                              >
                                <HiOutlinePlus className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {contracts.length > 0 && contracts.some(contract => {
                    // 定義済みの契約タイプに含まれていない契約を探す
                    const contractTypeName = contract.service_name || contract.custom_service_name || '';
                    return !ContractTypes.some(type => contractTypeName.includes(type.name));
                  }) && (
                    // 追加の契約（定義済みタイプ以外）を表示するセクション
                    <>
                      <tr className="border-b bg-gray-50">
                        <td colSpan="5" className="px-4 py-2 text-sm font-medium text-gray-600">
                          その他の契約
                        </td>
                      </tr>
                      
                      {contracts.filter(contract => {
                        const contractTypeName = contract.service_name || contract.custom_service_name || '';
                        return !ContractTypes.some(type => contractTypeName.includes(type.name));
                      }).map(contract => (
                        <tr key={contract.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">
                            {contract.service_name || contract.custom_service_name || 'サービス未設定'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(contract.status)}`}>
                              {contract.status_display || getStatusDisplay(contract.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {contract.start_date 
                              ? new Date(contract.start_date).toLocaleDateString('ja-JP')
                              : '開始日未設定'}
                            {contract.end_date && 
                              ` 〜 ${new Date(contract.end_date).toLocaleDateString('ja-JP')}`}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {contract.fee 
                              ? `${parseInt(contract.fee).toLocaleString()}円 (${getFeeCycleDisplay(contract.fee_cycle) || '未設定'})`
                              : '未設定'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleEditContract(contract)}
                              className="text-primary-600 hover:text-primary-800"
                              title="編集"
                            >
                              <HiOutlinePencilAlt className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
              
              {contracts.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <HiOutlineClipboardCheck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">契約情報がまだ登録されていません</h3>
                  <p className="text-sm mb-4">
                    上記の各契約タイプの登録ボタンから、必要な契約を追加してください。
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      {/* 契約履歴モーダル */}
      <ContractHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        clientId={clientId}
        contractType={selectedContractType}
        contractTypeName={selectedContractTypeName}
        onSaveComplete={handleHistorySaveComplete}
      />
    </div>
  );
};

export default ClientContractsSection; 