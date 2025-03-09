import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tasksApi from '../../api/tasks';
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
    title: '月次処理チェック',
    description: '毎月の処理状況を確認し、必要な対応を行います。',
    category_name: '一般',
    estimated_hours: 2,
    template_name: 'デフォルト月次チェック',
    recurrence_pattern: 'monthly'
  },
  {
    title: '記帳代行業務',
    description: '請求書・領収書などに基づき会計データを作成します。',
    category_name: '記帳代行',
    estimated_hours: 3,
    template_name: 'デフォルト記帳代行',
    recurrence_pattern: 'monthly'
  },
  {
    title: '決算・法人税申告業務',
    description: '決算期の法人税申告書を作成・提出します。',
    category_name: '決算・申告',
    estimated_hours: 8,
    template_name: 'デフォルト決算・申告',
    recurrence_pattern: 'yearly'
  },
  {
    title: '源泉所得税納付業務',
    description: '源泉所得税の計算・納付手続きを行います。',
    category_name: '税務顧問',
    estimated_hours: 1,
    template_name: 'デフォルト源泉所得税',
    recurrence_pattern: 'monthly'
  },
  {
    title: '住民税納付業務',
    description: '住民税の納付手続き・特別徴収を行います。',
    category_name: '税務顧問',
    estimated_hours: 1,
    template_name: 'デフォルト住民税',
    recurrence_pattern: 'yearly'
  },
  {
    title: '社会保険対応業務',
    description: '社会保険の手続き・計算を行います。',
    category_name: '給与計算',
    estimated_hours: 2,
    template_name: 'デフォルト社会保険',
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
      const data = await tasksApi.getTemplates();
      console.log('Templates fetched for display:', data);
      // データがあるか確認
      if (data && data.length > 0) {
        setTemplates(data);
      } else {
        console.warn('No templates returned from API');
        setTemplates([]);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching templates:', error);
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
        await tasksApi.deleteTask(id);
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
      setLoading(true);
      toast.loading('デフォルトテンプレートを作成中...', { id: 'default-templates' });
      
      // カテゴリとステータスを取得
      const categoriesResponse = await tasksApi.getCategories();
      const prioritiesResponse = await tasksApi.getPriorities();
      const statusesResponse = await tasksApi.getStatuses();
      
      // 配列化 - DRFのページネーション対応
      const categories = Array.isArray(categoriesResponse) ? categoriesResponse : 
                        (categoriesResponse?.results && Array.isArray(categoriesResponse.results) ? 
                         categoriesResponse.results : []);
      
      const priorities = Array.isArray(prioritiesResponse) ? prioritiesResponse : 
                        (prioritiesResponse?.results && Array.isArray(prioritiesResponse.results) ? 
                         prioritiesResponse.results : []);
      
      const statuses = Array.isArray(statusesResponse) ? statusesResponse : 
                       (statusesResponse?.results && Array.isArray(statusesResponse.results) ? 
                        statusesResponse.results : []);
      
      console.log('Categories:', categories);
      console.log('Priorities:', priorities);
      console.log('Statuses:', statuses);
      
      let createdCount = 0;
      
      // 各デフォルトテンプレートを作成
      for (const template of DEFAULT_TEMPLATES) {
        try {
          // カテゴリを検索
          const category = categories.find(c => c.name === template.category_name);
          
          // 中程度の優先度を検索
          const middlePriority = priorities.find(p => p.name === '中' || p.priority_value === 50);
          
          // デフォルトの未着手ステータスを検索
          const defaultStatus = statuses.find(s => s.name === '未着手');
          
          // テンプレート作成データを準備
          const templateData = {
            title: template.title,
            description: template.description,
            category: category?.id,
            priority: middlePriority?.id,
            status: defaultStatus?.id,
            is_template: true,
            template_name: template.template_name,
            recurrence_pattern: template.recurrence_pattern,
            estimated_hours: template.estimated_hours,
          };
          
          console.log('Creating template:', templateData);
          
          // 既存のテンプレートと重複がないか確認
          const exists = (templates || []).some(t => 
            (t.template_name === template.template_name) || 
            (t.title === template.title)
          );
          
          if (!exists) {
            console.log('Creating template with data:', templateData);
            const createdTemplate = await tasksApi.createTask(templateData);
            console.log('Template created successfully:', createdTemplate);
            createdCount++;
          }
        } catch (err) {
          console.error(`Error creating template ${template.title}:`, err);
          // 1つのテンプレート作成に失敗しても他は続ける
          continue;
        }
      }
      
      // 成功メッセージを表示
      if (createdCount > 0) {
        toast.success(`${createdCount}個のデフォルトテンプレートを作成しました`, { id: 'default-templates' });
      } else {
        toast.success('すべてのデフォルトテンプレートは既に存在しています', { id: 'default-templates' });
      }
      
      // テンプレート一覧を再取得
      fetchTemplates();
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
                        onClick={() => navigate(`/tasks/templates/${template.id}/tasks`)}
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