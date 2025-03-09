import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../api';
import { HiOutlineTemplate, HiOutlinePencilAlt, HiOutlineCheck, HiOutlineRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';

const ServiceCheckSettings = ({ clientId }) => {
  const [settings, setSettings] = useState({
    templates_enabled: true,
    monthly_check: {
      cycle: 'monthly',
      enabled: true,
      template_id: null,
      customized: false
    },
    bookkeeping: {
      cycle: 'monthly',
      enabled: true,
      template_id: null,
      customized: false
    },
    tax_return: {
      cycle: 'yearly',
      enabled: true,
      template_id: null,
      customized: false
    },
    income_tax: {
      cycle: 'monthly',
      enabled: true,
      template_id: null,
      customized: false
    },
    residence_tax: {
      cycle: 'yearly',
      enabled: true,
      template_id: null,
      customized: false
    },
    social_insurance: {
      cycle: 'monthly',
      enabled: true,
      template_id: null,
      customized: false
    }
  });
  
  const [templates, setTemplates] = useState([]);
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
      // テンプレートの取得
      const templatesData = await clientsApi.getTaskTemplates();
      // 必ず配列として扱えるようにする
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      
      // TODO: APIが修正されたら、サービス設定の取得方法を変更する
      // 仮の設定値を使用
      const newSettings = {
        templates_enabled: true,
        monthly_check: {
          cycle: 'monthly',
          enabled: true,
          template_id: null,
          customized: false
        },
        bookkeeping: {
          cycle: 'monthly',
          enabled: true,
          template_id: null,
          customized: false
        },
        tax_return: {
          cycle: 'yearly',
          enabled: true,
          template_id: null,
          customized: false
        },
        income_tax: {
          cycle: 'monthly',
          enabled: true,
          template_id: null,
          customized: false
        },
        residence_tax: {
          cycle: 'yearly',
          enabled: true,
          template_id: null,
          customized: false
        },
        social_insurance: {
          cycle: 'monthly',
          enabled: true,
          template_id: null,
          customized: false
        }
      };
      
      setSettings(newSettings);
    } catch (error) {
      console.error('Error fetching settings data:', error);
      toast.error('設定データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
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
  
  // 設定保存ハンドラ
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // TODO: APIが修正されたら、サービス設定の保存方法を変更する
      // 現在は仮実装
      
      toast.success('サービス設定を保存しました');
      // 最新データを再取得
      fetchData();
      
    } catch (error) {
      console.error('Error saving service settings:', error);
      toast.error('サービス設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };
  
  const handleCustomize = (service) => {
    // テンプレートのカスタマイズ処理
    toast.success(`${service} テンプレートをカスタマイズします`);
    // ここに実装を追加
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
            {/* 月次チェック */}
            <tr className="border-b">
              <td className="px-4 py-3 font-medium">月次チェック</td>
              <td className="px-4 py-3">
                <select 
                  className="select select-bordered select-sm w-full max-w-xs"
                  value={settings.monthly_check.cycle}
                  onChange={(e) => handleServiceChange('monthly_check', 'cycle', e.target.value)}
                  disabled={!settings.templates_enabled}
                >
                  <option value="monthly">毎月</option>
                  <option value="quarterly">四半期</option>
                  <option value="yearly">年次</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={settings.monthly_check.enabled}
                    onChange={(e) => handleServiceChange('monthly_check', 'enabled', e.target.checked)}
                    disabled={!settings.templates_enabled}
                  />
                  <select 
                    className="select select-bordered select-sm w-full max-w-xs"
                    value={settings.monthly_check.template_id || ''}
                    onChange={(e) => handleServiceChange('monthly_check', 'template_id', e.target.value ? Number(e.target.value) : null)}
                    disabled={!settings.templates_enabled || !settings.monthly_check.enabled}
                  >
                    <option value="">テンプレート選択</option>
                    {Array.isArray(templates) && templates
                      .filter(t => t && t.category === 'monthly')
                      .map(template => (
                        <option key={template.id} value={template.id}>{template.title}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleCustomize('月次チェック')}
                    disabled={!settings.templates_enabled || !settings.monthly_check.enabled || !settings.monthly_check.template_id}
                  >
                    <HiOutlinePencilAlt className="mr-1" /> カスタマイズ
                  </button>
                </div>
              </td>
            </tr>
            
            {/* 記帳代行 */}
            <tr className="border-b">
              <td className="px-4 py-3 font-medium">記帳代行</td>
              <td className="px-4 py-3">
                <select 
                  className="select select-bordered select-sm w-full max-w-xs"
                  value={settings.bookkeeping.cycle}
                  onChange={(e) => handleServiceChange('bookkeeping', 'cycle', e.target.value)}
                  disabled={!settings.templates_enabled}
                >
                  <option value="monthly">毎月</option>
                  <option value="quarterly">四半期</option>
                  <option value="yearly">年次</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={settings.bookkeeping.enabled}
                    onChange={(e) => handleServiceChange('bookkeeping', 'enabled', e.target.checked)}
                    disabled={!settings.templates_enabled}
                  />
                  <select 
                    className="select select-bordered select-sm w-full max-w-xs"
                    value={settings.bookkeeping.template_id || ''}
                    onChange={(e) => handleServiceChange('bookkeeping', 'template_id', e.target.value ? Number(e.target.value) : null)}
                    disabled={!settings.templates_enabled || !settings.bookkeeping.enabled}
                  >
                    <option value="">テンプレート選択</option>
                    {Array.isArray(templates) && templates
                      .filter(t => t && t.category === 'bookkeeping')
                      .map(template => (
                        <option key={template.id} value={template.id}>{template.title}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleCustomize('記帳代行')}
                    disabled={!settings.templates_enabled || !settings.bookkeeping.enabled || !settings.bookkeeping.template_id}
                  >
                    <HiOutlinePencilAlt className="mr-1" /> カスタマイズ
                  </button>
                </div>
              </td>
            </tr>
            
            {/* 税務申告書作成 */}
            <tr className="border-b">
              <td className="px-4 py-3 font-medium">税務申告書作成</td>
              <td className="px-4 py-3">
                <select 
                  className="select select-bordered select-sm w-full max-w-xs"
                  value={settings.tax_return.cycle}
                  onChange={(e) => handleServiceChange('tax_return', 'cycle', e.target.value)}
                  disabled={!settings.templates_enabled}
                >
                  <option value="yearly">年次</option>
                  <option value="quarterly">四半期</option>
                  <option value="monthly">毎月</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={settings.tax_return.enabled}
                    onChange={(e) => handleServiceChange('tax_return', 'enabled', e.target.checked)}
                    disabled={!settings.templates_enabled}
                  />
                  <select 
                    className="select select-bordered select-sm w-full max-w-xs"
                    value={settings.tax_return.template_id || ''}
                    onChange={(e) => handleServiceChange('tax_return', 'template_id', e.target.value ? Number(e.target.value) : null)}
                    disabled={!settings.templates_enabled || !settings.tax_return.enabled}
                  >
                    <option value="">テンプレート選択</option>
                    {Array.isArray(templates) && templates
                      .filter(t => t && t.category === 'tax_return')
                      .map(template => (
                        <option key={template.id} value={template.id}>{template.title}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleCustomize('税務申告書作成')}
                    disabled={!settings.templates_enabled || !settings.tax_return.enabled || !settings.tax_return.template_id}
                  >
                    <HiOutlinePencilAlt className="mr-1" /> カスタマイズ
                  </button>
                </div>
              </td>
            </tr>
            
            {/* 源泉所得税 */}
            <tr className="border-b">
              <td className="px-4 py-3 font-medium">源泉所得税</td>
              <td className="px-4 py-3">
                <select 
                  className="select select-bordered select-sm w-full max-w-xs"
                  value={settings.income_tax.cycle}
                  onChange={(e) => handleServiceChange('income_tax', 'cycle', e.target.value)}
                  disabled={!settings.templates_enabled}
                >
                  <option value="monthly">毎月</option>
                  <option value="quarterly">四半期</option>
                  <option value="yearly">年次</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={settings.income_tax.enabled}
                    onChange={(e) => handleServiceChange('income_tax', 'enabled', e.target.checked)}
                    disabled={!settings.templates_enabled}
                  />
                  <select 
                    className="select select-bordered select-sm w-full max-w-xs"
                    value={settings.income_tax.template_id || ''}
                    onChange={(e) => handleServiceChange('income_tax', 'template_id', e.target.value ? Number(e.target.value) : null)}
                    disabled={!settings.templates_enabled || !settings.income_tax.enabled}
                  >
                    <option value="">テンプレート選択</option>
                    {Array.isArray(templates) && templates
                      .filter(t => t && t.category === 'income_tax')
                      .map(template => (
                        <option key={template.id} value={template.id}>{template.title}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleCustomize('源泉所得税')}
                    disabled={!settings.templates_enabled || !settings.income_tax.enabled || !settings.income_tax.template_id}
                  >
                    <HiOutlinePencilAlt className="mr-1" /> カスタマイズ
                  </button>
                </div>
              </td>
            </tr>
            
            {/* 住民税対応 */}
            <tr className="border-b">
              <td className="px-4 py-3 font-medium">住民税対応</td>
              <td className="px-4 py-3">
                <select 
                  className="select select-bordered select-sm w-full max-w-xs"
                  value={settings.residence_tax.cycle}
                  onChange={(e) => handleServiceChange('residence_tax', 'cycle', e.target.value)}
                  disabled={!settings.templates_enabled}
                >
                  <option value="yearly">年次</option>
                  <option value="quarterly">四半期</option>
                  <option value="monthly">毎月</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={settings.residence_tax.enabled}
                    onChange={(e) => handleServiceChange('residence_tax', 'enabled', e.target.checked)}
                    disabled={!settings.templates_enabled}
                  />
                  <select 
                    className="select select-bordered select-sm w-full max-w-xs"
                    value={settings.residence_tax.template_id || ''}
                    onChange={(e) => handleServiceChange('residence_tax', 'template_id', e.target.value ? Number(e.target.value) : null)}
                    disabled={!settings.templates_enabled || !settings.residence_tax.enabled}
                  >
                    <option value="">テンプレート選択</option>
                    {Array.isArray(templates) && templates
                      .filter(t => t && t.category === 'residence_tax')
                      .map(template => (
                        <option key={template.id} value={template.id}>{template.title}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleCustomize('住民税対応')}
                    disabled={!settings.templates_enabled || !settings.residence_tax.enabled || !settings.residence_tax.template_id}
                  >
                    <HiOutlinePencilAlt className="mr-1" /> カスタマイズ
                  </button>
                </div>
              </td>
            </tr>
            
            {/* 社会保険対応 */}
            <tr className="border-b">
              <td className="px-4 py-3 font-medium">社会保険対応</td>
              <td className="px-4 py-3">
                <select 
                  className="select select-bordered select-sm w-full max-w-xs"
                  value={settings.social_insurance.cycle}
                  onChange={(e) => handleServiceChange('social_insurance', 'cycle', e.target.value)}
                  disabled={!settings.templates_enabled}
                >
                  <option value="monthly">毎月</option>
                  <option value="quarterly">四半期</option>
                  <option value="yearly">年次</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={settings.social_insurance.enabled}
                    onChange={(e) => handleServiceChange('social_insurance', 'enabled', e.target.checked)}
                    disabled={!settings.templates_enabled}
                  />
                  <select 
                    className="select select-bordered select-sm w-full max-w-xs"
                    value={settings.social_insurance.template_id || ''}
                    onChange={(e) => handleServiceChange('social_insurance', 'template_id', e.target.value ? Number(e.target.value) : null)}
                    disabled={!settings.templates_enabled || !settings.social_insurance.enabled}
                  >
                    <option value="">テンプレート選択</option>
                    {Array.isArray(templates) && templates
                      .filter(t => t && t.category === 'social_insurance')
                      .map(template => (
                        <option key={template.id} value={template.id}>{template.title}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleCustomize('社会保険対応')}
                    disabled={!settings.templates_enabled || !settings.social_insurance.enabled || !settings.social_insurance.template_id}
                  >
                    <HiOutlinePencilAlt className="mr-1" /> カスタマイズ
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServiceCheckSettings;