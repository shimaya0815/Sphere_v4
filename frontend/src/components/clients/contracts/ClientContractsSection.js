import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import clientsApi from '../../../api/clients';
import ClientContractForm from './ClientContractForm';
import { 
  HiOutlineDocumentText, 
  HiOutlineCalendar,
  HiOutlineCurrencyYen,
  HiOutlinePlus,
  HiOutlinePencilAlt,
  HiOutlineRefresh
} from 'react-icons/hi';

const ClientContractsSection = ({ clientId }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // 契約データを取得
  const fetchContracts = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      console.log(`Fetching contracts for client ID: ${clientId}`);
      const data = await clientsApi.getClientContracts(clientId);
      console.log('Contracts data received:', data);
      setContracts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setError(`契約情報の取得に失敗しました: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
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
  const handleAddContract = () => {
    setEditingContract(null);
    setShowForm(true);
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
              onClick={handleAddContract}
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
            onSave={handleSaveContract}
            onCancel={handleCancelForm}
            onDelete={handleDeleteContract}
          />
        </div>
      ) : (
        <>
          {loading && !contracts.length ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>契約情報がまだ登録されていません</p>
              <button
                onClick={handleAddContract}
                className="mt-2 inline-flex items-center text-primary-600 hover:text-primary-900"
              >
                <HiOutlinePlus className="mr-1" />
                新規契約を追加
              </button>
            </div>
          ) : (
            <div className="p-4">
              <table className="w-full table-auto border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">サービス名</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">契約状態</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">期間</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">報酬</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(contract => (
                    <tr key={contract.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {contract.service_name || 'サービス未設定'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(contract.status)}`}>
                          {contract.status_display || contract.status}
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
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientContractsSection; 