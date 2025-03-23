import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tasksApi from '../../api/tasks/index';
import { authApi } from '../../api';
import * as usersApi from '../../api/users';
import toast from 'react-hot-toast';
import TaskTemplateForm from './TaskTemplateForm';
import {
  HiOutlineDocumentText,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineDuplicate,
  HiOutlinePlus,
  HiOutlineTag,
  HiOutlineClock,
  HiOutlineTemplate,
  HiOutlineDocumentAdd,
  HiOutlineLibrary
} from 'react-icons/hi';

// デフォルトのテンプレート定義
const DEFAULT_TEMPLATES = [
  {
    title: '顧問契約タスク',
    description: '顧問契約に基づく月次の会計処理状況を確認するためのタスクです。',
    category_name: '一般',
    estimated_hours: 2,
    template_name: '顧問契約タスク',
    recurrence_pattern: 'monthly'
  },
  {
    title: '決算申告タスク',
    description: '決算期の法人税申告書作成・提出業務を行うためのタスクです。',
    category_name: '決算・申告',
    estimated_hours: 8,
    template_name: '決算申告タスク',
    recurrence_pattern: 'yearly'
  },
  {
    title: '中間申告タスク',
    description: '中間申告書の作成・提出業務を行うためのタスクです。',
    category_name: '決算・申告',
    estimated_hours: 4,
    template_name: '中間申告タスク',
    recurrence_pattern: 'monthly'
  },
  {
    title: '予定申告タスク',
    description: '予定申告書の作成・提出業務を行うためのタスクです。',
    category_name: '決算・申告',
    estimated_hours: 4,
    template_name: '予定申告タスク',
    recurrence_pattern: 'monthly'
  },
  {
    title: '記帳代行業務',
    description: '月次の記帳代行を行うためのタスクです。',
    category_name: '記帳代行',
    estimated_hours: 3,
    template_name: '記帳代行業務',
    recurrence_pattern: 'monthly'
  },
  {
    title: '給与計算業務',
    description: '月次の給与計算業務を行うためのタスクです。',
    category_name: '給与計算',
    estimated_hours: 2,
    template_name: '給与計算業務',
    recurrence_pattern: 'monthly'
  },
  {
    title: '源泉所得税(原則)納付',
    description: '毎月の源泉所得税（原則）の納付手続きを行うためのタスクです。',
    category_name: '税務顧問',
    estimated_hours: 1,
    template_name: '源泉所得税(原則)納付',
    recurrence_pattern: 'monthly'
  },
  {
    title: '源泉所得税(特例)納付',
    description: '毎月の源泉所得税（特例）の納付手続きを行うためのタスクです。',
    category_name: '税務顧問',
    estimated_hours: 1,
    template_name: '源泉所得税(特例)納付',
    recurrence_pattern: 'monthly'
  },
  {
    title: '住民税(原則)納付',
    description: '従業員の住民税（原則）特別徴収の納付手続きを行うためのタスクです。',
    category_name: '税務顧問',
    estimated_hours: 1,
    template_name: '住民税(原則)納付',
    recurrence_pattern: 'monthly'
  },
  {
    title: '住民税(特例)納付',
    description: '従業員の住民税（特例）特別徴収の納付手続きを行うためのタスクです。',
    category_name: '税務顧問',
    estimated_hours: 1,
    template_name: '住民税(特例)納付',
    recurrence_pattern: 'monthly'
  },
  {
    title: '社会保険手続き',
    description: '社会保険関連の各種手続きを行うためのタスクです。',
    category_name: '給与計算',
    estimated_hours: 2,
    template_name: '社会保険手続き',
    recurrence_pattern: 'monthly'
  },
  {
    title: 'その他のタスク',
    description: 'その他の定型業務に関するタスクです。',
    category_name: '一般',
    estimated_hours: 1,
    template_name: 'その他のタスク',
    recurrence_pattern: 'monthly'
  }
];

