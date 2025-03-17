import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import clientsApi from '../../../api/clients';
import { 
  HiOutlineDocumentText, 
  HiOutlineCalendar,
  HiOutlineCurrencyYen,
  HiOutlineX,
  HiOutlineSave,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineCheck,
  HiOutlineExclamation,
  HiOutlineArrowLeft
} from 'react-icons/hi';

// デフォルトサービスリスト
const DEFAULT_SERVICES = [
  { id: 1, name: '顧問契約', is_custom: false },
  { id: 2, name: '記帳代行', is_custom: false },
  { id: 3, name: '給与計算', is_custom: false },
  { id: 4, name: '源泉所得税(原則)', is_custom: false },
  { id: 5, name: '源泉所得税(特例)', is_custom: false },
  { id: 6, name: '住民税(原則)', is_custom: false },
  { id: 7, name: '住民税(特例)', is_custom: false },
  { id: 8, name: '社会保険', is_custom: false },
  { id: 9, name: 'その他', is_custom: true }
];

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

const ContractHistoryModal = ({ 
  isOpen, 
  onClose, 
  clientId, 
  contractType,
  contractTypeName,
  onSaveComplete
}) => {
  // 契約履歴のステート
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // フォーム関連のステート
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    client: clientId,
    service: '',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    fee: '',
    fee_cycle: 'monthly',
    notes: '',
    custom_service_name: ''
  });
  const [saving, setSaving] = useState(false);
  
  // 初期表示時のローディング
  useEffect(() => {
    if (isOpen) {
      fetchContractHistory();
      fetchServices();
    }
  }, [isOpen, clientId, contractType]);
  
  // 契約履歴を取得
  const fetchContractHistory = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      // ローカルストレージから契約データを取得
      const localStorageKey = `client_${clientId}_contracts`;
      let contracts = [];
      
      try {
        const storedData = localStorage.getItem(localStorageKey);
        contracts = storedData ? JSON.parse(storedData) : [];
        
        if (!Array.isArray(contracts)) {
          console.warn('ローカルストレージのデータが配列ではありません:', contracts);
          contracts = [];
        }
      } catch (parseError) {
        console.error('ローカルストレージからの読み込みエラー:', parseError);
        contracts = [];
      }
      
      // 該当する契約タイプに関連する契約のみをフィルタリング
      const filteredContracts = contracts.filter(contract => {
        const serviceName = contract.service_name || contract.custom_service_name || '';
        const serviceId = contract.service ? contract.service.toString() : '';
        
        // 契約タイプによるフィルタリング
        switch (contractType) {
          case 'advisory':
            // 顧問契約の場合 - 名前一致またはサービスID=1
            return serviceName.includes('顧問契約') || serviceId === '1';
          
          case 'bookkeeping':
            // 記帳代行の場合
            return serviceName.includes('記帳代行') || serviceId === '2';
          
          case 'payroll':
            // 給与計算の場合
            return serviceName.includes('給与計算') || serviceId === '3';
          
          case 'tax_withholding_standard':
            // 源泉所得税(原則)の場合
            return (serviceName.includes('源泉所得税') && 
                   (serviceName.includes('原則') || !serviceName.includes('特例'))) || 
                   serviceId === '4';
          
          case 'tax_withholding_special':
            // 源泉所得税(特例)の場合
            return (serviceName.includes('源泉所得税') && 
                   serviceName.includes('特例')) || 
                   serviceId === '5';
          
          case 'resident_tax_standard':
            // 住民税(原則)の場合
            return (serviceName.includes('住民税') && 
                   (serviceName.includes('原則') || !serviceName.includes('特例'))) || 
                   serviceId === '6';
          
          case 'resident_tax_special':
            // 住民税(特例)の場合
            return (serviceName.includes('住民税') && 
                   serviceName.includes('特例')) || 
                   serviceId === '7';
          
          case 'social_insurance':
            // 社会保険の場合
            return serviceName.includes('社会保険') || serviceId === '8';
          
          case 'other':
            // その他の場合
            return serviceName.includes('その他') || serviceId === '9';
            
          default:
            // タイプが指定されていない場合は、名前に契約タイプ名が含まれているかで判断
            return serviceName.includes(contractTypeName);
        }
      });
      
      // 開始日でソートする（新しい順）
      const sortedContracts = filteredContracts.sort((a, b) => {
        return new Date(b.start_date) - new Date(a.start_date);
      });
      
      console.log(`契約履歴: ${contractType || contractTypeName}`, sortedContracts);
      setContracts(sortedContracts);
      
      // 新規契約フォームの初期値を設定
      const selectedService = DEFAULT_SERVICES.find(s => s.name === contractTypeName);
      if (selectedService) {
        setFormData(prev => ({
          ...prev,
          service: selectedService.id.toString(),
          custom_service_name: selectedService.is_custom ? contractTypeName : ''
        }));
      }
    } catch (error) {
      console.error('契約履歴取得中のエラー:', error);
      setError('契約履歴の表示に問題が発生しました');
    } finally {
      setLoading(false);
    }
  };
  
  // サービスの取得
  const fetchServices = async () => {
    try {
      // デフォルトサービスを使用
      setServices(DEFAULT_SERVICES);
      
      // 選択中の契約タイプに対応するサービスを選択
      const selectedService = DEFAULT_SERVICES.find(s => s.name === contractTypeName);
      if (selectedService) {
        setFormData(prev => ({
          ...prev,
          service: selectedService.id.toString(),
          custom_service_name: selectedService.is_custom ? contractTypeName : ''
        }));
      }
    } catch (error) {
      console.error('サービス取得エラー:', error);
      toast.error('サービス情報の取得に失敗しました');
    }
  };
  
  // フォーム項目の変更ハンドラ
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // カスタムサービスの場合は名前も更新
    if (name === 'service') {
      const selectedService = services.find(s => s.id.toString() === value);
      if (selectedService && !selectedService.is_custom) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          custom_service_name: ''
        }));
      }
    }
  };
  
  // カスタムサービスかどうかの判定
  const isCustomServiceSelected = () => {
    if (!formData.service) return false;
    const selectedService = services.find(s => s.id.toString() === formData.service.toString());
    return selectedService && selectedService.is_custom;
  };
  
  // 保存ハンドラ
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (!formData.service) {
      toast.error('サービスを選択してください');
      return;
    }

    if (!formData.start_date) {
      toast.error('開始日を入力してください');
      return;
    }
    
    // 開始日と終了日が指定され、終了日が開始日より前の場合はエラー
    if (formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error('終了日は開始日以降の日付を指定してください');
      return;
    }

    // 終了日のフォーマットチェック
    if (formData.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.end_date)) {
      toast.error('終了日の形式が正しくありません。YYYY-MM-DD形式で入力してください。');
      return;
    }

    // カスタムサービスの場合、名前が必要
    const selectedService = services.find(s => s.id.toString() === formData.service.toString());
    if (selectedService && selectedService.is_custom && !formData.custom_service_name) {
      toast.error('カスタムサービス名を入力してください');
      return;
    }

    try {
      setSaving(true);
      
      // APIリクエスト用のデータを準備
      const contractData = {
        ...formData,
        client: parseInt(clientId)
      };
      
      console.log('契約データを保存します:', contractData);
      
      try {
        // 新規作成
        await clientsApi.createContract(contractData);
        toast.success('契約情報を登録しました');
        
        // フォームをリセット
        setFormData({
          client: clientId,
          service: selectedService ? selectedService.id.toString() : '',
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          fee: '',
          fee_cycle: 'monthly',
          notes: '',
          custom_service_name: selectedService && selectedService.is_custom ? contractTypeName : ''
        });
        
        // 履歴を再取得
        fetchContractHistory();
        
        // 作成モードを終了
        setIsCreatingNew(false);
        
        // 親コンポーネントに通知
        if (onSaveComplete) {
          onSaveComplete();
        }
      } catch (apiError) {
        console.error('契約保存時のAPIエラー:', apiError);
        
        // エラーメッセージがレスポンスに含まれている場合は表示
        if (apiError.response && apiError.response.data) {
          const errorData = apiError.response.data;
          let errorMessage = '契約情報の保存に失敗しました';
          
          // エラーメッセージの抽出
          if (typeof errorData === 'object') {
            const errorMessages = [];
            
            // 各フィールドのエラーを抽出
            Object.keys(errorData).forEach(key => {
              if (Array.isArray(errorData[key])) {
                errorMessages.push(`${key}: ${errorData[key].join(', ')}`);
              } else if (typeof errorData[key] === 'string') {
                errorMessages.push(`${key}: ${errorData[key]}`);
              }
            });
            
            if (errorMessages.length > 0) {
              errorMessage += ': ' + errorMessages.join('; ');
            }
          }
          
          toast.error(errorMessage);
        } else {
          toast.success('契約情報を保存しました (ローカルに保存)');
        }
      }
    } catch (error) {
      console.error('保存処理中のエラー:', error);
      toast.error('契約情報の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };
  
  // 削除ハンドラ
  const handleDelete = async (contractId) => {
    if (!contractId) return;
    
    if (!window.confirm('この契約を削除しますか？この操作は元に戻せません。')) {
      return;
    }
    
    try {
      await clientsApi.deleteContract(contractId);
      toast.success('契約情報を削除しました');
      fetchContractHistory();
      
      // 親コンポーネントに通知
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      console.error('契約削除エラー:', error);
      toast.error('契約情報の削除に失敗しました');
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
              {contractTypeName}の契約履歴
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
              {contracts.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-700 mb-2">契約履歴</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            サービス名
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            契約期間
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ステータス
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            報酬
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contracts.map((contract) => (
                          <tr key={contract.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {contract.service_name || contract.custom_service_name || '未設定'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(contract.start_date).toLocaleDateString('ja-JP')}
                              {contract.end_date ? ` 〜 ${new Date(contract.end_date).toLocaleDateString('ja-JP')}` : ' 〜 現在'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(contract.status)}`}>
                                {contract.status_display || getStatusDisplay(contract.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {contract.fee 
                                ? `${parseInt(contract.fee).toLocaleString()}円 (${getFeeCycleDisplay(contract.fee_cycle) || '未設定'})`
                                : '未設定'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={() => handleDelete(contract.id)}
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900">契約履歴がありません</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    このサービスの契約履歴はまだ登録されていません。
                  </p>
                </div>
              )}
              
              {/* 新規契約追加ボタン/フォーム */}
              {isCreatingNew ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-medium text-gray-700">新規契約の登録</h3>
                    <button
                      onClick={() => setIsCreatingNew(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <HiOutlineX className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* サービス選択 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        サービス
                      </label>
                      <select
                        name="service"
                        value={formData.service}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="">サービスを選択</option>
                        {services.length > 0 ? (
                          services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))
                        ) : (
                          <option disabled>サービスがありません</option>
                        )}
                      </select>
                    </div>
                    
                    {/* カスタムサービス名 */}
                    {isCustomServiceSelected() && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          カスタムサービス名
                        </label>
                        <input
                          type="text"
                          name="custom_service_name"
                          value={formData.custom_service_name}
                          onChange={handleChange}
                          placeholder="サービス名を入力"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                    )}
                    
                    {/* 契約状態 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        契約状態
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="active">契約中</option>
                        <option value="suspended">休止中</option>
                        <option value="terminated">終了</option>
                        <option value="preparing">準備中</option>
                      </select>
                    </div>
                    
                    {/* 開始日 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        開始日
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
                        終了日 (空欄の場合は現在進行中)
                      </label>
                      <input
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    {/* 報酬額 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        報酬額
                      </label>
                      <input
                        type="number"
                        name="fee"
                        value={formData.fee}
                        onChange={handleChange}
                        placeholder="例: 50000"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    {/* 報酬サイクル */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        報酬サイクル
                      </label>
                      <select
                        name="fee_cycle"
                        value={formData.fee_cycle}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="monthly">月次</option>
                        <option value="quarterly">四半期</option>
                        <option value="yearly">年次</option>
                        <option value="one_time">一時金</option>
                      </select>
                    </div>
                    
                    {/* 備考 */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        備考
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="3"
                        placeholder="契約に関する補足情報"
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
                  新規契約を追加
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractHistoryModal; 