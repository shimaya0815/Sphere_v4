import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../api';
import { HiOutlineTemplate, HiOutlinePencilAlt, HiOutlineCheck, HiOutlineRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';

// サービスカテゴリタイプのマッピング定義
const SERVICE_CATEGORIES = {
  monthly_check: 'monthly',
  bookkeeping: 'bookkeeping',
  tax_return: 'tax_return',
  income_tax: 'income_tax',
  residence_tax: 'residence_tax',
  social_insurance: 'social_insurance'
};

// サービス表示名のマッピング
const SERVICE_DISPLAY_NAMES = {
  monthly_check: '月次チェック',
  bookkeeping: '記帳代行',
  tax_return: '税務申告書作成',
  income_tax: '源泉所得税',
  residence_tax: '住民税対応',
  social_insurance: '社会保険対応'
};

// デフォルトサイクルのマッピング
const DEFAULT_CYCLES = {
  monthly_check: 'monthly',
  bookkeeping: 'monthly',
  tax_return: 'yearly',
  income_tax: 'monthly',
  residence_tax: 'yearly',
  social_insurance: 'monthly'
};

const ServiceCheckSettings = ({ clientId }) => {
  // サービス設定の初期状態
  const initialSettings = Object.keys(SERVICE_CATEGORIES).reduce((acc, service) => {
    acc[service] = {
      cycle: DEFAULT_CYCLES[service],
      enabled: false,
      template_id: null,
      customized: false
    };
    return acc;
  }, {});

  const [settings, setSettings] = useState({
    templates_enabled: true,
    ...initialSettings
  });
  
  const [templates, setTemplates] = useState([]);
  const [clientTemplates, setClientTemplates] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 初期データの取得
  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);
  
  const fetchData = async () => {
    setLoading(true);
    
    try {
      // テンプレートとスケジュールの取得（非同期で並列取得）
      // エラーがあっても続行できるよう、各APIは独立して呼び出す
      let templatesArray = [];
      let schedulesArray = [];
      let clientTemplatesArray = [];
      
      try {
        const templatesData = await clientsApi.getTaskTemplates();
        templatesArray = Array.isArray(templatesData) ? templatesData : [];
      } catch (error) {
        console.error('Error fetching task templates:', error);
      }
      
      try {
        const schedulesData = await clientsApi.getTaskTemplateSchedules();
        schedulesArray = Array.isArray(schedulesData) ? schedulesData : [];
      } catch (error) {
        console.error('Error fetching task template schedules:', error);
      }
      
      try {
        if (clientId) {
          const clientTemplatesData = await clientsApi.getClientTaskTemplates(clientId);
          clientTemplatesArray = Array.isArray(clientTemplatesData) ? clientTemplatesData : [];
        }
      } catch (error) {
        console.error('Error fetching client task templates:', error);
      }
      
      setTemplates(templatesArray);
      setSchedules(schedulesArray);
      setClientTemplates(clientTemplatesArray);
      
      // クライアントのテンプレート設定を基にサービス設定を構築
      const newSettings = {
        templates_enabled: clientTemplatesArray.length > 0,
        ...initialSettings
      };
      
      // クライアントのテンプレート設定から各サービスの設定を抽出
      Object.entries(SERVICE_CATEGORIES).forEach(([serviceKey, category]) => {
        // タイトルまたはカテゴリーでマッチするテンプレートを検索
        const templateForService = clientTemplatesArray.find(t => {
          if (!t) return false;
          
          const categoryMatch = t.category === category || 
                               (t.category?.name && t.category.name === category);
          const titleMatch = t.title && t.title.includes(SERVICE_DISPLAY_NAMES[serviceKey]);
          
          return categoryMatch || titleMatch;
        });
        
        if (templateForService) {
          // スケジュールを探す - IDまたはオブジェクトでの参照に対応
          const scheduleId = typeof templateForService.schedule === 'object' 
            ? templateForService.schedule?.id 
            : templateForService.schedule;
            
          const schedule = schedulesArray.find(s => s.id === scheduleId);
          
          newSettings[serviceKey] = {
            cycle: schedule ? getCycleFromSchedule(schedule, serviceKey) : DEFAULT_CYCLES[serviceKey],
            enabled: templateForService.is_active === undefined ? true : !!templateForService.is_active,
            template_id: templateForService.id,
            customized: templateForService.customized || false
          };
        }
      });
      
      setSettings(newSettings);
    } catch (error) {
      console.error('Error fetching settings data:', error);
      // エラーメッセージは表示しない - ユーザーに影響しないよう、デフォルト設定を使用
    } finally {
      setLoading(false);
    }
  };
  
  // スケジュールオブジェクトからサイクル値を抽出
  const getCycleFromSchedule = (schedule, serviceKey) => {
    const type = schedule.schedule_type;
    const recurrence = schedule.recurrence;
    
    if (recurrence === 'monthly') return 'monthly';
    if (recurrence === 'quarterly') return 'quarterly';
    if (recurrence === 'yearly' || type === 'fiscal_relative') return 'yearly';
    
    return DEFAULT_CYCLES[serviceKey] || 'monthly';
  };
  
  // フィールド変更ハンドラ
  const handleTemplatesEnabledChange = (e) => {
    setSettings({
      ...settings,
      templates_enabled: e.target.checked
    });
  };
  
  const handleServiceChange = (service, field, value) => {
    setSettings({
      ...settings,
      [service]: {
        ...settings[service],
        [field]: value
      }
    });
  };
  
  // テンプレート編集画面に移動するハンドラ
  const handleCustomize = (service, templateId) => {
    if (!templateId) {
      toast.error(`テンプレートを先に選択してください`);
      return;
    }
    
    // 既存のテンプレート編集機能を呼び出す
    const existingTemplate = clientTemplates.find(t => t.id === templateId);
    if (existingTemplate) {
      // テンプレート編集モーダルを開く（現在の実装では別コンポーネントとして存在）
      toast.success(`${SERVICE_DISPLAY_NAMES[service]} テンプレートをカスタマイズします`);
      // ClientTaskTemplateSettingsの編集機能を使うべきだが、現在の実装では直接呼び出せない
    }
  };
  
  // 設定保存ハンドラ
  const handleSave = async () => {
    setSaving(true);
    
    try {
      const updatePromises = [];
      
      // サービスごとにタスクテンプレートを更新または作成
      for (const [service, serviceSettings] of Object.entries(settings)) {
        if (service === 'templates_enabled') continue;
        
        const category = SERVICE_CATEGORIES[service];
        if (!category) continue;
        
        // テンプレートが有効で、テンプレートIDが選択されている場合
        if (settings.templates_enabled && serviceSettings.enabled && serviceSettings.template_id) {
          const existingTemplate = clientTemplates.find(t => t.id === serviceSettings.template_id);
          
          if (existingTemplate) {
            // 既存のテンプレートを更新（is_activeのみ更新）
            try {
              const updateData = {
                is_active: serviceSettings.enabled
              };
              
              const updatePromise = clientsApi.updateClientTaskTemplate(existingTemplate.id, updateData)
                .catch(error => {
                  console.error(`Error updating template ${existingTemplate.id}:`, error);
                  return null; // エラーがあっても処理を続行する
                });
                
              updatePromises.push(updatePromise);
            } catch (error) {
              console.error(`Error preparing update for template ${existingTemplate.id}:`, error);
            }
          }
        } 
        // テンプレートが無効化された場合
        else if (serviceSettings.template_id) {
          const existingTemplate = clientTemplates.find(t => t.id === serviceSettings.template_id);
          
          if (existingTemplate) {
            // テンプレートを無効化
            try {
              const updatePromise = clientsApi.updateClientTaskTemplate(existingTemplate.id, { is_active: false })
                .catch(error => {
                  console.error(`Error disabling template ${existingTemplate.id}:`, error);
                  return null; // エラーがあっても処理を続行する
                });
                
              updatePromises.push(updatePromise);
            } catch (error) {
              console.error(`Error preparing disable for template ${existingTemplate.id}:`, error);
            }
          }
        }
      }
      
      // すべての更新を実行（一部が失敗しても続行）
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        toast.success('サービス設定を保存しました');
      } else {
        toast.info('変更はありませんでした');
      }
      
      // 最新データを再取得
      fetchData();
    } catch (error) {
      console.error('Error saving service settings:', error);
      toast.error('サービス設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <HiOutlineTemplate className="mr-2 text-primary" />
          サービス設定
        </h3>
        <div className="flex items-center space-x-2">
          <button 
            className="btn btn-sm btn-outline"
            onClick={fetchData}
            disabled={loading || saving}
          >
            <HiOutlineRefresh className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? (
              <>
                <span className="loading loading-spinner loading-xs mr-1"></span>
                保存中...
              </>
            ) : (
              <>
                <HiOutlineCheck className="mr-1" /> 保存
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <table className="w-full table-auto border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">項目名</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">契約状況</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm border-b">
                <div className="flex items-center space-x-2">
                  <span>テンプレートの使用</span>
                  <div className="form-control">
                    <label className="cursor-pointer label p-0">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={settings.templates_enabled}
                        onChange={handleTemplatesEnabledChange}
                      />
                    </label>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* サービス項目をマッピングから動的に生成 */}
            {Object.entries(SERVICE_CATEGORIES).map(([service, category]) => (
              <tr key={service} className="border-b">
                <td className="px-4 py-3 font-medium">{SERVICE_DISPLAY_NAMES[service]}</td>
                <td className="px-4 py-3">
                  <select 
                    className="select select-bordered select-sm w-full max-w-xs"
                    value={settings[service]?.cycle || DEFAULT_CYCLES[service]}
                    onChange={(e) => handleServiceChange(service, 'cycle', e.target.value)}
                    disabled={!settings.templates_enabled}
                  >
                    {service === 'tax_return' || service === 'residence_tax' ? (
                      <>
                        <option value="yearly">年次</option>
                        <option value="quarterly">四半期</option>
                        <option value="monthly">毎月</option>
                      </>
                    ) : (
                      <>
                        <option value="monthly">毎月</option>
                        <option value="quarterly">四半期</option>
                        <option value="yearly">年次</option>
                      </>
                    )}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={settings[service]?.enabled || false}
                      onChange={(e) => handleServiceChange(service, 'enabled', e.target.checked)}
                      disabled={!settings.templates_enabled}
                    />
                    <select 
                      className="select select-bordered select-sm w-full max-w-xs"
                      value={settings[service]?.template_id || ''}
                      onChange={(e) => handleServiceChange(service, 'template_id', e.target.value ? Number(e.target.value) : null)}
                      disabled={!settings.templates_enabled || !settings[service]?.enabled}
                    >
                      <option value="">テンプレート選択</option>
                      {Array.isArray(templates) && templates
                        .filter(t => t && (t.category === category || t.title.includes(SERVICE_DISPLAY_NAMES[service])))
                        .map(template => (
                          <option key={template.id} value={template.id}>{template.title}</option>
                      ))}
                    </select>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => handleCustomize(service, settings[service]?.template_id)}
                      disabled={!settings.templates_enabled || !settings[service]?.enabled || !settings[service]?.template_id}
                    >
                      <HiOutlinePencilAlt className="mr-1" /> カスタマイズ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServiceCheckSettings;