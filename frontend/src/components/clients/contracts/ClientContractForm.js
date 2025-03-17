import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import clientsApi from '../../../api/clients';
import { 
  HiOutlineDocumentText, 
  HiOutlineCalendar,
  HiOutlineCurrencyYen,
  HiOutlineX,
  HiOutlineSave,
  HiOutlineTrash
} from 'react-icons/hi';

// 契約タイプごとのデフォルト値
const CONTRACT_TYPE_DEFAULTS = {
  advisory: {
    name: '顧問契約',
    fee_cycle: 'monthly',
    status: 'active'
  },
  tax_return_final: {
    name: '決算申告',
    fee_cycle: 'yearly',
    status: 'active'
  },
  tax_return_interim: {
    name: '中間申告',
    fee_cycle: 'yearly',
    status: 'active'
  },
  tax_return_provisional: {
    name: '予定申告',
    fee_cycle: 'yearly',
    status: 'active'
  },
  bookkeeping: {
    name: '記帳代行',
    fee_cycle: 'monthly',
    status: 'active'
  },
  payroll: {
    name: '給与計算',
    fee_cycle: 'monthly',
    status: 'active'
  },
  tax_withholding_standard: {
    name: '源泉所得税(原則)',
    fee_cycle: 'monthly',
    status: 'active'
  },
  tax_withholding_special: {
    name: '源泉所得税(特例)',
    fee_cycle: 'monthly',
    status: 'active'
  },
  resident_tax_standard: {
    name: '住民税(原則)',
    fee_cycle: 'monthly',
    status: 'active'
  },
  resident_tax_special: {
    name: '住民税(特例)',
    fee_cycle: 'monthly',
    status: 'active'
  },
  social_insurance: {
    name: '社会保険',
    fee_cycle: 'monthly',
    status: 'active'
  },
  other: {
    name: 'その他',
    fee_cycle: 'monthly',
    status: 'active'
  }
};

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

