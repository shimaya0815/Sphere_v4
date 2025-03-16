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

const ClientContractForm = ({ 
  clientId, 
  contract = null, 
  onSave = () => {}, 
  onCancel = () => {}, 
  onDelete = () => {}
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState([]);
  const [customService, setCustomService] = useState('');

  const [formData, setFormData] = useState({
    client: clientId,
    service: '',
    status: 'active',
    start_date: '',
    end_date: '',
    fee: '',
    fee_cycle: 'monthly',
    notes: '',
    custom_service_name: ''
  });

  // 契約サービス一覧を取得
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const response = await clientsApi.getContractServices();
        if (Array.isArray(response)) {
          setServices(response);
        } else if (response && response.results) {
          setServices(response.results);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
        toast.error('サービス一覧の取得に失敗しました');
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
  }, [clientId, contract]);

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
    e.preventDefault();
    
    if (!formData.service) {
      toast.error('サービスを選択してください');
      return;
    }

    if (!formData.start_date) {
      toast.error('開始日を入力してください');
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
      
      // 新規作成または更新
      if (contract && contract.id) {
        await clientsApi.updateContract(contract.id, formData);
        toast.success('契約情報を更新しました');
      } else {
        await clientsApi.createContract(formData);
        toast.success('契約情報を登録しました');
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving contract:', error);
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
      await clientsApi.deleteContract(contract.id);
      toast.success('契約情報を削除しました');
      onDelete();
    } catch (error) {
      console.error('Error deleting contract:', error);
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
        <form onSubmit={handleSubmit}>
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
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
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
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineCalendar className="text-gray-400" />
                </div>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  className="pl-10 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineCalendar className="text-gray-400" />
                </div>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="pl-10 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">報酬額</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineCurrencyYen className="text-gray-400" />
                </div>
                <input
                  type="number"
                  name="fee"
                  value={formData.fee}
                  onChange={handleChange}
                  placeholder="例: 50000"
                  className="pl-10 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
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
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <div className="relative">
              <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                <HiOutlineDocumentText className="text-gray-400" />
              </div>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="pl-10 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="契約に関する備考や特記事項があれば入力してください"
              ></textarea>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md shadow-sm text-sm flex items-center"
            >
              <HiOutlineSave className="mr-2" />
              {saving ? '保存中...' : (contract && contract.id ? '更新する' : '登録する')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ClientContractForm; 