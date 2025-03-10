import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../api';
import tasksApi from '../../api/tasks';
import { 
  HiOutlineTemplate, 
  HiOutlinePencilAlt, 
  HiOutlineCheck, 
  HiOutlineRefresh, 
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlinePlay,
  HiOutlineClipboardCopy,
  HiOutlineLibrary
} from 'react-icons/hi';
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

// デフォルトのスケジュールタイプ
const DEFAULT_SCHEDULE_TYPES = {
  monthly_check: 'monthly_start',
  bookkeeping: 'monthly_end',
  tax_return: 'fiscal_relative',
  income_tax: 'monthly_end',
  residence_tax: 'fiscal_relative',
  social_insurance: 'monthly_end'
};

// デフォルトのテンプレートタイトル
const DEFAULT_TEMPLATE_TITLES = {
  monthly_check: '月次処理チェック',
  bookkeeping: '記帳代行業務',
  tax_return: '決算・法人税申告業務',
  income_tax: '源泉所得税納付業務',
  residence_tax: '住民税納付業務',
  social_insurance: '社会保険対応業務'
};

// デフォルトのテンプレート説明
const DEFAULT_TEMPLATE_DESCRIPTIONS = {
  monthly_check: '毎月の処理状況を確認し、必要な対応を行います。',
  bookkeeping: '請求書・領収書などに基づき会計データを作成します。',
  tax_return: '決算期の法人税申告書を作成・提出します。',
  income_tax: '源泉所得税の計算・納付手続きを行います。',
  residence_tax: '住民税の納付手続き・特別徴収を行います。',
  social_insurance: '社会保険の手続き・計算を行います。'
};

// スケジュールタイプのマッピング
const SCHEDULE_TYPES = [
  { value: 'monthly_start', label: '月初作成（1日）・当月締め切り（5日）' },
  { value: 'monthly_end', label: '月末作成（25日）・翌月締め切り（10日）' },
  { value: 'fiscal_relative', label: '決算日基準' },
  { value: 'custom', label: 'カスタム設定' }
];

// 繰り返しタイプのマッピング
const RECURRENCE_TYPES = [
  { value: 'monthly', label: '毎月' },
  { value: 'quarterly', label: '四半期ごと' },
  { value: 'yearly', label: '毎年' },
  { value: 'once', label: '一度のみ' }
];

