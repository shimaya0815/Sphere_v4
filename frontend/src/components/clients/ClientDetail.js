import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientsApi } from '../../api';
import toast from 'react-hot-toast';
import FiscalYearForm from './FiscalYearForm';
import CheckSettingForm from './CheckSettingForm';
import FiscalYearTimeline from './FiscalYearTimeline';
import FiscalYearTaskGenerator from './FiscalYearTaskGenerator';
import { 
  HiOutlineOfficeBuilding, 
  HiOutlinePhone, 
  HiOutlineMail, 
  HiOutlineCalendar,
  HiOutlineIdentification,
  HiOutlineLocationMarker,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineClock,
  HiPencilAlt,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineBriefcase
} from 'react-icons/hi';

const ClientDetail = ({ id, client: initialClient }) => {
  // propsからidとclientを受け取る
  const navigate = useNavigate();
  const [client, setClient] = useState(initialClient || null);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [checkSettings, setCheckSettings] = useState([]);
  const [loading, setLoading] = useState(!initialClient);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [showFiscalYearForm, setShowFiscalYearForm] = useState(false);
  const [showCheckSettingForm, setShowCheckSettingForm] = useState(false);
  const [editingFiscalYear, setEditingFiscalYear] = useState(null);
  const [editingCheckSetting, setEditingCheckSetting] = useState(null);
  
  useEffect(() => {
    console.log('ClientDetail received id:', id, 'and client:', initialClient);
    
    // initialClientが提供された場合、それを使用
    if (initialClient) {
      setClient(initialClient);
      setLoading(false);
      
      // 関連データの取得
      if (id) {
        fetchFiscalYears();
        fetchCheckSettings();
      }
    } 
    // そうでなく、IDが提供されている場合は、データをフェッチ
    else if (id) {
      fetchClientData();
    } else {
      setError('クライアントIDが指定されていません');
      setLoading(false);
    }
  }, [id, initialClient]);
  
  const fetchClientData = async () => {
    setLoading(true);
    try {
      const clientData = await clientsApi.getClient(id);
      console.log('Fetched client data in component:', clientData);
      setClient(clientData);
      
      // 関連データの取得
      fetchFiscalYears();
      fetchCheckSettings();
      
      setError(null);
    } catch (error) {
      console.error('Error fetching client:', error);
      setError('クライアント情報の取得に失敗しました');
      toast.error('クライアント情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchFiscalYears = async () => {
    try {
      // APIエンドポイントは実際の実装に合わせて調整してください
      const response = await clientsApi.getFiscalYears(id);
      setFiscalYears(response);
    } catch (error) {
      console.error('Error fetching fiscal years:', error);
    }
  };
  
  const fetchCheckSettings = async () => {
    try {
      // APIエンドポイントは実際の実装に合わせて調整してください
      const response = await clientsApi.getCheckSettings(id);
      setCheckSettings(response);
    } catch (error) {
      console.error('Error fetching check settings:', error);
    }
  };
  
  // チェック種別の表示名を取得する関数
  const getCheckTypeDisplay = (type) => {
    const types = {
      'monthly': '月次チェック',
      'bookkeeping': '記帳代行',
      'tax_return': '税務申告書作成',
      'withholding_tax': '源泉所得税対応',
      'other': 'その他'
    };
    return types[type] || type;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-lg">
        <h3 className="text-lg font-medium">{error}</h3>
        <p className="mt-2">
          <button 
            onClick={() => navigate('/clients')}
            className="text-red-700 underline"
          >
            クライアント一覧に戻る
          </button>
        </p>
      </div>
    );
  }
  
  if (!client) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <HiOutlineOfficeBuilding className="mr-2" /> 
          {client.name}
          <span className="ml-3 text-sm px-2 py-1 rounded-full bg-blue-100 text-blue-800">
            {client.client_code}
          </span>
          <span className="ml-3 text-sm px-2 py-1 rounded-full bg-green-100 text-green-800">
            {client.contract_status_display || (
              client.contract_status === 'active' ? '契約中' :
              client.contract_status === 'suspended' ? '休止中' :
              client.contract_status === 'terminated' ? '解約' :
              client.contract_status === 'preparing' ? '契約準備中' : 
              client.contract_status
            )}
          </span>
        </h1>
        <div>
          <button 
            onClick={() => navigate(`/clients/${id}/edit`)}
            className="btn btn-outline btn-primary mr-2"
          >
            編集
          </button>
          <button 
            onClick={() => navigate('/clients')}
            className="btn btn-ghost"
          >
            一覧に戻る
          </button>
        </div>
      </div>
      
      <div className="tabs tabs-boxed mb-6">
        <button 
          className={`tab ${activeTab === 'basic' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          基本情報
        </button>
        <button 
          className={`tab ${activeTab === 'fiscal' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('fiscal')}
        >
          決算期管理
        </button>
        <button 
          className={`tab ${activeTab === 'check' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('check')}
        >
          業務チェック設定
        </button>
      </div>
      
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 基本情報カード */}
          <ClientBasicInfoCard client={client} />
          
          {/* 法人情報カード */}
          <ClientCorporateInfoCard client={client} />
          
          {/* 住所情報カード */}
          <ClientAddressCard client={client} />
          
          {/* 税務情報カード */}
          <ClientTaxInfoCard client={client} />
          
          {/* 給与情報カード */}
          <ClientSalaryInfoCard client={client} />
        </div>
      )}
      
      {activeTab === 'fiscal' && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">決算期管理</h2>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingFiscalYear(null);
                setShowFiscalYearForm(true);
              }}
            >
              <HiOutlinePlus className="mr-1" /> 決算期を追加
            </button>
          </div>
          
          {/* タイムラインチャート表示 */}
          {fiscalYears && fiscalYears.length > 0 && (
            <FiscalYearTimeline fiscalYears={fiscalYears} />
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {fiscalYears && fiscalYears.length > 0 ? (
              fiscalYears.map(fiscal => (
                <FiscalYearCard 
                  key={fiscal.id} 
                  fiscalYear={fiscal}
                  onEdit={() => {
                    setEditingFiscalYear(fiscal);
                    setShowFiscalYearForm(true);
                  }}
                  onDelete={async () => {
                    if (window.confirm(`決算期「第${fiscal.fiscal_period}期」を削除してもよろしいですか？`)) {
                      try {
                        await clientsApi.deleteFiscalYear(fiscal.id);
                        toast.success('決算期を削除しました');
                        fetchFiscalYears();
                      } catch (error) {
                        console.error('Error deleting fiscal year:', error);
                        toast.error('決算期の削除に失敗しました');
                      }
                    }
                  }}
                />
              ))
            ) : (
              <div className="col-span-2 bg-gray-50 p-6 rounded-lg text-center text-gray-500">
                決算期情報が登録されていません
              </div>
            )}
          </div>
          
          {/* タスク自動生成セクション */}
          {fiscalYears && fiscalYears.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">決算タスク管理</h3>
              
              {/* 未来または現在の決算期のみタスク生成を表示 */}
              {fiscalYears
                .filter(fy => new Date(fy.end_date) >= new Date())
                .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
                .slice(0, 1)
                .map(activeFiscalYear => (
                  <FiscalYearTaskGenerator 
                    key={activeFiscalYear.id}
                    fiscalYear={activeFiscalYear}
                    clientId={client.id}
                    clientName={client.name}
                    onTasksGenerated={() => {
                      toast.success('タスクが正常に生成されました');
                    }}
                  />
                ))
              }
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'check' && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">業務チェック設定</h2>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingCheckSetting(null);
                setShowCheckSettingForm(true);
              }}
            >
              <HiOutlinePlus className="mr-1" /> チェック設定を追加
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {checkSettings && checkSettings.length > 0 ? (
              checkSettings.map(setting => (
                <CheckSettingCard 
                  key={setting.id} 
                  checkSetting={setting}
                  onEdit={() => {
                    setEditingCheckSetting(setting);
                    setShowCheckSettingForm(true);
                  }}
                  onDelete={async () => {
                    if (window.confirm(`チェック設定「${getCheckTypeDisplay(setting.check_type)}」を削除してもよろしいですか？`)) {
                      try {
                        await clientsApi.deleteCheckSetting(setting.id);
                        toast.success('チェック設定を削除しました');
                        fetchCheckSettings();
                      } catch (error) {
                        console.error('Error deleting check setting:', error);
                        toast.error('チェック設定の削除に失敗しました');
                      }
                    }
                  }}
                />
              ))
            ) : (
              <div className="col-span-2 bg-gray-50 p-6 rounded-lg text-center text-gray-500">
                業務チェック設定が登録されていません
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* モーダルフォーム */}
      {showFiscalYearForm && (
        <FiscalYearForm 
          clientId={id}
          fiscalYear={editingFiscalYear}
          onClose={() => {
            setShowFiscalYearForm(false);
            setEditingFiscalYear(null);
          }}
          onSuccess={fetchFiscalYears}
        />
      )}
      
      {showCheckSettingForm && (
        <CheckSettingForm 
          clientId={id}
          checkSetting={editingCheckSetting}
          onClose={() => {
            setShowCheckSettingForm(false);
            setEditingCheckSetting(null);
          }}
          onSuccess={fetchCheckSettings}
        />
      )}
    </div>
  );
};

// 基本情報カード
const ClientBasicInfoCard = ({ client }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <HiOutlineOfficeBuilding className="mr-2" /> 基本情報
        </h3>
      </div>
      <div className="p-4">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500 w-1/3">名前</td>
              <td className="py-2">{client.name}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">クライアントコード</td>
              <td className="py-2">{client.client_code}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">契約状況</td>
              <td className="py-2">
                <span className={`badge ${
                  client.contract_status === 'active' ? 'badge-success' :
                  client.contract_status === 'suspended' ? 'badge-warning' :
                  client.contract_status === 'terminated' ? 'badge-error' :
                  'badge-ghost'
                }`}>
                  {client.contract_status_display || client.contract_status}
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">法人/個人</td>
              <td className="py-2">
                {client.corporate_individual_display || 
                 (client.corporate_individual === 'corporate' ? '法人' : 
                  client.corporate_individual === 'individual' ? '個人' : '-')}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">電話番号</td>
              <td className="py-2">{client.phone || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">メールアドレス</td>
              <td className="py-2">{client.email || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">タスク設定</td>
              <td className="py-2">
                {client.some_task_flag ? 
                  <span className="badge badge-success">有効</span> : 
                  <span className="badge badge-ghost">無効</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 法人情報カード
const ClientCorporateInfoCard = ({ client }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <HiOutlineBriefcase className="mr-2" /> 法人情報
        </h3>
      </div>
      <div className="p-4">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500 w-1/3">法人番号</td>
              <td className="py-2">{client.corporate_number || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">資本金</td>
              <td className="py-2">
                {client.capital ? `${Number(client.capital).toLocaleString()}円` : '-'}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">設立日・開業日</td>
              <td className="py-2">
                {client.establishment_date ? new Date(client.establishment_date).toLocaleDateString('ja-JP') : '-'}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">決算期（期）</td>
              <td className="py-2">{client.fiscal_year ? `第${client.fiscal_year}期` : '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">決算日</td>
              <td className="py-2">
                {client.fiscal_date ? new Date(client.fiscal_date).toLocaleDateString('ja-JP') : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 住所情報カード
const ClientAddressCard = ({ client }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <HiOutlineLocationMarker className="mr-2" /> 住所情報
        </h3>
      </div>
      <div className="p-4">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500 w-1/3">郵便番号</td>
              <td className="py-2">{client.postal_code || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">都道府県</td>
              <td className="py-2">{client.prefecture || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">市区町村</td>
              <td className="py-2">{client.city || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">番地</td>
              <td className="py-2">{client.street_address || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">建物名・部屋番号</td>
              <td className="py-2">{client.building || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">住所（完全）</td>
              <td className="py-2">
                {[
                  client.postal_code ? `〒${client.postal_code}` : '',
                  client.prefecture || '',
                  client.city || '',
                  client.street_address || '',
                  client.building || ''
                ].filter(Boolean).join(' ')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 税務情報カード
const ClientTaxInfoCard = ({ client }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <HiOutlineDocumentText className="mr-2" /> 税務情報
        </h3>
      </div>
      <div className="p-4">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500 w-1/3">eTax ID</td>
              <td className="py-2">{client.tax_eTax_ID || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">eLTAX ID</td>
              <td className="py-2">{client.tax_eLTAX_ID || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">納税者確認番号</td>
              <td className="py-2">{client.tax_taxpayer_confirmation_number || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">インボイスNo</td>
              <td className="py-2">{client.tax_invoice_no || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">インボイス登録日</td>
              <td className="py-2">
                {client.tax_invoice_registration_date ? 
                  new Date(client.tax_invoice_registration_date).toLocaleDateString('ja-JP') : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 給与情報カード
const ClientSalaryInfoCard = ({ client }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <HiOutlineCreditCard className="mr-2" /> 給与情報
        </h3>
      </div>
      <div className="p-4">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500 w-1/3">給与締め日</td>
              <td className="py-2">
                {client.salary_closing_day ? `${client.salary_closing_day}日` : '-'}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">給与支払月</td>
              <td className="py-2">
                {client.salary_payment_month === 'current' ? '当月' : 
                 client.salary_payment_month === 'next' ? '翌月' : 
                 client.salary_payment_month || '-'}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">給与支払日</td>
              <td className="py-2">
                {client.salary_payment_day ? `${client.salary_payment_day}日` : '-'}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">勤怠管理ソフト</td>
              <td className="py-2">{client.attendance_management_software || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 決算期カード
const FiscalYearCard = ({ fiscalYear, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <HiOutlineCalendar className="mr-2" /> 
          第{fiscalYear.fiscal_period}期
        </h3>
        <div className="flex space-x-2">
          <button 
            className="btn btn-ghost btn-xs"
            onClick={onEdit}
          >
            <HiPencilAlt />
          </button>
          <button 
            className="btn btn-ghost btn-xs text-red-500"
            onClick={onDelete}
          >
            <HiOutlineTrash />
          </button>
        </div>
      </div>
      <div className="p-4">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500 w-1/3">開始日</td>
              <td className="py-2">
                {new Date(fiscalYear.start_date).toLocaleDateString('ja-JP')}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">終了日</td>
              <td className="py-2">
                {new Date(fiscalYear.end_date).toLocaleDateString('ja-JP')}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">期間</td>
              <td className="py-2">
                {Math.round((new Date(fiscalYear.end_date) - new Date(fiscalYear.start_date)) / (1000 * 60 * 60 * 24))} 日間
              </td>
            </tr>
            {fiscalYear.description && (
              <tr>
                <td className="py-2 text-sm font-medium text-gray-500">備考</td>
                <td className="py-2">{fiscalYear.description}</td>
              </tr>
            )}
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">作成日時</td>
              <td className="py-2">
                {new Date(fiscalYear.created_at).toLocaleString('ja-JP')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 業務チェック設定カード
const CheckSettingCard = ({ checkSetting, onEdit, onDelete }) => {
  const getCheckTypeDisplay = (type) => {
    const types = {
      'monthly': '月次チェック',
      'bookkeeping': '記帳代行',
      'tax_return': '税務申告書作成',
      'withholding_tax': '源泉所得税対応',
      'other': 'その他'
    };
    return types[type] || type;
  };
  
  const getCycleDisplay = (cycle) => {
    const cycles = {
      'monthly': '毎月',
      'yearly': '毎年'
    };
    return cycles[cycle] || cycle;
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <HiOutlineClock className="mr-2" /> 
          {getCheckTypeDisplay(checkSetting.check_type)}
        </h3>
        <div className="flex items-center">
          {checkSetting.is_enabled ? (
            <span className="badge badge-success mr-3">有効</span>
          ) : (
            <span className="badge badge-ghost mr-3">無効</span>
          )}
          <div className="flex space-x-2">
            <button 
              className="btn btn-ghost btn-xs"
              onClick={onEdit}
            >
              <HiPencilAlt />
            </button>
            <button 
              className="btn btn-ghost btn-xs text-red-500"
              onClick={onDelete}
            >
              <HiOutlineTrash />
            </button>
          </div>
        </div>
      </div>
      <div className="p-4">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500 w-1/3">サイクル</td>
              <td className="py-2">
                {getCycleDisplay(checkSetting.cycle)}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">作成日</td>
              <td className="py-2">
                {checkSetting.create_day}日
              </td>
            </tr>
            <tr>
              <td className="py-2 text-sm font-medium text-gray-500">テンプレート</td>
              <td className="py-2">
                {checkSetting.template ? checkSetting.template.title : 'なし'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientDetail;