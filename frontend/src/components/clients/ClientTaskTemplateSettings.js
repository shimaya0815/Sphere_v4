import React, { useState, useEffect } from 'react';
import { clientsApi } from '../../api';
import toast from 'react-hot-toast';
import TaskTemplateForm from './TaskTemplateForm';
import TaskTemplateCard from './TaskTemplateCard';
import { 
  HiOutlinePlus, 
  HiOutlineTemplate, 
  HiOutlineClipboardCheck,
  HiOutlineRefresh
} from 'react-icons/hi';

const ClientTaskTemplateSettings = ({ clientId, client }) => {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [copyingTemplates, setCopyingTemplates] = useState(false);
  const [templateMode, setTemplateMode] = useState('custom'); // 'custom', 'default', 'none'
  
  // Load templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await clientsApi.getClientTaskTemplates(clientId);
      setTemplates(data);
      
      // 既存のテンプレートの有無でモードを判断
      if (data && data.length > 0) {
        setTemplateMode('custom');
      } else {
        // テンプレートがない場合はデフォルトモード
        setTemplateMode('default');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('テンプレート設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTemplates();
  }, [clientId]);
  
  // Handle template mode change
  const handleTemplateModeChange = (e) => {
    const value = e.target.value;
    setTemplateMode(value);
  };
  
  // Copy default templates
  const handleCopyDefaults = async () => {
    setCopyingTemplates(true);
    try {
      await clientsApi.copyDefaultTemplates(clientId);
      toast.success('デフォルトテンプレートをコピーしました');
      fetchTemplates();
      setTemplateMode('custom');
    } catch (error) {
      console.error('Error copying default templates:', error);
      toast.error('デフォルトテンプレートのコピーに失敗しました');
    } finally {
      setCopyingTemplates(false);
    }
  };
  
  // Apply templates to create tasks
  const handleApplyTemplates = async () => {
    setCreatingTask(true);
    try {
      const tasks = await clientsApi.applyTemplates(clientId);
      if (tasks.length > 0) {
        toast.success(`${tasks.length}件のタスクを作成しました`);
      } else {
        toast.info('作成されたタスクはありません');
      }
    } catch (error) {
      console.error('Error applying templates:', error);
      toast.error('タスクの作成に失敗しました');
    } finally {
      setCreatingTask(false);
    }
  };
  
  // Create task from specific template
  const handleCreateTaskFromTemplate = async (templateId) => {
    try {
      await clientsApi.applyTemplates(clientId, { template_id: templateId });
      toast.success('タスクを作成しました');
    } catch (error) {
      console.error('Error creating task from template:', error);
      toast.error('タスクの作成に失敗しました');
    }
  };
  
  // Delete template
  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('このテンプレート設定を削除してもよろしいですか？')) {
      try {
        await clientsApi.deleteClientTaskTemplate(templateId);
        toast.success('テンプレート設定を削除しました');
        fetchTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
        toast.error('テンプレート設定の削除に失敗しました');
      }
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return (
    <div>
      {/* タスクテンプレート使用設定 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">タスクテンプレート設定</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            使用するテンプレートタイプ
          </label>
          <div className="flex flex-col space-y-2">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="template_mode"
                value="default"
                checked={templateMode === 'default'}
                onChange={handleTemplateModeChange}
              />
              <span className="ml-2">デフォルトテンプレートを使用</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="template_mode"
                value="custom"
                checked={templateMode === 'custom'}
                onChange={handleTemplateModeChange}
              />
              <span className="ml-2">カスタマイズしたテンプレートを使用</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="template_mode"
                value="none"
                checked={templateMode === 'none'}
                onChange={handleTemplateModeChange}
              />
              <span className="ml-2">テンプレートを使用しない（手動作成のみ）</span>
            </label>
          </div>
        </div>
        
        {templateMode !== 'none' && (
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleApplyTemplates}
              disabled={creatingTask}
            >
              <HiOutlineClipboardCheck className="mr-1" />
              {creatingTask ? 'タスク作成中...' : 'テンプレートからタスクを作成'}
            </button>
            
            {templateMode === 'default' && (
              <button
                className="btn btn-outline btn-sm"
                onClick={handleCopyDefaults}
                disabled={copyingTemplates}
              >
                <HiOutlineTemplate className="mr-1" />
                {copyingTemplates ? 'コピー中...' : 'デフォルトテンプレートをコピー'}
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* テンプレート一覧 */}
      {templateMode === 'custom' && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">テンプレート一覧</h2>
            <div className="flex gap-2">
              <button 
                className="btn btn-outline btn-sm"
                onClick={fetchTemplates}
              >
                <HiOutlineRefresh className="mr-1" />
                更新
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditingTemplate(null);
                  setShowTemplateForm(true);
                }}
              >
                <HiOutlinePlus className="mr-1" /> テンプレートを追加
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {templates && templates.length > 0 ? (
              templates.map(template => (
                <TaskTemplateCard 
                  key={template.id} 
                  template={template}
                  onEdit={() => {
                    setEditingTemplate(template);
                    setShowTemplateForm(true);
                  }}
                  onDelete={() => handleDeleteTemplate(template.id)}
                  onCreateTask={() => handleCreateTaskFromTemplate(template.id)}
                />
              ))
            ) : (
              <div className="col-span-2 bg-gray-50 p-6 rounded-lg text-center text-gray-500">
                テンプレートが登録されていません。デフォルトテンプレートを
                コピーするか、新しいテンプレートを追加してください。
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* テンプレートフォームモーダル */}
      {showTemplateForm && (
        <TaskTemplateForm 
          clientId={clientId}
          template={editingTemplate}
          onClose={() => {
            setShowTemplateForm(false);
            setEditingTemplate(null);
          }}
          onSuccess={fetchTemplates}
        />
      )}
    </div>
  );
};

export default ClientTaskTemplateSettings;