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

  // デフォルトでテンプレートが有効になっている状態にする
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
  
  // 初期データの取得 - コンポーネントのマウント時に1回だけ実行
  useEffect(() => {
    if (clientId) {
      console.log('ServiceCheckSettings initialized with client ID:', clientId);
      setLoading(true);
      
      // テンプレートを自動で有効化
      setSettings(prevSettings => ({
        ...prevSettings,
        templates_enabled: true
      }));
      
      // 初期データ取得
      fetchData().then(() => {
        console.log('Initial data fetch completed, settings loaded');
        
        // クライアントテンプレートの有無をチェック
        if (clientTemplates && clientTemplates.length === 0) {
          console.log(`No templates found for client ID ${clientId}, applying default templates`);
          // データ取得完了後に実行するため十分な遅延を設ける
          setTimeout(() => {
            setupDefaultTemplates();
          }, 1000);
        } else {
          console.log(`Found ${clientTemplates.length} templates for client ID ${clientId}`);
          // 明示的にローディング状態を解除
          setLoading(false);
        }
      }).catch(err => {
        console.error('Error during initial data fetch:', err);
        // エラー時にもローディング状態を解除
        setLoading(false);
        
        // エラー通知
        toast('テンプレート情報の取得に失敗しました', {
          icon: '❌',
          style: { background: '#FEE', color: '#E00' }
        });
      });
    }
    // clientTemplatesを依存配列から削除して無限ループを防ぐ
  }, [clientId]);
  
  // デフォルトのテンプレートを一括設定する関数
  const setupDefaultTemplates = async () => {
    if (clientId) {
      console.log('Setting up default templates for client:', clientId);
      // テンプレートの使用を有効化
      setSettings(prev => ({
        ...prev,
        templates_enabled: true
      }));
      
      // 作業開始通知
      toast.promise(
        new Promise(r => setTimeout(r, 500)), // ダミープロミス
        {
          loading: 'デフォルトのテンプレートを設定中...',
          id: 'default-templates'
        }
      );
      
      try {
        // テンプレートとスケジュールを取得
        const [templates, schedules] = await Promise.all([
          clientsApi.getTaskTemplates(),
          clientsApi.getTaskTemplateSchedules()
        ]);
        
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
        
        // 作成したテンプレートを記録
        const createdTemplates = [];
        
        // 各テンプレートを設定
        for (const mapping of templateMappings) {
          try {
            // 既存のクライアントテンプレートをチェック
            const existingTemplate = clientTemplates.find(t => t.title === mapping.name);
            
            if (existingTemplate) {
              // 既に存在する場合はスキップ
              console.log(`Template for ${mapping.name} already exists, skipping...`);
              continue;
            }
            
            // マッチするテンプレートを検索
            const template = Array.isArray(templates) ? 
              templates.find(t => t.title === mapping.name || t.template_name === mapping.name) : null;
            
            if (!template) {
              console.log(`No matching template found for ${mapping.name}, skipping...`);
              continue;
            }
            
            // マッチするスケジュールを検索
            const schedule = Array.isArray(schedules) ?
              schedules.find(s => s.name === mapping.schedule) : null;
            
            if (!schedule) {
              console.log(`No matching schedule found for ${mapping.schedule}, skipping...`);
              continue;
            }
            
            // テンプレートを作成
            const newTemplate = await clientsApi.createClientTaskTemplate(clientId, {
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
          }
        }
        
        // 作成完了
        if (createdTemplates.length > 0) {
          toast(`${createdTemplates.length}個のデフォルトテンプレートを設定しました`, { 
            id: 'default-templates',
            icon: '✅',
            style: { background: '#EFE', color: '#080' }
          });
          
          // クライアントテンプレート一覧を更新
          setClientTemplates(prevTemplates => [...prevTemplates, ...createdTemplates]);
          
          // 最新データを再取得
          fetchData();
          
          // 自動的にテンプレート設定を保存
          console.log(`Auto-saving template settings for client ID ${clientId}`);
          setTimeout(() => {
            handleSave();
          }, 1500);
        } else {
          toast.dismiss('default-templates');
          // toast.info が機能しない場合は toast() を使用
          toast('すべてのテンプレートが既に設定されています', { 
            icon: 'ℹ️',
            duration: 3000
          });
          
          // 既にテンプレートが存在する場合も設定を保存
          console.log(`Templates already exist, saving settings for client ID ${clientId}`);
          setTimeout(() => {
            handleSave();
          }, 1000);
        }
      } catch (error) {
        console.error('Error applying default templates:', error);
        // toast.error が機能しない場合は toast() を使用
        toast('テンプレート設定中にエラーが発生しました', { 
          id: 'default-templates',
          icon: '❌',
          style: { background: '#FEE', color: '#E00' }
        });
      } finally {
        // 処理完了後は必ずローディング状態を解除
        setLoading(false);
      }
    }
  };
  
  const fetchData = async () => {
    setLoading(true);
    
    console.log('Fetching data for client ID:', clientId);
    
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
          console.log(`Fetching client templates for client ID ${clientId}...`);
          const clientTemplatesData = await clientsApi.getClientTaskTemplates(clientId);
          clientTemplatesArray = Array.isArray(clientTemplatesData) ? clientTemplatesData : [];
          console.log(`Retrieved ${clientTemplatesArray.length} client templates:`, clientTemplatesArray);
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
      // デフォルトでテンプレートを有効化
      const newSettings = {
        templates_enabled: true,
        ...initialSettings
      };
      
      console.log('==== CURRENT STATE DEBUG INFO ====');
      console.log(`Client ID: ${clientId}`);
      console.log('Client templates array:', clientTemplatesArray);
      console.log('Current settings:', settings);
      console.log('Templates array:', templatesArray);
      console.log('Schedules array:', schedulesArray);
      console.log('Global templates:', globalTemplatesArray);
      console.log('================================');
      
      // クライアントのテンプレート設定から各サービスの設定を抽出
      Object.entries(SERVICE_CATEGORIES).forEach(([serviceKey, category]) => {
        // タイトルまたはカテゴリーでマッチするテンプレートを検索
        console.log(`Searching for template for ${SERVICE_DISPLAY_NAMES[serviceKey]} (${DEFAULT_TEMPLATE_TITLES[serviceKey]}) in client templates...`);
        
        const templateForService = clientTemplatesArray.find(t => {
          if (!t) return false;
          
          // まず、タイトルで完全一致を試みる
          const exactTitleMatch = t.title === SERVICE_DISPLAY_NAMES[serviceKey];
          if (exactTitleMatch) {
            console.log(`Found exact title match for ${SERVICE_DISPLAY_NAMES[serviceKey]}`);
            return true;
          }
          
          // DEFAULT_TEMPLATE_TITLESとの一致を確認
          const defaultTitleMatch = t.title === DEFAULT_TEMPLATE_TITLES[serviceKey];
          if (defaultTitleMatch) {
            console.log(`Found default title match for ${SERVICE_DISPLAY_NAMES[serviceKey]}`);
            return true;
          }
          
          // 次にタイトルに含まれるか確認
          const titleMatch = t.title && t.title.includes(SERVICE_DISPLAY_NAMES[serviceKey]);
          
          // 逆にサービス名がタイトルに含まれるか確認
          const reverseTitleMatch = SERVICE_DISPLAY_NAMES[serviceKey] && 
                                  t.title && 
                                  SERVICE_DISPLAY_NAMES[serviceKey].includes(t.title);
          
          // カテゴリ名で確認
          const categoryMatch = t.category === category || 
                               (t.category?.name && t.category.name === category);
          
          const isMatch = titleMatch || reverseTitleMatch || categoryMatch;
          if (isMatch) {
            console.log(`Found partial match for ${SERVICE_DISPLAY_NAMES[serviceKey]}: ${t.title}`);
          }
          
          return isMatch;
        });
        
        if (templateForService) {
          console.log(`Found template for ${serviceKey}:`, templateForService);
          
          // スケジュールを探す - IDまたはオブジェクトでの参照に対応
          const scheduleId = typeof templateForService.schedule === 'object' 
            ? templateForService.schedule?.id 
            : templateForService.schedule;
            
          const schedule = schedulesArray.find(s => s.id === scheduleId);
          console.log(`Schedule for ${serviceKey}:`, schedule);
          
          newSettings[serviceKey] = {
            cycle: schedule ? getCycleFromSchedule(schedule, serviceKey) : DEFAULT_CYCLES[serviceKey],
            enabled: templateForService.is_active === undefined ? true : !!templateForService.is_active,
            template_id: templateForService.id,
            customized: templateForService.customized || false
          };
          
          console.log(`Set settings for ${serviceKey}:`, newSettings[serviceKey]);
        } else {
          console.log(`No matching template found for ${serviceKey}`);
        }
      });
      
      console.log('Final settings after extraction:', newSettings);
      
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
      console.log(`Creating schedule: name=${name}, type=${scheduleType}, recurrence=${recurrence}`);
      
      // 既存のスケジュールをもう一度チェック（APIから最新情報を取得）
      const schedulesResponse = await clientsApi.getTaskTemplateSchedules();
      const updatedSchedules = Array.isArray(schedulesResponse) ? schedulesResponse : [];
      
      // 名前の完全一致または類似するスケジュールを探す（柔軟性を持たせる）
      const existingSchedule = updatedSchedules.find(s => 
        s.name === name || 
        (s.name && name && s.name.includes(name.substring(0, 5))) ||
        (name && s.name && name.includes(s.name.substring(0, 5)))
      );
      
      if (existingSchedule) {
        console.log(`Found existing schedule with name ${existingSchedule.name} that matches ${name}:`, existingSchedule);
        return existingSchedule;
      }
      
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
      } else if (scheduleType === 'fiscal_relative') {
        // 決算日基準の場合
        scheduleData.fiscal_date_reference = 'end_date';  // 終了日基準
        scheduleData.deadline_day = 60;  // 決算日から60日後
      } else if (scheduleType === 'custom') {
        scheduleData.creation_day = 1;
        scheduleData.deadline_day = 10;
        
        // カスタムスケジュール用の追加設定
        scheduleData.reference_date_type = 'execution_date';
        scheduleData.creation_date_offset = 0;
        scheduleData.deadline_date_offset = 10;
      }
      
      console.log(`Creating schedule with data:`, scheduleData);
      
      const newSchedule = await clientsApi.createTaskTemplateSchedule(scheduleData);
      console.log(`Created new schedule:`, newSchedule);
      
      return newSchedule;
    } catch (error) {
      console.error('Error creating default schedule:', error);
      
      // エラーの詳細をログに出力
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Status code:', error.response.status);
      }
      
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
      // グローバルでこのサービスに対応するテンプレートを探す
      let globalTemplateId = null;
      let globalTemplateTitle = DEFAULT_TEMPLATE_TITLES[service] || `${SERVICE_DISPLAY_NAMES[service]}`;
      
      // グローバルテンプレートの検索
      const serviceTemplates = globalTemplates.filter(t => {
        const titleMatch = t.title === globalTemplateTitle || t.template_name === globalTemplateTitle;
        const keywordMatch = t.title?.toLowerCase().includes(SERVICE_DISPLAY_NAMES[service].toLowerCase());
        return titleMatch || keywordMatch;
      });
      
      if (serviceTemplates.length > 0) {
        // 名前が一致するテンプレートがあればそれを使用
        globalTemplateId = serviceTemplates[0].id;
        console.log(`Found global template for ${service}:`, serviceTemplates[0].title);
      }
      
      // サービス用のスケジュールを取得または作成
      let scheduleId = null;
      
      // 既存のスケジュールを検索
      const scheduleName = `${SERVICE_DISPLAY_NAMES[service]}スケジュール`;
      let existingSchedule = schedules.find(s => s.name === scheduleName);
      
      if (existingSchedule) {
        scheduleId = existingSchedule.id;
        console.log(`Using existing schedule for ${service}:`, existingSchedule.name);
      } else {
        // 新規スケジュール作成
        const scheduleType = serviceSettings.schedule_type || DEFAULT_SCHEDULE_TYPES[service] || 'monthly_start';
        const recurrence = serviceSettings.recurrence || serviceSettings.cycle || DEFAULT_CYCLES[service];
        console.log(`Creating new schedule for ${service} with type=${scheduleType}, recurrence=${recurrence}`);
        
        const newSchedule = await createDefaultSchedule(scheduleName, scheduleType, recurrence);
        
        if (newSchedule) {
          scheduleId = newSchedule.id;
          // スケジュール一覧を更新
          setSchedules(prevSchedules => [...prevSchedules, newSchedule]);
          existingSchedule = newSchedule;
          console.log(`Created new schedule for ${service}:`, newSchedule.id);
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
            console.log(`Found category for ${service}:`, category.name);
          } else {
            categoryId = categoriesResponse[0].id; // デフォルトは最初のカテゴリ
            console.log(`Using default category for ${service}:`, categoriesResponse[0].name);
          }
        }
        
        // 優先度を設定（中程度）
        if (prioritiesResponse && prioritiesResponse.length > 0) {
          // 中程度の優先度を検索 (優先度値50前後)
          let middlePriority = null;
          
          // 優先度50をまず探す
          middlePriority = prioritiesResponse.find(p => p.priority_value === 50);
          
          // なければ名前で「中」を探す
          if (!middlePriority) {
            middlePriority = prioritiesResponse.find(p => p.name === '中');
          }
          
          // それでもなければ優先度値が30-70の範囲で一番50に近いものを探す
          if (!middlePriority) {
            const mediumPriorities = prioritiesResponse.filter(p => 
              p.priority_value >= 30 && p.priority_value <= 70
            );
            
            if (mediumPriorities.length > 0) {
              // 50に一番近い値を持つものを探す
              middlePriority = mediumPriorities.reduce((closest, current) => {
                return Math.abs(current.priority_value - 50) < Math.abs(closest.priority_value - 50) ? current : closest;
              });
            }
          }
          
          if (middlePriority) {
            priorityId = middlePriority.id;
            console.log(`Found priority for ${service}:`, middlePriority.priority_value);
          } else {
            priorityId = prioritiesResponse[0].id; // デフォルトは最初の優先度
            console.log(`Using default priority for ${service}:`, prioritiesResponse[0].priority_value);
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
        is_active: serviceSettings.enabled !== false, // デフォルトで有効
        category: categoryId,
        priority: priorityId,
        template_task: globalTemplateId // グローバルテンプレートが見つかった場合は参照を設定
      };
      
      console.log(`Creating template for ${service} with data:`, templateData);
      
      // テンプレート作成
      const newTemplate = await clientsApi.createClientTaskTemplate(clientId, templateData);
      
      // サーバー側での変更をフロントエンドの状態に反映
      if (newTemplate && existingSchedule) {
        // スケジュール名を設定
        newTemplate.schedule_name = existingSchedule.name;
      }
      
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
                      
                      {/* クライアント固有のテンプレートがある場合はそれを優先表示 */}
                      {Array.isArray(clientTemplates) && clientTemplates
                        .filter(t => t && (
                          t.title === SERVICE_DISPLAY_NAMES[service] || 
                          t.title === DEFAULT_TEMPLATE_TITLES[service] ||
                          (t.title && t.title.includes(SERVICE_DISPLAY_NAMES[service]))
                        ))
                        .map(template => (
                          <option key={`client-${template.id}`} value={template.id}>
                            {template.title}
                          </option>
                      ))}
                      
                      {/* 次にグローバルテンプレートを表示 */}
                      {Array.isArray(templates) && templates
                        .filter(t => t && (
                          t.category === category || 
                          t.title?.includes(SERVICE_DISPLAY_NAMES[service]) ||
                          t.title === DEFAULT_TEMPLATE_TITLES[service]
                        ))
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