const TaskTemplateList = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // テンプレート一覧を取得
      console.log('Getting templates...');
      const data = await tasksApi.getTemplates();
      console.log('Templates fetched for display:', data);
      
      // データがあるか確認
      let allTemplates = [];
      
      // ページネーションがある場合の処理
      if (data && data.results && data.count) {
        // ページネーションされたレスポンス
        console.log(`Found paginated templates: ${data.results.length} of ${data.count}`);
        allTemplates = [...data.results];
        
        // 最初のページ以降のデータを取得
        if (data.count > data.results.length && data.next) {
          try {
            // すべてのテンプレートを取得するためにlimitを増やす
            const allData = await tasksApi.getTemplates(data.count);
            if (allData && allData.results) {
              allTemplates = [...allData.results];
              console.log(`Retrieved all ${allTemplates.length} templates`);
            }
          } catch (err) {
            console.error('Error fetching all templates:', err);
          }
        }
      } else if (Array.isArray(data)) {
        // 配列形式の場合はそのまま使用
        allTemplates = data;
      }
      
      if (allTemplates.length > 0) {
        console.log(`Setting ${allTemplates.length} templates`);
        
        // DEFAULT_TEMPLATESの順番を維持するよう並び替え
        const sortedTemplates = [...allTemplates];
        sortedTemplates.sort((a, b) => {
          // 各テンプレートのDEFAULT_TEMPLATES内での位置を取得
          const templateNames = DEFAULT_TEMPLATES.map(t => t.template_name);
          const aIndex = templateNames.indexOf(a.template_name || a.title);
          const bIndex = templateNames.indexOf(b.template_name || b.title);
          
          // DEFAULT_TEMPLATESに含まれるテンプレートを優先し、その中でも定義順に並べる
          if (aIndex >= 0 && bIndex >= 0) {
            return aIndex - bIndex; // 両方が定義済みならDEFAULT_TEMPLATESでの順序通りに
          } else if (aIndex >= 0) {
            return -1; // aだけが定義済みならaを前に
          } else if (bIndex >= 0) {
            return 1; // bだけが定義済みならbを前に
          }
          
          // どちらもDEFAULT_TEMPLATESに含まれない場合は、名前でソート
          return (a.template_name || a.title).localeCompare(b.template_name || b.title);
        });
        
        setTemplates(sortedTemplates);
      } else {
        console.warn('No templates returned from API');
        setTemplates([]);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching templates:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError('テンプレートの取得に失敗しました');
      toast.error('テンプレートの取得に失敗しました');
      // エラー時は空配列をセット
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('このテンプレートを削除してもよろしいですか？')) {
      try {
        await tasksApi.deleteTemplate(id);
        toast.success('テンプレートを削除しました');
        fetchTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
        toast.error('テンプレートの削除に失敗しました');
      }
    }
  };

  const handleEdit = (template) => {
    console.log('Edit template clicked:', template);
    // IDのみをセットするのではなく、テンプレート全体をセット
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleApplyTemplate = async (templateId) => {
    try {
      // For now, just create a task from template with default values
      const newTask = await tasksApi.createFromTemplate(templateId, {
        title: templates.find(t => t.id === templateId)?.title || 'New Task',
      });
      
      toast.success('テンプレートからタスクを作成しました');
      
      // Navigate to the new task
      navigate(`/tasks/${newTask.id}`);
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('テンプレートの適用に失敗しました');
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTemplate(null);
    fetchTemplates();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };
  
  // デフォルトのテンプレートを作成する関数
  const createDefaultTemplates = async () => {
    try {
      console.log('Starting to create default templates...');
      setLoading(true);
      toast.loading('デフォルトテンプレートを作成中...', { id: 'default-templates' });
      
      // 作成/更新したテンプレートのカウンター初期化
      let createdCount = 0;
      
      // テンプレート一覧の取得と確認
      const currentTemplatesResponse = await tasksApi.getTemplates(1000); // 全テンプレートを取得
      let currentTemplates = [];
      
      if (currentTemplatesResponse.results && Array.isArray(currentTemplatesResponse.results)) {
        currentTemplates = currentTemplatesResponse.results;
      } else if (Array.isArray(currentTemplatesResponse)) {
        currentTemplates = currentTemplatesResponse;
      }
      
      console.log('現在のテンプレート一覧:', currentTemplates);
      console.log('「中間申告タスク」と「予定申告タスク」の存在確認:',
        currentTemplates?.some(t => t.title === '中間申告タスク' || t.template_name === '中間申告タスク'),
        currentTemplates?.some(t => t.title === '予定申告タスク' || t.template_name === '予定申告タスク')
      );
      
      // カテゴリとステータスを取得
      console.log('Fetching categories, priorities, and statuses...');
      const categoriesResponse = await tasksApi.getCategories();
      const prioritiesResponse = await tasksApi.getPriorities();
      const statusesResponse = await tasksApi.getStatuses();
      
      console.log('Raw categories response:', categoriesResponse);
      
      // 配列化 - DRFのページネーション対応
      const categories = Array.isArray(categoriesResponse) ? categoriesResponse : 
                        (categoriesResponse?.results && Array.isArray(categoriesResponse.results) ? 
                         categoriesResponse.results : 
                         (categoriesResponse?.data && Array.isArray(categoriesResponse.data) ? 
                          categoriesResponse.data : []));
      
      const priorities = Array.isArray(prioritiesResponse) ? prioritiesResponse : 
                        (prioritiesResponse?.results && Array.isArray(prioritiesResponse.results) ? 
                         prioritiesResponse.results : 
                         (prioritiesResponse?.data && Array.isArray(prioritiesResponse.data) ? 
                          prioritiesResponse.data : []));
      
      const statuses = Array.isArray(statusesResponse) ? statusesResponse : 
                       (statusesResponse?.results && Array.isArray(statusesResponse.results) ? 
                        statusesResponse.results : 
                        (statusesResponse?.data && Array.isArray(statusesResponse.data) ? 
                         statusesResponse.data : []));
      
      console.log('全カテゴリ一覧:', categories.map(c => `${c.id}: ${c.name}`));
      console.log('標準カテゴリ検索:',
        categories.find(c => c.name === '決算・申告'),
        categories.find(c => c.name === '税務顧問'),
        categories.find(c => c.name === '一般')
      );
      
      // まずカテゴリを確認して、必要なら作成
      const requiredCategories = ['一般', '決算・申告', '記帳代行', '税務顧問', '給与計算'];
      const categoryMap = {};
      
      // テンプレート名ごとの処理状況を記録する配列
      const processedTemplates = [];
      
      // 既存カテゴリをマッピング
      for (const categoryName of requiredCategories) {
        // 正確なカテゴリ名で検索
        let category = categories.find(c => c.name === categoryName);
        
        // 部分一致でも検索
        if (!category) {
          category = categories.find(c => 
            c.name && c.name.includes(categoryName) || 
            (categoryName && categoryName.includes(c.name))
          );
        }
        
        if (category) {
          categoryMap[categoryName] = category;
          console.log(`カテゴリ「${categoryName}」は既に存在します:`, category);
        } else {
          console.log(`カテゴリ「${categoryName}」が見つかりません。代替カテゴリを使用します。`);
          // デフォルトカテゴリを使用
          categoryMap[categoryName] = categories[0];
        }
      }
      
      console.log('カテゴリマッピング結果:', categoryMap);
      
      // データが取得できない場合でも進める
      if (categories.length === 0) {
        console.log('No categories found, but continuing');
      }
      
      if (priorities.length === 0) {
        console.log('No priorities found, but continuing');
      }
      
      if (statuses.length === 0) {
        console.log('No statuses found, but continuing');
      } else {
        console.log('Found statuses: ', statuses.map(s => `${s.id}:${s.name}`).join(', '));
      }
      
      // 未着手ステータスを検索
      const defaultStatus = statuses.find(s => s.name === '未着手');
      console.log('Found default status:', defaultStatus);
      
      // 中程度の優先度を検索
      const middlePriority = priorities.find(p => p.name === '中' || p.priority_value === 50);
      console.log('Found priority:', middlePriority);
      
      // DEFAULT_TEMPLATESの順番通りに処理
      console.log('処理するテンプレート:', DEFAULT_TEMPLATES.map(t => t.template_name));
      
      // すべてのテンプレートを処理
      for (const template of DEFAULT_TEMPLATES) {
        try {
          console.log(`========== Processing template: ${template.template_name} ==========`);
          
          // ビジネスIDとワークスペースIDを確保（ローカルストレージからまたはフォールバック値）
          let businessId = localStorage.getItem('businessId') || undefined;
          let workspaceId = localStorage.getItem('workspaceId') || undefined;
          
          console.log(`Using business ID: ${businessId}, workspace ID: ${workspaceId}`);
          
          if (!businessId || !workspaceId) {
            console.warn('ビジネスIDまたはワークスペースIDが取得できません。');
            // API経由でユーザー情報を取得して現在のワークスペースIDを取得
            try {
              // authApi.getProfileではなくusersApi.getProfileを使用（正しいエンドポイントへアクセス）
              const userProfile = await usersApi.getProfile();
              console.log('Got user profile:', userProfile);
              
              if (userProfile) {
                // ビジネスIDがなければ設定
                if (!businessId && userProfile.business && userProfile.business.id) {
                  businessId = userProfile.business.id;
                  localStorage.setItem('businessId', businessId);
                  console.log(`ビジネスIDをユーザープロフィールから設定: ${businessId}`);
                }
                
                // ワークスペースIDがなければ設定
                if (!workspaceId) {
                  if (userProfile.current_workspace && userProfile.current_workspace.id) {
                    workspaceId = userProfile.current_workspace.id;
                    localStorage.setItem('workspaceId', workspaceId);
                    console.log(`ワークスペースIDをcurrent_workspaceから設定: ${workspaceId}`);
                  } else if (userProfile.workspaces && userProfile.workspaces.length > 0) {
                    workspaceId = userProfile.workspaces[0].id;
                    localStorage.setItem('workspaceId', workspaceId);
                    console.log(`ワークスペースIDをworkspaces[0]から設定: ${workspaceId}`);
                  }
                }
                
                // IDが取得できたか再確認
                if (!businessId || !workspaceId) {
                  // 直接ステータスを使用（API取得に失敗した場合のフォールバック）
                  if (!businessId) {
                    businessId = 1; // フォールバック値
                    localStorage.setItem('businessId', businessId);
                    console.log(`ビジネスIDをフォールバック値から設定: ${businessId}`);
                  }
                  
                  if (!workspaceId) {
                    workspaceId = 1; // フォールバック値
                    localStorage.setItem('workspaceId', workspaceId);
                    console.log(`ワークスペースIDをフォールバック値から設定: ${workspaceId}`);
                  }
                }
              } else {
                // プロファイル取得失敗時のフォールバック
                businessId = 1;
                workspaceId = 1;
                localStorage.setItem('businessId', businessId);
                localStorage.setItem('workspaceId', workspaceId);
                console.log(`ユーザー情報取得失敗。フォールバック値を使用: businessId=${businessId}, workspaceId=${workspaceId}`);
              }
            } catch (err) {
              console.error('ユーザー情報取得エラー:', err);
              // エラー時のフォールバック
              businessId = 1;
              workspaceId = 1;
              localStorage.setItem('businessId', businessId);
              localStorage.setItem('workspaceId', workspaceId);
              console.log(`ユーザー情報取得エラー。フォールバック値を使用: businessId=${businessId}, workspaceId=${workspaceId}`);
            }
          }
          
          // カテゴリを検索 - まず名前で検索し、なければ最初のカテゴリを使用
          let category = categoryMap[template.category_name];
          
          // 完全一致しない場合は部分一致でも検索
          if (!category) {
            category = categoryMap[template.category_name.split(' ')[0]];
          }
          
          // それでも見つからない場合は最初のカテゴリを使用
          if (!category && Object.values(categoryMap).length > 0) {
            category = Object.values(categoryMap)[0];
          }
          
          console.log(`Category for ${template.template_name}:`, category);
          
          // テンプレート作成データを準備
          const templateData = {
            title: template.title,
            description: template.description,
            category: category?.id || null, // nullを明示的に設定
            priority: middlePriority?.id || null, // nullを明示的に設定
            status: defaultStatus?.id || 27, // デフォルト値として27を使用（未着手ステータスID）
            is_template: true,
            template_name: template.template_name,
            recurrence_pattern: template.recurrence_pattern,
            // 数値として一貫性を保つために変換
            estimated_hours: parseFloat(template.estimated_hours) || null,
            // ビジネスIDとワークスペースIDをここで設定
            business: businessId,
            workspace: workspaceId,
          };
          
          console.log('Template data prepared:', templateData);
          
          // 既存のテンプレートと重複がないか確認 - より柔軟なチェック
          const existsCheck = (currentTemplates || []).filter(t => 
            (t.template_name && t.template_name.toLowerCase() === template.template_name.toLowerCase()) || 
            (t.title && t.title.toLowerCase() === template.title.toLowerCase())
          );
          
          console.log(`テンプレート「${template.template_name}」の存在チェック結果:`, existsCheck);
          
          const existingTemplate = existsCheck.length > 0 ? existsCheck[0] : null;
          const exists = !!existingTemplate;
          
          console.log(`Template exists check (${template.template_name}): ${exists}`, existingTemplate);
          
          // 新規作成または更新
          if (!exists) {
            // 新規作成
            console.log(`Creating new template via API: ${template.title}`);
            const createdTemplate = await tasksApi.createTask(templateData);
            console.log('Template created successfully:', createdTemplate);
            createdCount++;
            processedTemplates.push({
              name: template.template_name,
              action: 'created',
              id: createdTemplate.id
            });
          } else {
            // 既存のテンプレートを更新 - ただし変更がある場合のみ
            console.log(`Checking existing template: ${template.title} (ID: ${existingTemplate.id})`);
            
            // 値を厳密に比較する関数
            const compareSafeEquals = (a, b) => {
              // 両方null/undefinedなら等しい
              if (a == null && b == null) return true;
              
              // 片方だけnull/undefinedなら異なる
              if (a == null || b == null) return false;
              
              // 型が異なる場合、文字列に変換して比較
              const strA = String(a).trim();
              const strB = String(b).trim();
              
              // 数値の場合は数値として比較する（小数点による違いを無視）
              if (!isNaN(parseFloat(a)) && !isNaN(parseFloat(b))) {
                return parseFloat(a) === parseFloat(b);
              }
              
              // 文字列として比較
              return strA === strB;
            };
            
            // 実際に更新が必要なフィールドだけを判定
            const titleMatches = compareSafeEquals(template.title, existingTemplate.title);
            const descMatches = compareSafeEquals(template.description, existingTemplate.description);
            
            // estimated_hours の比較はcompareSafeEqualsを使用
            const hoursMatch = compareSafeEquals(template.estimated_hours, existingTemplate.estimated_hours);
            
            const patternMatches = compareSafeEquals(template.recurrence_pattern, existingTemplate.recurrence_pattern);
            
            // カテゴリの比較ロジック改善
            let categoryMatches = false;
            
            // 両方nullならマッチ
            if (category?.id == null && existingTemplate.category?.id == null) {
              categoryMatches = true;
            } 
            // 片方だけnullの場合は不一致
            else if (category?.id == null || existingTemplate.category?.id == null) {
              categoryMatches = false;
            }
            // 両方存在する場合は値を比較
            else {
              categoryMatches = category.id === existingTemplate.category.id;
            }
            
            console.log('比較結果:', {
              title: {template: template.title, existing: existingTemplate.title, matches: titleMatches},
              desc: {template: template.description, existing: existingTemplate.description, matches: descMatches},
              hours: {template: template.estimated_hours, existing: existingTemplate.estimated_hours, matches: hoursMatch},
              pattern: {template: template.recurrence_pattern, existing: existingTemplate.recurrence_pattern, matches: patternMatches},
              category: {template: category?.id, existing: existingTemplate.category?.id, matches: categoryMatches}
            });
            
            const needsUpdate = !titleMatches || !descMatches || !hoursMatch || !patternMatches || !categoryMatches;
            
            // 更新が必要な理由を詳細にログ出力
            if (needsUpdate) {
              console.log(`更新が必要な理由:`, {
                titleDiff: !titleMatches ? 
                  {current: existingTemplate.title, new: template.title} : null,
                descDiff: !descMatches ? 
                  {current: existingTemplate.description, new: template.description} : null,
                hoursDiff: !hoursMatch ? 
                  {current: existingTemplate.estimated_hours, new: template.estimated_hours, 
                   currentType: typeof existingTemplate.estimated_hours, newType: typeof template.estimated_hours} : null,
                patternDiff: !patternMatches ? 
                  {current: existingTemplate.recurrence_pattern, new: template.recurrence_pattern} : null,
                categoryDiff: !categoryMatches ? 
                  {current: existingTemplate.category?.id, new: category?.id} : null
              });
            }
            
            if (needsUpdate) {
              try {
                console.log(`Updating existing template: ${template.title} - データが異なるため更新します`);
                const updatedTemplate = await tasksApi.updateTask(existingTemplate.id, {
                  ...templateData,
                  // 既存IDを保持
                  id: existingTemplate.id
                });
                console.log('Template updated successfully:', updatedTemplate);
                createdCount++;
                processedTemplates.push({
                  name: template.template_name,
                  action: 'updated',
                  id: existingTemplate.id,
                  changes: {
                    title: !titleMatches,
                    desc: !descMatches,
                    hours: !hoursMatch,
                    pattern: !patternMatches,
                    category: !categoryMatches
                  }
                });
              } catch (updateErr) {
                console.error(`Error updating template ${template.title}:`, updateErr);
                console.error('Update error details:', updateErr.response?.data || updateErr.message);
              }
            } else {
              console.log(`Skipping update for ${template.title} - 変更なし`);
              processedTemplates.push({
                name: template.template_name,
                action: 'skipped',
                id: existingTemplate.id
              });
            }
          }
        } catch (err) {
          console.error(`Error processing template ${template.title}:`, err);
          console.error('Error details:', err.response?.data || err.message);
          // 1つのテンプレート作成に失敗しても他は続ける
          continue;
        }
      }
      
      // 処理結果のサマリーを出力
      console.log('==== テンプレート処理サマリー ====');
      console.log('合計処理件数:', DEFAULT_TEMPLATES.length);
      console.log('作成または更新件数:', createdCount);
      console.log('各テンプレートの処理結果:', processedTemplates);
      
      // 成功メッセージを表示
      if (createdCount > 0) {
        console.log(`デフォルトテンプレート処理完了: ${createdCount}個のテンプレートを作成または更新しました`);
        toast.success(`${createdCount}個のデフォルトテンプレートを作成または更新しました`, { id: 'default-templates' });
      } else {
        console.log('デフォルトテンプレート処理完了: 更新は必要ありませんでした');
        toast.success('すべてのデフォルトテンプレートは既に存在しており、更新の必要はありませんでした', { id: 'default-templates' });
      }
      
      // テンプレート一覧を再取得（大きなlimitで）
      await fetchTemplates();
    } catch (error) {
      console.error('Error creating default templates:', error);
      toast.error('デフォルトテンプレートの作成に失敗しました', { id: 'default-templates' });
    } finally {
      setLoading(false);
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
            onClick={() => navigate('/tasks')}
            className="text-red-700 underline"
          >
            タスク一覧に戻る
          </button>
        </p>
      </div>
    );
  }

  if (showForm) {
    return (
      <TaskTemplateForm 
        templateId={editingTemplate?.id}
        templateData={editingTemplate} // 既存データを直接渡す
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">タスクテンプレート</h1>
        <div className="flex space-x-3">
          <button 
            className="btn btn-outline btn-success"
            onClick={createDefaultTemplates}
          >
            <HiOutlineLibrary className="mr-2" /> デフォルトテンプレート作成
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleCreateNew}
          >
            <HiOutlinePlus className="mr-2" /> 新規テンプレート
          </button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-lg border border-gray-200">
          <HiOutlineDocumentText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">テンプレートがありません</h3>
          <p className="mt-1 text-gray-500">新しいテンプレートを作成して繰り返しタスクを効率化しましょう。</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={createDefaultTemplates}
              className="btn btn-success"
            >
              <HiOutlineLibrary className="mr-2" /> デフォルトテンプレート作成
            </button>
            <button
              onClick={handleCreateNew}
              className="btn btn-primary"
            >
              <HiOutlinePlus className="mr-2" /> 新規テンプレート作成
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full table-zebra">
            <thead>
              <tr>
                <th>テンプレート名</th>
                <th>説明</th>
                <th>カテゴリ</th>
                <th>スケジュール</th>
                <th>見積時間</th>
                <th>内包タスク</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr key={template.id} className="hover">
                  <td className="font-medium">
                    {template.template_name || template.title}
                  </td>
                  <td className="max-w-xs truncate" title={template.description}>
                    {template.description || '説明なし'}
                  </td>
                  <td>
                    {template.category ? (
                      <span className="badge badge-info badge-sm">
                        {template.category.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    {template.schedule ? (
                      <span className="badge badge-ghost badge-sm">
                        {
                          template.schedule_type === 'monthly_start' ? '月初作成' :
                          template.schedule_type === 'monthly_end' ? '月末作成' :
                          template.schedule_type === 'fiscal_relative' ? '決算日基準' :
                          template.schedule_type === 'custom' ? 'カスタム' :
                          '未設定'
                        }
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    {template.estimated_hours ? (
                      <span>{template.estimated_hours}時間</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center">
                      <span className="badge badge-secondary badge-sm">
                        {template.child_tasks_count || 0}個
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end space-x-1">
                      <button
                        className="btn btn-xs btn-info"
                        onClick={() => handleApplyTemplate(template.id)}
                        title="このテンプレートからタスクを作成"
                      >
                        <HiOutlineDuplicate size={16} />
                      </button>
                      <button
                        className="btn btn-xs btn-secondary"
                        onClick={() => navigate(`/task-templates/${template.id}`)}
                        title="内包タスク一覧"
                      >
                        <HiOutlineTemplate size={16} />
                      </button>
                      <button
                        className="btn btn-xs btn-primary"
                        onClick={() => handleEdit(template)}
                        title="テンプレート編集"
                      >
                        <HiOutlinePencilAlt size={16} />
                      </button>
                      <button
                        className="btn btn-xs btn-error"
                        onClick={() => handleDelete(template.id)}
                        title="削除"
                      >
                        <HiOutlineTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TaskTemplateList;