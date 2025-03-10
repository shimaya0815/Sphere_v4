import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clientsApi from '../../api/clients';
import toast from 'react-hot-toast';
import FiscalYearManagement from './FiscalYearManagement';
import TaxRulesView from './tax/TaxRulesView';
import ServiceCheckSettings from './ServiceCheckSettings';
import { 
  HiOutlineOfficeBuilding, 
  HiOutlinePhone, 
  HiOutlineMail, 
  HiOutlineGlobeAlt,
  HiOutlineUser,
  HiOutlineCalendar,
  HiOutlineIdentification,
  HiOutlineBriefcase,
  HiOutlineDocumentText,
  HiOutlineLocationMarker,
  HiOutlineCreditCard,
  HiOutlineClipboardCheck,
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlineTemplate,
  HiPencilAlt,
  HiOutlineTrash
} from 'react-icons/hi';

const ClientForm = ({ clientId = null, initialData = null }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(clientId ? true : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // 追加のステート変数
  const [fiscalYears, setFiscalYears] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    client_code: '',
    corporate_individual: 'corporate',
    corporate_number: '',
    postal_code: '',
    prefecture: '',
    city: '',
    street_address: '',
    building: '',
    phone: '',
    email: '',
    capital: '',
    establishment_date: '',
    tax_eTax_ID: '',
    tax_eLTAX_ID: '',
    tax_taxpayer_confirmation_number: '',
    tax_invoice_no: '',
    tax_invoice_registration_date: '',
    salary_closing_day: '',
    salary_payment_month: 'next',
    salary_payment_day: '',
    attendance_management_software: '',
    fiscal_year: '',
    fiscal_date: '',
    contract_status: 'active',
    user: null
  });
  
  // This effect automatically selects the template tab when editing any client
  useEffect(() => {
    // If we're in edit mode (clientId exists), show the template tab
    if (clientId) {
      console.log(`Editing client ID ${clientId} - template tab available`);
      // When loading completes, we'll highlight the template tab
      if (!loading && activeTab === 'service_settings') {
        console.log('Highlighting template tab for client edit');
        // Apply any special logic for template tab here if needed
      }
    }
  }, [clientId, loading, activeTab]);
  
  useEffect(() => {
    // If initialData is provided, use it
    if (initialData) {
      setFormData(initialData);
      setLoading(false);
      
      // If we have a clientId, still fetch the related data
      if (clientId) {
        fetchRelatedData();
      }
      return;
    }
    
    // Otherwise, if clientId is provided, fetch the client data
    if (clientId) {
      fetchClient();
    }
  }, [clientId, initialData]);
  
  const fetchClient = async () => {
    try {
      const data = await clientsApi.getClient(clientId);
      setFormData(data);
      setError(null);
      
      // Fetch related data after getting the client
      fetchRelatedData();
    } catch (error) {
      console.error('Error fetching client:', error);
      setError('クライアント情報の取得に失敗しました');
      toast.error('クライアント情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRelatedData = async () => {
    if (!clientId) return;
    
    try {
      // Fetch fiscal years
      const fiscalYearsData = await clientsApi.getFiscalYears(clientId);
      setFiscalYears(fiscalYearsData);
    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('クライアント名は必須です');
      return;
    }
    
    if (!formData.client_code) {
      toast.error('クライアントコードは必須です');
      return;
    }
    
    setSaving(true);
    
    // 数値型のフィールドを適切に処理
    const submitData = {
      ...formData,
      fiscal_year: formData.fiscal_year ? parseInt(formData.fiscal_year, 10) : null,
      salary_closing_day: formData.salary_closing_day ? parseInt(formData.salary_closing_day, 10) : null,
      salary_payment_day: formData.salary_payment_day ? parseInt(formData.salary_payment_day, 10) : null,
      capital: formData.capital ? parseFloat(formData.capital) : null,
      fiscal_date: formData.fiscal_date && formData.fiscal_date.trim() !== '' ? formData.fiscal_date : null,
      establishment_date: formData.establishment_date && formData.establishment_date.trim() !== '' ? formData.establishment_date : null,
      tax_invoice_registration_date: formData.tax_invoice_registration_date && formData.tax_invoice_registration_date.trim() !== '' ? formData.tax_invoice_registration_date : null
    };
    
    try {
      if (clientId) {
        // Update existing client
        await clientsApi.updateClient(clientId, submitData);
        toast.success('クライアント情報を更新しました');
      } else {
        // Create new client
        console.log('Submitting client data:', submitData);
        const newClient = await clientsApi.createClient(submitData);
        console.log('New client created:', newClient);
        console.log('Client ID from response:', newClient.id);
        console.log('Full response structure:', JSON.stringify(newClient));
        
        if (newClient && newClient.id) {
          // 新規クライアント作成後に自動的にタスクテンプレートを適用する処理
          try {
            console.log('Automatically applying default templates for new client:', newClient.id);
            // クライアントのタスクテンプレート一覧を取得
            const clientTemplates = await clientsApi.getClientTaskTemplates(newClient.id);
            
            // 利用可能なテンプレートとスケジュールを取得
            let templatesData, schedulesData;
            try {
              [templatesData, schedulesData] = await Promise.all([
                clientsApi.getTaskTemplates(),
                clientsApi.getTaskTemplateSchedules()
              ]);
              
              console.log('Templates API response:', templatesData);
              console.log('Schedules API response:', schedulesData);
            } catch (err) {
              console.error('Error fetching templates or schedules:', err);
              toast.error('テンプレートのフェッチに失敗しました');
              return;
            }
            
            // APIレスポンスを正規化してエラーを防ぐ
            const templates = Array.isArray(templatesData) ? templatesData : 
                             (templatesData && templatesData.results ? templatesData.results : []);
            
            const schedules = Array.isArray(schedulesData) ? schedulesData : 
                             (schedulesData && schedulesData.results ? schedulesData.results : []);
                             
            console.log('Normalized templates:', templates);
            console.log('Normalized schedules:', schedules);
            
            // デフォルトテンプレートの設定
            const templateMappings = [
              {
                name: "月次処理チェック",
                schedule: "月次スケジュール",
                description: "毎月の会計処理状況を確認するためのタスクです。",
              },
              {
                name: "記帳代行作業",
                schedule: "月次スケジュール",
                description: "月次の記帳代行を行うためのタスクです。",
              },
              {
                name: "決算・法人税申告業務",
                schedule: "決算スケジュール",
                description: "決算期の法人税申告書作成業務を行うためのタスクです。",
              },
              {
                name: "源泉所得税納付業務",
                schedule: "月末スケジュール",
                description: "毎月の源泉所得税の納付手続きを行うためのタスクです。",
              },
              {
                name: "住民税納付業務",
                schedule: "月次スケジュール",
                description: "従業員の住民税特別徴収の納付手続きを行うためのタスクです。",
              },
              {
                name: "社会保険手続き",
                schedule: "月次スケジュール",
                description: "社会保険関連の各種手続きを行うためのタスクです。",
              }
            ];
            
            // 準備OKメッセージを表示
            toast.loading('クライアントにタスクテンプレートを設定中...', { id: 'setup-templates' });
            
            // 今回作成したテンプレートを記録
            const createdTemplates = [];
            
            // 各デフォルトテンプレートを設定
            for (const mapping of templateMappings) {
              try {
                // 既存のクライアントテンプレートをチェック
                const existingTemplate = clientTemplates.find(t => t.title === mapping.name);
                
                if (existingTemplate) {
                  // 既に存在する場合はスキップ
                  console.log(`Template for ${mapping.name} already exists, skipping...`);
                  continue;
                }
                
                // APIレスポンスが配列でない場合の対応
                if (!Array.isArray(templates)) {
                  console.error('Templates is not an array:', templates);
                  console.log(`Cannot find template for ${mapping.name}, skipping...`);
                  continue;
                }
                
                // マッチするテンプレートを検索
                const template = templates.find(t => 
                  t.title === mapping.name || t.template_name === mapping.name
                );
                
                if (!template) {
                  console.log(`No matching template found for ${mapping.name}, skipping...`);
                  continue;
                }
                
                // APIレスポンスが配列でない場合の対応
                if (!Array.isArray(schedules)) {
                  console.error('Schedules is not an array:', schedules);
                  console.log(`Cannot find schedule for ${mapping.schedule}, skipping...`);
                  continue;
                }
                
                // スケジュールを再取得して最新のリストを確認
                let latestSchedules;
                try {
                  const schedulesResponse = await clientsApi.getTaskTemplateSchedules();
                  latestSchedules = Array.isArray(schedulesResponse) ? schedulesResponse : [];
                  console.log("Latest schedules before creating:", latestSchedules);
                } catch (err) {
                  console.error("Error fetching latest schedules:", err);
                  latestSchedules = schedules;
                }
                
                // 名前の完全一致または部分一致でスケジュールを検索
                let schedule = latestSchedules.find(s => 
                  s.name === mapping.schedule || 
                  (s.name && mapping.schedule && (
                    s.name.includes(mapping.schedule) || 
                    mapping.schedule.includes(s.name)
                  ))
                );
                
                if (schedule) {
                  console.log(`Found matching schedule for ${mapping.schedule}:`, schedule);
                } else {
                  console.log(`No matching schedule found for ${mapping.schedule}, creating new one...`);
                  
                  try {
                    // スケジュールタイプとリカレンスを決定
                    const scheduleType = mapping.schedule === "月次スケジュール" ? "monthly_start" : 
                                       mapping.schedule === "月末スケジュール" ? "monthly_end" :
                                       mapping.schedule === "決算スケジュール" ? "fiscal_relative" : "monthly_start";
                                       
                    const recurrence = mapping.schedule === "決算スケジュール" ? "yearly" : "monthly";
                    
                    // 一意なスケジュール名を生成（重複回避）
                    const timestamp = new Date().getTime().toString().slice(-4);
                    const uniqueName = `${mapping.schedule}_${timestamp}`;
                    
                    // スケジュールデータを準備
                    const scheduleData = {
                      name: uniqueName,
                      schedule_type: scheduleType,
                      recurrence: recurrence
                    };
                    
                    // スケジュールタイプに応じたデフォルト値を設定
                    if (scheduleType === 'monthly_start') {
                      scheduleData.creation_day = 1;  // 1日作成
                      scheduleData.deadline_day = 5;  // 5日締め切り
                    } else if (scheduleType === 'monthly_end') {
                      scheduleData.creation_day = 25;  // 25日作成
                      scheduleData.deadline_day = 10;  // 翌月10日締め切り
                      scheduleData.deadline_next_month = true;
                    } else if (scheduleType === 'fiscal_relative') {
                      // 決算日基準の場合
                      scheduleData.fiscal_date_reference = 'end_date';  // 終了日基準
                      scheduleData.deadline_day = 60;  // 決算日から60日後
                    }
                    
                    console.log(`Creating new schedule with data:`, scheduleData);
                    
                    // スケジュール作成APIを呼び出し
                    const newSchedule = await clientsApi.createTaskTemplateSchedule(scheduleData);
                    console.log(`Created new schedule:`, newSchedule);
                    schedule = newSchedule;
                  } catch (schErr) {
                    console.error(`Error creating schedule for ${mapping.schedule}:`, schErr);
                    
                    // エラーが重複キーのエラーの場合は、既存のスケジュールを再度検索
                    if (schErr.response && schErr.response.data && 
                        (schErr.response.data.includes('duplicate key') || 
                         schErr.response.data.includes('already exists'))) {
                      console.log("Duplicate key error detected, trying to find existing schedule");
                      
                      try {
                        // 最新のスケジュールを再取得
                        const refreshedSchedules = await clientsApi.getTaskTemplateSchedules();
                        const existingSchedule = Array.isArray(refreshedSchedules) ? 
                          refreshedSchedules.find(s => s.name === mapping.schedule) : null;
                          
                        if (existingSchedule) {
                          console.log(`Found existing schedule after error:`, existingSchedule);
                          schedule = existingSchedule;
                          // 見つかったのでcontinueしない
                        } else {
                          console.log(`Still cannot find schedule for ${mapping.schedule}, skipping...`);
                          continue; // テンプレート作成をスキップ
                        }
                      } catch (refreshErr) {
                        console.error("Error refreshing schedules after duplicate key error:", refreshErr);
                        continue; // テンプレート作成をスキップ
                      }
                    } else {
                      console.log(`Skipping template creation due to schedule error`);
                      continue; // テンプレート作成をスキップ
                    }
                  }
                }
                
                // テンプレートを作成
                const newTemplate = await clientsApi.createClientTaskTemplate(newClient.id, {
                  title: mapping.name,
                  description: mapping.description,
                  template_task: template.id,
                  schedule: schedule.id,
                  is_active: true
                });
                
                createdTemplates.push(newTemplate);
                console.log(`Created template for ${mapping.name} with schedule ${mapping.schedule}`);
              } catch (err) {
                console.error(`Error creating template for ${mapping.name}:`, err);
                // このテンプレートのエラーは無視して次へ
              }
            }
            
            // 設定完了メッセージを表示
            if (createdTemplates.length > 0) {
              toast.success(`${createdTemplates.length}個のタスクテンプレートを設定しました`, { id: 'setup-templates' });
            } else {
              toast.dismiss('setup-templates');
            }
          } catch (templateError) {
            console.error('Error setting up default templates:', templateError);
            toast.error('テンプレート設定中にエラーが発生しました');
            // テンプレート適用エラーでもクライアント作成は続行
          }
          
          toast.success('新規クライアントを作成しました');
          navigate(`/clients/${newClient.id}`);
        } else {
          console.error('Missing client ID in response');
          toast.error('クライアントIDの取得に失敗しました');
          // フォールバック: 一覧ページにリダイレクト
          navigate('/clients');
        }
      }
    } catch (error) {
      console.error('Error saving client:', error);
      console.error('Error details:', error.response?.data);
      
      // エラーメッセージをフォーマット
      let errorMsg = 'クライアント情報の保存に失敗しました';
      if (error.response?.data) {
        const errors = Object.entries(error.response.data)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
        errorMsg += `: ${errors}`;
      } else {
        errorMsg += `: ${error.message}`;
      }
      
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
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
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {clientId ? 'クライアント情報の編集' : '新規クライアント登録'}
        </h1>
        
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="btn btn-ghost"
            disabled={saving}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="loading loading-spinner loading-sm mr-2"></span>
                保存中...
              </>
            ) : (
              clientId ? '更新する' : '登録する'
            )}
          </button>
        </div>
      </div>

      {/* タブセクション */}
      <div className="tabs tabs-boxed mb-6">
        <button 
          className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
          type="button"
        >
          基本情報
        </button>
        <button 
          className={`tab ${activeTab === 'corporate' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('corporate')}
          type="button"
        >
          法人情報
        </button>
        <button 
          className={`tab ${activeTab === 'address' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('address')}
          type="button"
        >
          住所情報
        </button>
        <button 
          className={`tab ${activeTab === 'tax' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('tax')}
          type="button"
        >
          税務情報
        </button>
        <button 
          className={`tab ${activeTab === 'tax_rules' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('tax_rules')}
          type="button"
        >
          源泉/住民税
        </button>
        <button 
          className={`tab ${activeTab === 'salary' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('salary')}
          type="button"
        >
          給与情報
        </button>
        <button 
          className={`tab ${activeTab === 'fiscal' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('fiscal')}
          type="button"
        >
          決算期管理
        </button>
        <button 
          className={`tab ${activeTab === 'service_settings' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('service_settings')}
          type="button"
        >
          タスクテンプレート
        </button>
      </div>
      
      {/* 基本情報タブ */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <HiOutlineOfficeBuilding className="mr-2" />
              基本情報
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  クライアント名 <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                    <HiOutlineOfficeBuilding />
                  </span>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input input-bordered rounded-l-none w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="client_code" className="block text-sm font-medium text-gray-700 mb-1">
                  クライアントコード <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                    <HiOutlineIdentification />
                  </span>
                  <input
                    type="text"
                    id="client_code"
                    name="client_code"
                    value={formData.client_code}
                    onChange={handleChange}
                    className="input input-bordered rounded-l-none w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contract_status" className="block text-sm font-medium text-gray-700 mb-1">
                  契約状況
                </label>
                <select
                  id="contract_status"
                  name="contract_status"
                  value={formData.contract_status}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="active">契約中</option>
                  <option value="suspended">休止中</option>
                  <option value="terminated">解約</option>
                  <option value="preparing">契約準備中</option>
                </select>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  電話番号
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                    <HiOutlinePhone />
                  </span>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input input-bordered rounded-l-none w-full"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                    <HiOutlineMail />
                  </span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input input-bordered rounded-l-none w-full"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Webサイト
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                    <HiOutlineGlobeAlt />
                  </span>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="input input-bordered rounded-l-none w-full"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      
      {/* 法人情報タブ */}
      {activeTab === 'corporate' && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <HiOutlineBriefcase className="mr-2" />
              法人情報
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="corporate_individual" className="block text-sm font-medium text-gray-700 mb-1">
                  法人/個人
                </label>
                <select
                  id="corporate_individual"
                  name="corporate_individual"
                  value={formData.corporate_individual}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="corporate">法人</option>
                  <option value="individual">個人</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="corporate_number" className="block text-sm font-medium text-gray-700 mb-1">
                  法人番号
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                    <HiOutlineIdentification />
                  </span>
                  <input
                    type="text"
                    id="corporate_number"
                    name="corporate_number"
                    value={formData.corporate_number}
                    onChange={handleChange}
                    className="input input-bordered rounded-l-none w-full"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="fiscal_year" className="block text-sm font-medium text-gray-700 mb-1">
                  決算期（期）
                </label>
                <input
                  type="number"
                  id="fiscal_year"
                  name="fiscal_year"
                  value={formData.fiscal_year || ''}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>
              
              <div>
                <label htmlFor="fiscal_date" className="block text-sm font-medium text-gray-700 mb-1">
                  決算日
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                    <HiOutlineCalendar />
                  </span>
                  <input
                    type="date"
                    id="fiscal_date"
                    name="fiscal_date"
                    value={formData.fiscal_date || ''}
                    onChange={handleChange}
                    className="input input-bordered rounded-l-none w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 住所情報タブ */}
      {activeTab === 'address' && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <HiOutlineLocationMarker className="mr-2" />
              住所情報
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                  郵便番号
                </label>
                <input
                  type="text"
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label htmlFor="prefecture" className="block text-sm font-medium text-gray-700 mb-1">
                  都道府県
                </label>
                <input
                  type="text"
                  id="prefecture"
                  name="prefecture"
                  value={formData.prefecture}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  市区町村
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label htmlFor="street_address" className="block text-sm font-medium text-gray-700 mb-1">
                  番地
                </label>
                <input
                  type="text"
                  id="street_address"
                  name="street_address"
                  value={formData.street_address}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label htmlFor="building" className="block text-sm font-medium text-gray-700 mb-1">
                  建物名・部屋番号
                </label>
                <input
                  type="text"
                  id="building"
                  name="building"
                  value={formData.building}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 税務情報タブ */}
      {activeTab === 'tax' && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <HiOutlineDocumentText className="mr-2" />
              税務情報
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="tax_eTax_ID" className="block text-sm font-medium text-gray-700 mb-1">
                  eTax ID
                </label>
                <input
                  type="text"
                  id="tax_eTax_ID"
                  name="tax_eTax_ID"
                  value={formData.tax_eTax_ID}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>
              
              <div>
                <label htmlFor="tax_eLTAX_ID" className="block text-sm font-medium text-gray-700 mb-1">
                  eLTAX ID
                </label>
                <input
                  type="text"
                  id="tax_eLTAX_ID"
                  name="tax_eLTAX_ID"
                  value={formData.tax_eLTAX_ID}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>
              
              <div>
                <label htmlFor="tax_taxpayer_confirmation_number" className="block text-sm font-medium text-gray-700 mb-1">
                  納税者確認番号
                </label>
                <input
                  type="text"
                  id="tax_taxpayer_confirmation_number"
                  name="tax_taxpayer_confirmation_number"
                  value={formData.tax_taxpayer_confirmation_number}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>
              
              <div>
                <label htmlFor="tax_invoice_no" className="block text-sm font-medium text-gray-700 mb-1">
                  インボイスNo
                </label>
                <input
                  type="text"
                  id="tax_invoice_no"
                  name="tax_invoice_no"
                  value={formData.tax_invoice_no}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>
              
              <div>
                <label htmlFor="tax_invoice_registration_date" className="block text-sm font-medium text-gray-700 mb-1">
                  インボイス登録日
                </label>
                <input
                  type="date"
                  id="tax_invoice_registration_date"
                  name="tax_invoice_registration_date"
                  value={formData.tax_invoice_registration_date || ''}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 給与情報タブ */}
      {activeTab === 'salary' && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <HiOutlineCreditCard className="mr-2" />
              給与情報
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="salary_closing_day" className="block text-sm font-medium text-gray-700 mb-1">
                  給与締め日
                </label>
                <input
                  type="number"
                  id="salary_closing_day"
                  name="salary_closing_day"
                  value={formData.salary_closing_day || ''}
                  onChange={handleChange}
                  min="1"
                  max="31"
                  className="input input-bordered w-full"
                />
              </div>
              
              <div>
                <label htmlFor="salary_payment_month" className="block text-sm font-medium text-gray-700 mb-1">
                  給与支払月
                </label>
                <select
                  id="salary_payment_month"
                  name="salary_payment_month"
                  value={formData.salary_payment_month}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="current">当月</option>
                  <option value="next">翌月</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="salary_payment_day" className="block text-sm font-medium text-gray-700 mb-1">
                  給与支払日
                </label>
                <input
                  type="number"
                  id="salary_payment_day"
                  name="salary_payment_day"
                  value={formData.salary_payment_day || ''}
                  onChange={handleChange}
                  min="1"
                  max="31"
                  className="input input-bordered w-full"
                />
              </div>
              
              <div>
                <label htmlFor="attendance_management_software" className="block text-sm font-medium text-gray-700 mb-1">
                  勤怠管理ソフト
                </label>
                <input
                  type="text"
                  id="attendance_management_software"
                  name="attendance_management_software"
                  value={formData.attendance_management_software}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 決算期管理タブ */}
      {activeTab === 'fiscal' && (
        <div className="mt-6">
          {clientId ? (
            <FiscalYearManagement clientId={clientId} />
          ) : (
            <div className="alert alert-info">
              クライアントを作成してから決算期の管理を行ってください。先に基本情報を入力して登録してください。
            </div>
          )}
        </div>
      )}
      
      
      {/* 源泉所得税・住民税ルールタブ */}
      {activeTab === 'tax_rules' && (
        <div className="mt-6">
          {clientId ? (
            <TaxRulesView clientId={clientId} />
          ) : (
            <div className="alert alert-info">
              クライアントを作成してから源泉所得税・住民税ルールの管理を行ってください。先に基本情報を入力して登録してください。
            </div>
          )}
        </div>
      )}
      
      {/* サービス設定タブ */}
      {activeTab === 'service_settings' && (
        <div>
          {clientId ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <HiOutlineClipboardCheck className="mr-2" /> タスクテンプレート
              </h3>
              <ServiceCheckSettings clientId={clientId} />
            </div>
          ) : (
            <div className="alert alert-info">
              クライアントを作成してからサービス設定を行ってください。先に基本情報を入力して登録してください。
            </div>
          )}
        </div>
      )}

      {/* ボタンナビゲーション */}
      <div className="flex justify-between mt-6">
        <div>
          {activeTab !== 'overview' && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                const tabs = ['overview', 'corporate', 'address', 'tax', 'tax_rules', 'salary', 'fiscal', 'templates', 'service_settings'];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex > 0) {
                  setActiveTab(tabs[currentIndex - 1]);
                }
              }}
            >
              前のステップ
            </button>
          )}
        </div>
        
        <div className="flex space-x-2">
          {!clientId && activeTab === 'overview' && (
            <button
              type="submit"
              className="btn btn-success"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  保存中...
                </>
              ) : '登録する'}
            </button>
          )}
          
          {clientId && (
            <button
              type="submit"
              className="btn btn-success"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  保存中...
                </>
              ) : '更新する'}
            </button>
          )}
          
          {activeTab !== 'service_settings' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const tabs = ['overview', 'corporate', 'address', 'tax', 'tax_rules', 'salary', 'fiscal', 'templates', 'service_settings'];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex < tabs.length - 1) {
                  setActiveTab(tabs[currentIndex + 1]);
                }
              }}
            >
              次のステップ
            </button>
          )}
        </div>
      </div>
      
    </form>
  );
};

export default ClientForm;