const ServiceCheckSettings = ({ clientId }) => {
  // サービス設定の初期状態
  const initialSettings = Object.keys(SERVICE_CATEGORIES).reduce((acc, service) => {
    acc[service] = {
      cycle: DEFAULT_CYCLES[service],
      enabled: true, // デフォルトで有効
      template_id: null,
      customized: false,
      schedule_type: DEFAULT_SCHEDULE_TYPES[service] || 'monthly_start',
      recurrence: DEFAULT_CYCLES[service],
      creation_day: null,
      deadline_day: null
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
  const [globalTemplates, setGlobalTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  
  // 初期データの取得
  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);
  
  // デフォルトのテンプレートを作成
  useEffect(() => {
    // クライアントテンプレートが空で、テンプレートが有効な場合、デフォルトテンプレートを作成
    const createDefaultTemplates = async () => {
      if (clientId && clientTemplates.length === 0 && settings.templates_enabled) {
        // スタート状態を表示
        toast.loading('デフォルトのテンプレートを準備中...', { id: 'default-templates' });
        
        const results = [];
        
        // 各サービスのテンプレートを順番に作成
        for (const [service, serviceSettings] of Object.entries(settings)) {
          if (service === 'templates_enabled') continue;
          
          if (serviceSettings.enabled) {
            try {
              const template = await createTemplateForService(service, serviceSettings);
              if (template) {
                results.push(template);
                // 設定を更新
                handleServiceChange(service, 'template_id', template.id);
              }
            } catch (error) {
              console.error(`Error creating default template for ${service}:`, error);
            }
            
            // 各テンプレート作成間に少し待機（APIへの負荷軽減）
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        // すべて作成完了
        if (results.length > 0) {
          toast.success(`${results.length}個のデフォルトテンプレートを作成しました`, { id: 'default-templates' });
          
          // クライアントテンプレート一覧を更新
          setClientTemplates(prevTemplates => [...prevTemplates, ...results]);
          
          // 最新データを再取得
          fetchData();
        } else {
          toast.dismiss('default-templates');
        }
      }
    };
    
    // データ取得後にのみ実行
    if (!loading && clientId) {
      createDefaultTemplates();
    }
  }, [loading, clientId, clientTemplates.length]);
  
  const fetchData = async () => {
    setLoading(true);
    
    try {
      // テンプレートとスケジュールの取得（非同期で並列取得）
      // エラーがあっても続行できるよう、各APIは独立して呼び出す
      let templatesArray = [];
      let schedulesArray = [];
      let clientTemplatesArray = [];
      let globalTemplatesArray = [];
      
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
      
      // グローバルテンプレートを取得
      try {
        const globalTemplatesData = await tasksApi.getTemplates();
        // APIが配列でない場合は空配列として扱う
        if (Array.isArray(globalTemplatesData)) {
          globalTemplatesArray = globalTemplatesData;
        } else if (globalTemplatesData && typeof globalTemplatesData === 'object') {
          // オブジェクトの場合は結果を確認
          globalTemplatesArray = globalTemplatesData.results || [];
        } else {
          globalTemplatesArray = [];
        }
        console.log('Global templates loaded:', globalTemplatesArray);
      } catch (error) {
        console.error('Error fetching global templates:', error);
        globalTemplatesArray = [];
      }
      
      setTemplates(templatesArray);
      setSchedules(schedulesArray);
      setClientTemplates(clientTemplatesArray);
      setGlobalTemplates(globalTemplatesArray);
      
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
  
  // デフォルトのスケジュールを作成する関数
  const createDefaultSchedule = async (name, scheduleType, recurrence) => {
    try {
      const scheduleData = {
        name: name,
        schedule_type: scheduleType,
        recurrence: recurrence
      };
      
      // スケジュールタイプに応じてデフォルト値を設定
      if (scheduleType === 'monthly_start') {
        scheduleData.creation_day = 1;  // 1日作成
        scheduleData.deadline_day = 5;  // 5日締め切り
      } else if (scheduleType === 'monthly_end') {
        scheduleData.creation_day = 25;  // 25日作成
        scheduleData.deadline_day = 10;  // 翌月10日締め切り
        scheduleData.deadline_next_month = true;
      } else if (scheduleType === 'custom') {
        scheduleData.creation_day = 1;
        scheduleData.deadline_day = 10;
      }
      
      const newSchedule = await clientsApi.createTaskTemplateSchedule(scheduleData);
      return newSchedule;
    } catch (error) {
      console.error('Error creating default schedule:', error);
      return null;
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
    const updatedSettings = {
      ...settings,
      [service]: {
        ...settings[service],
        [field]: value
      }
    };
    
    // 繰り返しタイプが変更された場合、cycleも同時に更新
    if (field === 'recurrence') {
      updatedSettings[service].cycle = value;
    }
    
    // cycleが変更された場合、recurrenceも同時に更新
    if (field === 'cycle') {
      updatedSettings[service].recurrence = value;
    }
    
    setSettings(updatedSettings);
  };
  
  // テンプレート作成
  const createTemplateForService = async (service, serviceSettings) => {
    try {
      // サービス用のスケジュールを取得または作成
      let scheduleId = null;
      
      // 既存のスケジュールを検索
      const scheduleName = `${SERVICE_DISPLAY_NAMES[service]}スケジュール`;
      const existingSchedule = schedules.find(s => s.name === scheduleName);
      
      if (existingSchedule) {
        scheduleId = existingSchedule.id;
      } else {
        // 新規スケジュール作成
        const scheduleType = serviceSettings.schedule_type || DEFAULT_SCHEDULE_TYPES[service] || 'monthly_start';
        const recurrence = serviceSettings.recurrence || serviceSettings.cycle || DEFAULT_CYCLES[service];
        const newSchedule = await createDefaultSchedule(scheduleName, scheduleType, recurrence);
        
        if (newSchedule) {
          scheduleId = newSchedule.id;
          // スケジュール一覧を更新
          setSchedules(prevSchedules => [...prevSchedules, newSchedule]);
        }
      }
      
      if (!scheduleId) {
        toast.error(`${SERVICE_DISPLAY_NAMES[service]}のスケジュール作成に失敗しました`);
        return null;
      }
      
      // タスクカテゴリの取得
      let categoryId = null;
      let priorityId = null;
      
      try {
        // カテゴリとプライオリティの取得（APIデータから）
        const categoriesResponse = await clientsApi.getTaskCategories();
        const prioritiesResponse = await clientsApi.getTaskPriorities();
        
        // カテゴリを特定（カテゴリ名から推測）
        if (categoriesResponse && categoriesResponse.length > 0) {
          const categoryMap = {
            monthly_check: '一般',
            bookkeeping: '記帳代行',
            tax_return: '決算・申告',
            income_tax: '税務顧問',
            residence_tax: '税務顧問',
            social_insurance: '給与計算'
          };
          
          const categoryName = categoryMap[service] || '一般';
          const category = categoriesResponse.find(c => c.name === categoryName);
          if (category) {
            categoryId = category.id;
          } else {
            categoryId = categoriesResponse[0].id; // デフォルトは最初のカテゴリ
          }
        }
        
        // 優先度を設定（中程度）
        if (prioritiesResponse && prioritiesResponse.length > 0) {
          // 中程度の優先度を検索
          const middlePriority = prioritiesResponse.find(p => p.name === '中' || p.priority_value === 50);
          if (middlePriority) {
            priorityId = middlePriority.id;
          } else {
            priorityId = prioritiesResponse[0].id; // デフォルトは最初の優先度
          }
        }
      } catch (error) {
        console.error('Error fetching categories or priorities:', error);
        // エラーがあっても続行（カテゴリなしでも作成可能）
      }
      
      // テンプレートデータ作成
      const templateData = {
        title: DEFAULT_TEMPLATE_TITLES[service] || `${SERVICE_DISPLAY_NAMES[service]}`,
        description: DEFAULT_TEMPLATE_DESCRIPTIONS[service] || `${SERVICE_DISPLAY_NAMES[service]}のタスクテンプレート`,
        schedule: scheduleId,
        is_active: serviceSettings.enabled,
        category: categoryId,
        priority: priorityId
      };
      
      // テンプレート作成
      const newTemplate = await clientsApi.createClientTaskTemplate(clientId, templateData);
      
      toast.success(`${SERVICE_DISPLAY_NAMES[service]}のテンプレートを作成しました`);
      return newTemplate;
    } catch (error) {
      console.error(`Error creating template for ${service}:`, error);
      toast.error(`テンプレート作成に失敗しました: ${error.message || 'エラーが発生しました'}`);
      return null;
    }
  };
  
  // グローバルテンプレートからコピーする関数
  const copyFromGlobalTemplate = async (service, globalTemplateId) => {
    try {
      // 選択したグローバルテンプレートを取得
      const selectedTemplate = globalTemplates.find(t => t.id === globalTemplateId);
      if (!selectedTemplate) {
        toast.error('選択したテンプレートが見つかりません');
        return null;
      }
      
      // サービス用のスケジュールを取得または作成
      let scheduleId = null;
      
      // 既存のスケジュールを検索
      const scheduleName = `${SERVICE_DISPLAY_NAMES[service]}スケジュール`;
      const existingSchedule = schedules.find(s => s.name === scheduleName);
      
      if (existingSchedule) {
        scheduleId = existingSchedule.id;
      } else {
        // 新規スケジュール作成
        const serviceSettings = settings[service];
        const scheduleType = serviceSettings?.schedule_type || DEFAULT_SCHEDULE_TYPES[service] || 'monthly_start';
        const recurrence = serviceSettings?.recurrence || serviceSettings?.cycle || DEFAULT_CYCLES[service];
        const newSchedule = await createDefaultSchedule(scheduleName, scheduleType, recurrence);
        
        if (newSchedule) {
          scheduleId = newSchedule.id;
          // スケジュール一覧を更新
          setSchedules(prevSchedules => [...prevSchedules, newSchedule]);
        }
      }
      
      if (!scheduleId) {
        toast.error(`${SERVICE_DISPLAY_NAMES[service]}のスケジュール作成に失敗しました`);
        return null;
      }
      
      // テンプレートデータ作成
      const templateData = {
        title: selectedTemplate.title || selectedTemplate.template_name,
        description: selectedTemplate.description || `${SERVICE_DISPLAY_NAMES[service]}のタスクテンプレート`,
        schedule: scheduleId,
        is_active: true,
        category: selectedTemplate.category?.id,
        priority: selectedTemplate.priority?.id,
        estimated_hours: selectedTemplate.estimated_hours
      };
      
      // テンプレート作成
      const newTemplate = await clientsApi.createClientTaskTemplate(clientId, templateData);
      
      toast.success(`${SERVICE_DISPLAY_NAMES[service]}のテンプレートをコピーしました`);
      return newTemplate;
    } catch (error) {
      console.error(`Error copying template for ${service}:`, error);
      toast.error(`テンプレートのコピーに失敗しました: ${error.message || 'エラーが発生しました'}`);
      return null;
    }
  };
  
  // テンプレート選択モーダルを表示
  const showGlobalTemplateSelector = (service) => {
    setSelectedService(service);
    setShowTemplateSelector(true);
  };
  
  // テンプレートを選択してコピー
  const handleSelectGlobalTemplate = async (templateId) => {
    if (!selectedService) {
      toast.error('サービスが選択されていません');
      return;
    }
    
    const newTemplate = await copyFromGlobalTemplate(selectedService, templateId);
    if (newTemplate) {
      // クライアントテンプレート一覧を更新
      setClientTemplates(prevTemplates => [...prevTemplates, newTemplate]);
      
      // 設定を更新
      handleServiceChange(selectedService, 'template_id', newTemplate.id);
    }
    
    // モーダルを閉じる
    setShowTemplateSelector(false);
    setSelectedService(null);
  };
  
  // テンプレート編集画面に移動するハンドラ（フォーム内でのテンプレート編集）
  const handleCustomize = async (service, templateId) => {
    // テンプレートがない場合は選択肢を表示
    if (!templateId) {
      // グローバルテンプレートの数をチェック
      if (globalTemplates.length > 0) {
        // グローバルテンプレートから選択するオプションを表示
        showGlobalTemplateSelector(service);
        return;
      }
      
      // グローバルテンプレートがない場合は新規作成
      const serviceSettings = settings[service];
      if (!serviceSettings) {
        toast.error(`サービス設定が見つかりません`);
        return;
      }
      
      // 新しいテンプレートを作成
      const newTemplate = await createTemplateForService(service, serviceSettings);
      if (newTemplate) {
        // クライアントテンプレート一覧を更新
        setClientTemplates(prevTemplates => [...prevTemplates, newTemplate]);
        
        // 設定を更新
        handleServiceChange(service, 'template_id', newTemplate.id);
        toast.success(`${SERVICE_DISPLAY_NAMES[service]}のテンプレートを作成しました`);
      }
      return;
    }
    
    // 既存のテンプレート編集機能
    const existingTemplate = clientTemplates.find(t => t.id === templateId);
    if (existingTemplate) {
      // テンプレート編集は直接このフォームで行うようになったので、メッセージだけ表示
      toast.success(`${SERVICE_DISPLAY_NAMES[service]} テンプレートの設定を更新します`);
    }
  };
  
  // テンプレートからタスクを生成するハンドラ
  const handleGenerateTask = async (service, templateId) => {
    // テンプレートがない場合は新規作成して生成
    if (!templateId) {
      const serviceSettings = settings[service];
      if (!serviceSettings) {
        toast.error(`サービス設定が見つかりません`);
        return null;
      }
      
      // 新しいテンプレートを作成
      const newTemplate = await createTemplateForService(service, serviceSettings);
      if (newTemplate) {
        // クライアントテンプレート一覧を更新
        setClientTemplates(prevTemplates => [...prevTemplates, newTemplate]);
        
        // 設定を更新
        handleServiceChange(service, 'template_id', newTemplate.id);
        
        // 新しいテンプレートからタスクを生成
        templateId = newTemplate.id;
      } else {
        toast.error(`テンプレート作成に失敗したため、タスクを生成できません`);
        return null;
      }
    }
    
    try {
      const task = await clientsApi.generateTaskFromTemplate(templateId);
      if (task) {
        toast.success(`${SERVICE_DISPLAY_NAMES[service]}のタスクを生成しました`);
        return task;
      } else {
        toast.error(`タスク生成に失敗しました`);
        return null;
      }
    } catch (error) {
      console.error(`Error generating task for ${service}:`, error);
      toast.error(`タスク生成に失敗しました: ${error.message || 'エラーが発生しました'}`);
      return null;
    }
  };
  
  // 設定保存ハンドラ
  const handleSave = async () => {
    setSaving(true);
    
    try {
      const updatePromises = [];
      const scheduleUpdatePromises = [];
      
      // サービスごとにタスクテンプレートとスケジュールを更新
      for (const [service, serviceSettings] of Object.entries(settings)) {
        if (service === 'templates_enabled') continue;
        
        const category = SERVICE_CATEGORIES[service];
        if (!category) continue;
        
        // テンプレートが有効で、テンプレートIDが選択されている場合
        if (settings.templates_enabled && serviceSettings.enabled && serviceSettings.template_id) {
          const existingTemplate = clientTemplates.find(t => t.id === serviceSettings.template_id);
          
          if (existingTemplate) {
            try {
              // ステップ1: テンプレートのスケジュール情報を取得または新規作成
              let scheduleId = null;
              
              // 既存のスケジュールIDを取得
              const templateScheduleId = typeof existingTemplate.schedule === 'object'
                ? existingTemplate.schedule?.id
                : existingTemplate.schedule;
              
              // 既存のスケジュールがあればそれを使う
              const existingSchedule = schedules.find(s => s.id === templateScheduleId);
              
              if (existingSchedule) {
                // 既存のスケジュールを更新
                const scheduleData = {
                  schedule_type: serviceSettings.schedule_type || 'monthly_start',
                  recurrence: serviceSettings.recurrence || serviceSettings.cycle || 'monthly'
                };
                
                // カスタム設定の場合は日付も追加
                if (serviceSettings.schedule_type === 'custom') {
                  if (serviceSettings.creation_day) {
                    scheduleData.creation_day = serviceSettings.creation_day;
                  }
                  if (serviceSettings.deadline_day) {
                    scheduleData.deadline_day = serviceSettings.deadline_day;
                  }
                }
                
                try {
                  const updateSchedulePromise = clientsApi.updateTaskTemplateSchedule(existingSchedule.id, scheduleData)
                    .then(updatedSchedule => {
                      scheduleId = updatedSchedule.id;
                      return updatedSchedule;
                    })
                    .catch(error => {
                      console.error(`Error updating schedule for ${service}:`, error);
                      scheduleId = existingSchedule.id; // エラー時は既存のスケジュールIDを使用
                      return null;
                    });
                  
                  scheduleUpdatePromises.push(updateSchedulePromise);
                } catch (error) {
                  console.error(`Error preparing schedule update for ${service}:`, error);
                  scheduleId = existingSchedule.id;
                }
              } else if (templateScheduleId) {
                // スケジュールIDはあるがオブジェクトが見つからない場合
                scheduleId = templateScheduleId;
              }
              
              // ステップ2: テンプレート自体を更新
              const updateData = {
                is_active: serviceSettings.enabled,
                schedule: scheduleId // スケジュールIDがあれば設定
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
      
      // スケジュール更新を先に実行
      if (scheduleUpdatePromises.length > 0) {
        await Promise.all(scheduleUpdatePromises);
      }
      
      // テンプレート更新を実行
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        toast.success('サービス設定を保存しました');
      } else if (scheduleUpdatePromises.length > 0) {
        toast.success('スケジュール設定を保存しました');
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
  
  // グローバルテンプレート選択モーダル
  const renderTemplateSelector = () => {
    if (!showTemplateSelector) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <HiOutlineLibrary className="mr-2 text-primary" />
              {selectedService ? `${SERVICE_DISPLAY_NAMES[selectedService]}用テンプレートを選択` : 'テンプレートを選択'}
            </h3>
            <button 
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setShowTemplateSelector(false);
                setSelectedService(null);
              }}
            >
              ×
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {globalTemplates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">テンプレートがありません。まずはタスクテンプレートページでデフォルトテンプレートを作成してください。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {globalTemplates.map(template => (
                  <div 
                    key={template.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectGlobalTemplate(template.id)}
                  >
                    <h4 className="font-medium">{template.template_name || template.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{template.description || '説明なし'}</p>
                    <div className="flex items-center mt-2 text-xs">
                      {template.category && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2">
                          {template.category.name}
                        </span>
                      )}
                      {template.estimated_hours && (
                        <span className="text-gray-500">
                          <HiOutlineClock className="inline mr-1" />
                          {template.estimated_hours}時間
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200 flex justify-end">
            <button 
              className="btn btn-outline"
              onClick={() => {
                setShowTemplateSelector(false);
                setSelectedService(null);
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
      {/* グローバルテンプレート選択モーダル */}
      {renderTemplateSelector()}
      
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <HiOutlineTemplate className="mr-2 text-primary" />
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
                        .filter(t => t && (t.category === category || t.title?.includes(SERVICE_DISPLAY_NAMES[service])))
                        .map(template => (
                          <option key={template.id} value={template.id}>{template.title}</option>
                      ))}
                    </select>
                    <button 
                      className={`btn btn-sm ${settings[service]?.template_id ? 'btn-outline btn-primary' : 'btn-outline btn-success'}`}
                      onClick={() => handleCustomize(service, settings[service]?.template_id)}
                      disabled={!settings.templates_enabled || !settings[service]?.enabled}
                    >
                      {settings[service]?.template_id ? (
                        <>
                          <HiOutlinePencilAlt className="mr-1" /> カスタマイズ
                        </>
                      ) : (
                        <>
                          <HiOutlineClipboardCopy className="mr-1" /> テンプレート選択/作成
                        </>
                      )}
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