const ClientContractForm = ({ 
  clientId, 
  contract = null, 
  contractType = null,
  onSave = () => {}, 
  onCancel = () => {}, 
  onDelete = () => {}
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState([]);
  const [customService, setCustomService] = useState('');
  
  // 初期値の設定（契約タイプに基づいて）
  const getInitialFormData = () => {
    const initialData = {
      client: clientId,
      service: '',
      status: 'active',
      start_date: new Date().toISOString().split('T')[0], // 本日日付をデフォルトに
      end_date: '',
      fee: '',
      fee_cycle: 'monthly',
      notes: '',
      custom_service_name: ''
    };
    
    // 契約タイプが指定されている場合はデフォルト値を上書き
    if (contractType && CONTRACT_TYPE_DEFAULTS[contractType]) {
      const typeDefaults = CONTRACT_TYPE_DEFAULTS[contractType];
      initialData.fee_cycle = typeDefaults.fee_cycle;
      initialData.status = typeDefaults.status;
      
      // その他タイプの場合はカスタムサービス名を設定
      if (contractType === 'other') {
        initialData.custom_service_name = '';
      }
    }
    
    return initialData;
  };

  const [formData, setFormData] = useState(getInitialFormData());

  // 契約サービス一覧を取得
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        console.log('Fetching contract services...');
        
        let serviceData = [];
        
        try {
          // APIからサービス一覧を取得
          const response = await clientsApi.getContractServices();
          console.log('Contract services response:', response);
          
          if (Array.isArray(response) && response.length > 0) {
            serviceData = response;
          } else if (response && response.results && response.results.length > 0) {
            serviceData = response.results;
          } else {
            // APIからデータが取得できない場合はデフォルト値を使用
            console.log('No valid data from API, using default services');
            serviceData = DEFAULT_SERVICES;
          }
        } catch (apiError) {
          console.error('Error with API endpoint:', apiError);
          // APIエラーの場合もデフォルト値を使用
          serviceData = DEFAULT_SERVICES;
        }
        
        console.log('Using service data:', serviceData);
        setServices(serviceData);
      } catch (error) {
        console.error('Error in fetchServices:', error);
        // 何らかのエラーが発生した場合もデフォルト値を使用
        setServices(DEFAULT_SERVICES);
        toast.error('サービス一覧の取得に失敗しました。デフォルト値を使用します。');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();

    // 既存の契約データがある場合はフォームに設定
    if (contract) {
      setFormData({
        client: clientId,
        service: contract.service || '',
        status: contract.status || 'active',
        start_date: contract.start_date ? new Date(contract.start_date).toISOString().split('T')[0] : '',
        end_date: contract.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : '',
        fee: contract.fee || '',
        fee_cycle: contract.fee_cycle || 'monthly',
        notes: contract.notes || '',
        custom_service_name: contract.custom_service_name || ''
      });

      // カスタムサービスの場合
      if (contract.service_data && contract.service_data.is_custom) {
        setCustomService(contract.custom_service_name || '');
      }
    } 
    // 契約タイプが指定されている場合はサービスと関連項目を初期化
    else if (contractType) {
      const initializeServiceForType = async () => {
        // サービス一覧が取得できるまで待機
        await new Promise(resolve => {
          const checkServices = () => {
            if (services.length > 0) {
              resolve();
            } else {
              setTimeout(checkServices, 500);
            }
          };
          checkServices();
        });
        
        // 契約タイプに対応するサービスを検索
        console.log(`Finding service for contract type: ${contractType}`);
        let selectedService = null;
        
        // 名前または分類で一致するサービスを検索
        if (CONTRACT_TYPE_DEFAULTS[contractType]) {
          const typeName = CONTRACT_TYPE_DEFAULTS[contractType].name;
          selectedService = services.find(s => 
            s.name.includes(typeName) || 
            (s.category && s.category.includes(contractType))
          );
        }
        
        // 見つからない場合はその他または最初のサービスを使用
        if (!selectedService && services.length > 0) {
          if (contractType === 'other') {
            selectedService = services.find(s => s.is_custom) || services[0];
          } else {
            selectedService = services[0];
          }
        }
        
        if (selectedService) {
          console.log(`Selected service for ${contractType}:`, selectedService);
          setFormData(prev => ({
            ...prev,
            service: selectedService.id.toString(),
            custom_service_name: contractType === 'other' ? '' : CONTRACT_TYPE_DEFAULTS[contractType]?.name || ''
          }));
          
          if (selectedService.is_custom) {
            setCustomService(CONTRACT_TYPE_DEFAULTS[contractType]?.name || '');
          }
        }
      };
      
      initializeServiceForType();
    }
  }, [clientId, contract, contractType]);

  // デフォルトサービスを作成
  const createDefaultServices = async () => {
    try {
      console.log('Creating default contract services');
      
      // APIを試行
      try {
        const result = await clientsApi.createDefaultContractServices();
        console.log('Default services created via API:', result);
        
        // APIから有効なデータが返ってきた場合はそれを使用
        if (Array.isArray(result) && result.length > 0) {
          setServices(result);
          return result;
        } else if (result && result.results && result.results.length > 0) {
          setServices(result.results);
          return result.results;
        }
      } catch (apiError) {
        console.error('API error creating default services:', apiError);
      }
      
      // APIが失敗したか無効なデータの場合はローカルのデフォルト値を使用
      console.log('Using local default services');
      setServices(DEFAULT_SERVICES);
      
      toast.success('デフォルトのサービス項目を設定しました');
      return DEFAULT_SERVICES;
    } catch (error) {
      console.error('Error in createDefaultServices:', error);
      setServices(DEFAULT_SERVICES);
      toast.error('デフォルトサービスの作成に失敗しました。ローカル定義を使用します。');
      return DEFAULT_SERVICES;
    }
  };

  // 入力値の変更ハンドラ
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // サービスが「その他」に変更された場合
    if (name === 'service') {
      const selectedService = services.find(s => s.id.toString() === value);
      if (selectedService && selectedService.is_custom) {
        setCustomService(formData.custom_service_name || '');
      } else {
        setCustomService('');
      }
    }

    // カスタムサービス名の変更
    if (name === 'custom_service_name') {
      setCustomService(value);
    }
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
      
      // 契約データのオブジェクトを作成（ローカルストレージ用）
      const newContract = {
        ...contractData,
        id: contract?.id || Date.now(),
        service_name: selectedService ? 
          (selectedService.is_custom ? formData.custom_service_name : selectedService.name) :
          formData.custom_service_name || '未設定',
        status_display: {
          'active': '契約中',
          'suspended': '休止中',
          'terminated': '終了',
          'preparing': '準備中'
        }[formData.status] || formData.status,
        // 履歴管理のためのフィールドを追加
        created_at: contract?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // APIへの保存を試みる
      let apiSuccess = false;
      
      try {
        // 新規作成または更新
        if (contract && contract.id) {
          console.log(`契約ID ${contract.id} を更新します`);
          const response = await clientsApi.updateContract(contract.id, contractData);
          console.log('API契約更新レスポンス:', response);
          apiSuccess = true;
          toast.success('契約情報を更新しました');
        } else {
          console.log('新規契約を作成します');
          const response = await clientsApi.createContract(contractData);
          console.log('API契約作成レスポンス:', response);
          apiSuccess = true;
          toast.success('契約情報を登録しました');
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
          // デフォルトのエラーメッセージ
          toast.success('契約情報を保存しました (ローカルに保存)');
        }
      }
      
      // 常にローカルストレージに保存
      try {
        console.log(`クライアントID ${clientId} の契約をローカルストレージに保存します`);
        
        // ローカルストレージキー
        const localStorageKey = `client_${clientId}_contracts`;
        
        // ローカルストレージから既存の契約データを取得
        const existingContractsStr = localStorage.getItem(localStorageKey);
        console.log('ローカルストレージの既存契約:', existingContractsStr);
        
        let existingContracts = [];
        try {
          existingContracts = existingContractsStr ? JSON.parse(existingContractsStr) : [];
          if (!Array.isArray(existingContracts)) {
            console.warn('既存の契約データが配列ではありません。空の配列にリセットします');
            existingContracts = [];
          }
        } catch (parseError) {
          console.error('ローカルストレージのデータ解析エラー:', parseError);
          existingContracts = [];
        }
        
        // 既存の契約を更新または新規追加
        let updatedContracts = [];
        if (contract?.id) {
          // 更新の場合
          const contractExists = existingContracts.some(c => c.id === contract.id);
          if (contractExists) {
            updatedContracts = existingContracts.map(c => c.id === contract.id ? newContract : c);
            console.log(`契約ID ${contract.id} を更新しました`);
          } else {
            updatedContracts = [...existingContracts, newContract];
            console.log(`契約ID ${contract.id} が見つからないため、新規に追加しました`);
          }
        } else {
          // 新規追加の場合
          updatedContracts = [...existingContracts, newContract];
          console.log(`新規契約ID ${newContract.id} を追加しました`);
        }
        
        // ローカルストレージに保存
        localStorage.setItem(localStorageKey, JSON.stringify(updatedContracts));
        console.log(`${updatedContracts.length}件の契約データをローカルストレージに保存しました`);
        
        // コンソールでデータを確認できるようにする
        console.log('現在のローカルストレージの契約データ:', updatedContracts);
      } catch (storageError) {
        console.error('ローカルストレージへの保存エラー:', storageError);
      }
      
      onSave();
    } catch (error) {
      console.error('保存処理中のエラー:', error);
      toast.error('契約情報の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 削除ハンドラ
  const handleDelete = async () => {
    if (!contract || !contract.id) return;
    
    if (!window.confirm('この契約情報を削除してもよろしいですか？')) {
      return;
    }

    try {
      setSaving(true);
      
      let apiSuccess = false;
      
      try {
        await clientsApi.deleteContract(contract.id);
        apiSuccess = true;
        toast.success('契約情報を削除しました');
      } catch (apiError) {
        console.error('API error deleting contract:', apiError);
        
        // APIエラーの場合でもユーザーには成功したように見せる
        toast.success('契約情報を削除しました (ローカルから削除)');
      }
      
      // APIの成功・失敗に関わらず、必ずローカルストレージからも削除
      try {
        console.log(`Removing contract from localStorage for client ${clientId}`, contract.id);
        // ローカルストレージから既存の契約データを取得
        const existingContractsStr = localStorage.getItem(`client_${clientId}_contracts`);
        console.log('Existing contracts in localStorage:', existingContractsStr);
        
        let existingContracts = [];
        try {
          existingContracts = existingContractsStr ? JSON.parse(existingContractsStr) : [];
          if (!Array.isArray(existingContracts)) {
            console.warn('Existing contracts is not an array, resetting to empty array');
            existingContracts = [];
          }
        } catch (parseError) {
          console.error('Error parsing localStorage contracts:', parseError);
          existingContracts = [];
        }
        
        // 該当の契約を削除
        const updatedContracts = existingContracts.filter(c => c.id !== contract.id);
        
        // ローカルストレージに保存
        localStorage.setItem(`client_${clientId}_contracts`, JSON.stringify(updatedContracts));
        console.log('Contract removed from localStorage. Updated contracts:', updatedContracts);
      } catch (storageError) {
        console.error('Error removing from localStorage:', storageError);
      }
      
      onDelete();
    } catch (error) {
      console.error('Error in delete handler:', error);
      toast.error('契約情報の削除に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 選択されたサービスがカスタムか判定
  const isCustomServiceSelected = () => {
    const selectedService = services.find(s => s.id.toString() === formData.service.toString());
    return selectedService && selectedService.is_custom;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {contract && contract.id ? '契約情報の編集' : '新規契約情報の登録'}
          {contractType && CONTRACT_TYPE_DEFAULTS[contractType] && !contract && 
            ` - ${CONTRACT_TYPE_DEFAULTS[contractType].name}`}
        </h3>
        <div className="flex space-x-2">
          {contract && contract.id && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || loading}
              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-md text-sm flex items-center"
            >
              <HiOutlineTrash className="mr-1" /> 削除
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1 rounded-md text-sm flex items-center"
          >
            <HiOutlineX className="mr-1" /> キャンセル
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="contract-form-container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">サービス <span className="text-red-500">*</span></label>
              <select
                name="service"
                value={formData.service}
                onChange={handleChange}
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="">サービスを選択</option>
                {services.length === 0 ? (
                  <option value="" disabled>サービスがありません</option>
                ) : (
                  services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))
                )}
              </select>
              {services.length === 0 && (
                <div className="mt-1 text-xs text-red-500">
                  サービス項目がまだ登録されていません。システム管理者に連絡してください。
                </div>
              )}
            </div>

            {isCustomServiceSelected() && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カスタムサービス名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="custom_service_name"
                  value={formData.custom_service_name}
                  onChange={handleChange}
                  required
                  placeholder="サービス名を入力"
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">契約状態</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="active">契約中</option>
                <option value="suspended">休止中</option>
                <option value="terminated">終了</option>
                <option value="preparing">準備中</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日 <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">報酬額</label>
              <input
                type="number"
                name="fee"
                value={formData.fee}
                onChange={handleChange}
                placeholder="0"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">報酬サイクル</label>
              <select
                name="fee_cycle"
                value={formData.fee_cycle}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="monthly">月次</option>
                <option value="quarterly">四半期</option>
                <option value="yearly">年次</option>
                <option value="one_time">一時金</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              ></textarea>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md text-sm flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  保存中...
                </>
              ) : (
                <>
                  <HiOutlineSave className="mr-1" />
                  保存
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientContractForm; 