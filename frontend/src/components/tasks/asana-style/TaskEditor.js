import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { 
  HiOutlineX, 
  HiCheck, 
  HiOutlineClock, 
  HiUser, 
  HiUserGroup, 
  HiOutlineTrash, 
  HiExclamation 
} from 'react-icons/hi';
import { tasksApi, clientsApi, usersApi, timeManagementApi } from '../../../api';
import toast from 'react-hot-toast';

// 分割コンポーネントのインポート
import CurrentAssignee from './components/CurrentAssignee';
import TimeTracking from './components/TimeTracking';
import DeleteTaskModal from './components/DeleteTaskModal';

// セクションコンポーネントのインポート
import {
  TaskEditorHeader,
  TaskEditorFooter,
  TaskBasicInfoSection,
  TaskAssigneeSection,
  TaskDatePrioritySection,
  TaskDescriptionSection,
  TaskMetaInfoSection,
  TaskAdditionalSettingsSection
} from './components/sections';

/**
 * Asana風タスク編集コンポーネント
 * - 編集状態のリアルタイム監視
 * - 自動保存とバッチ処理
 * - 視覚的フィードバック強化
 */
const TaskEditor = ({ task, isNewTask = false, onClose, onTaskUpdated, isOpen = false }) => {
  // フォームのリセット状態を追跡するためのキー
  const [resetKey, setResetKey] = useState(Date.now());
  
  // 状態管理
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [businessId, setBusinessId] = useState(null);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  // is_fiscal_task関連の状態管理は削除
  const [isAssigneeExpanded, setIsAssigneeExpanded] = useState(false);
  const [isDateExpanded, setIsDateExpanded] = useState(false);
  
  // 削除機能関連の状態
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 共通スタイル
  const inputClassName = "shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-2 border-gray-300 rounded-md hover:border-gray-400";
  const selectClassName = "shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-2 border-gray-300 rounded-md hover:border-gray-400";
  
  // 時間記録の状態管理
  const [isRecordingTime, setIsRecordingTime] = useState(false);
  const [timeEntry, setTimeEntry] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [timerIntervalId, setTimerIntervalId] = useState(null);
  const [cachedTimeEntries, setCachedTimeEntries] = useState([]);  // 必ず空配列で初期化
  const [isLoadingTimeEntries, setIsLoadingTimeEntries] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState(null);
  const [timeEntryForm, setTimeEntryForm] = useState({
    start_time: '',
    end_time: '',
    description: '',
    duration_seconds: 0
  });
  
  // 保存状態管理
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle, saving, saved, error
  const [pendingChanges, setPendingChanges] = useState({});
  const saveTimerRef = useRef(null);

  // フォーム管理
  const { control, handleSubmit, reset, setValue, getValues, watch, formState } = useForm({
    defaultValues: {
      title: '',
      description: '',
      status: '',
      category: '',
      client: '',
      fiscal_year: '',
      worker: '',
      reviewer: '',
      due_date: '',
      start_date: '',
      completed_at: '',
      priority: '',
      priority_value: '',
      is_fiscal_task: 'false',
      is_recurring: 'false',
      recurrence_pattern: '',
      recurrence_end_date: '',
      is_template: 'false', // 明示的にfalseを設定
      template_name: ''
    },
  });
  
  // watchedの値を取得
  const watchedClient = watch('client');
  const watchedIsRecurring = watch('is_recurring');
  const watchedIsTemplate = watch('is_template');
  
  /**
   * isOpen状態の変化を監視してリセット処理
   */
  useEffect(() => {
    console.log("isOpen changed:", isOpen, "isNewTask:", isNewTask);
    if (isOpen) {
      // スライドオーバーが開く時
      if (isNewTask) {
        console.log("Resetting form for new task");
        // 新規タスク作成時はフォームを初期化
        reset({
          title: '',
          description: '',
          status: '',
          category: '',
          client: '',
          fiscal_year: '',
          worker: '',
          reviewer: '',
          due_date: '',
          start_date: '',
          completed_at: '',
          priority: '',
          priority_value: '',
          is_fiscal_task: 'false',
          is_recurring: 'false',
          recurrence_pattern: '',
          recurrence_end_date: '',
          is_template: 'false',
          template_name: ''
        });
        // リセットキーを更新して強制的に再レンダリング
        setResetKey(Date.now());
        // その他の状態もリセット
        setPendingChanges({});
        setIsDirty(false);
        setSaveState('idle');
      }
    }
  }, [isOpen, isNewTask, reset]);
  
  /**
   * タスクデータの初期化
   */
  useEffect(() => {
    if (task && !isNewTask) {
      const formattedTask = { ...task };
      // 日付フィールドの変換
      if (formattedTask.due_date) {
        formattedTask.due_date = formatDateForInput(formattedTask.due_date);
      }
      if (formattedTask.start_date) {
        formattedTask.start_date = formatDateForInput(formattedTask.start_date);
      }
      if (formattedTask.completed_at) {
        formattedTask.completed_at = formatDateForInput(formattedTask.completed_at);
      }
      if (formattedTask.recurrence_end_date) {
        formattedTask.recurrence_end_date = formatDateForInput(formattedTask.recurrence_end_date);
      }
      
      // boolean値を文字列に変換（フォームコントロールの互換性のため）
      if (formattedTask.is_fiscal_task !== undefined) {
        formattedTask.is_fiscal_task = formattedTask.is_fiscal_task ? 'true' : 'false';
      }
      if (formattedTask.is_recurring !== undefined) {
        formattedTask.is_recurring = formattedTask.is_recurring ? 'true' : 'false';
      }
      if (formattedTask.is_template !== undefined) {
        formattedTask.is_template = formattedTask.is_template ? 'true' : 'false';
      }
      
      // 優先度の数値設定
      if (formattedTask.priority_data && formattedTask.priority_data.priority_value) {
        formattedTask.priority_value = formattedTask.priority_data.priority_value.toString();
      } else {
        formattedTask.priority_value = '';
      }
      
      Object.keys(formattedTask).forEach(key => {
        if (formattedTask[key] === null) {
          formattedTask[key] = '';
        }
      });
      
      // フォームの初期値を設定
      reset(formattedTask);
      
      // 時間記録中かどうかを確認
      checkActiveTimeEntry(formattedTask.id);
      
      // 時間エントリのリストを取得
      fetchTimeEntries();
    }
  }, [task, isNewTask, reset]);
  
  /**
   * 各種マスターデータの取得
   */
  useEffect(() => {
    const fetchMasterData = async () => {
      let hasErrors = false;
      
      // ビジネスIDを取得
      try {
        const profileResponse = await usersApi.getProfile();
        if (profileResponse.data && profileResponse.data.business) {
          setBusinessId(profileResponse.data.business.id);
        } else {
          console.warn('Business ID not found in profile response. Using default value 1.');
          setBusinessId(1); // フォールバック値
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setBusinessId(1); // フォールバック値
        hasErrors = true;
      }
      
      // ステータス一覧を取得
      try {
        console.log('Fetching task statuses from API...');
        const statusesResponse = await tasksApi.getStatuses();
        console.log('StatusesResponse:', statusesResponse);
        
        if (statusesResponse.data) {
          const statusesList = statusesResponse.data;
          console.log('Status list received:', statusesList);
          
          // ステータスリストが配列であることを確認し、orderでソート
          if (Array.isArray(statusesList)) {
            const sortedStatuses = [...statusesList].sort((a, b) => (a.order || 0) - (b.order || 0));
            console.log('Sorted statuses:', sortedStatuses);
            setStatuses(sortedStatuses);
            
            // グローバルにステータス一覧をキャッシュして他のコンポーネントで使用できるようにする
            window.__SPHERE_CACHED_STATUSES = sortedStatuses;
            
            // 新規タスク作成時のフォームデフォルト値を設定
            if (isNewTask) {
              // 未着手ステータスを検索
              const notStartedStatus = sortedStatuses.find(s => s.name === '未着手');
              console.log('Found 未着手 status?', notStartedStatus);
              
              if (notStartedStatus) {
                console.log('Setting default status to 未着手:', notStartedStatus.id);
                setValue('status', notStartedStatus.id.toString());
              } else if (sortedStatuses.length > 0) {
                // 未着手が見つからない場合は最初のステータスを設定
                const firstStatus = sortedStatuses[0];
                console.log('Setting default status to first status:', firstStatus);
                setValue('status', firstStatus.id.toString());
              }
            }
          } else {
            console.error('API returned statuses but not as an array:', statusesList);
            // デフォルト値を使用
            setDefaultFallbackStatuses();
          }
        } else {
          console.warn('No data in API response for statuses');
          setDefaultFallbackStatuses();
        }
      } catch (error) {
        console.error('Error fetching statuses:', error);
        setDefaultFallbackStatuses();
        hasErrors = true;
      }
      
      // ヘルパー関数: デフォルトステータスを設定
      function setDefaultFallbackStatuses() {
        const fallbackStatuses = [
          { id: 1, name: '未着手', order: 1 },
          { id: 2, name: '進行中', order: 2 },
          { id: 3, name: '完了', order: 3 }
        ];
        console.log('Using fallback statuses:', fallbackStatuses);
        setStatuses(fallbackStatuses);
        window.__SPHERE_CACHED_STATUSES = fallbackStatuses;
        
        // 新規タスク作成時のデフォルト値を設定
        if (isNewTask) {
          setValue('status', '1'); // デフォルトの未着手ID
        }
      }
      
      // カテゴリー一覧を取得
      try {
        const categoriesResponse = await tasksApi.getCategories();
        if (categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        } else {
          setCategories([{ id: 1, name: '一般', color: '#6366F1' }]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([{ id: 1, name: '一般', color: '#6366F1' }]);
        hasErrors = true;
      }
      
      // 優先度一覧を取得
      try {
        const prioritiesResponse = await tasksApi.getPriorities();
        if (prioritiesResponse.data) {
          setPriorities(prioritiesResponse.data);
        } else {
          setPriorities([
            { id: 1, name: '低', priority_value: 1 },
            { id: 2, name: '中', priority_value: 2 },
            { id: 3, name: '高', priority_value: 3 }
          ]);
        }
      } catch (error) {
        console.error('Error fetching priorities:', error);
        setPriorities([
          { id: 1, name: '低', priority_value: 1 },
          { id: 2, name: '中', priority_value: 2 },
          { id: 3, name: '高', priority_value: 3 }
        ]);
        hasErrors = true;
      }
      
      // クライアント一覧を取得
      try {
        console.log('クライアント一覧を取得します');
        const clientsResponse = await clientsApi.getClients();
        console.log('クライアント一覧の取得結果:', clientsResponse);
        
        if (clientsResponse && clientsResponse.results) {
          // 結果がresults配列に含まれているケース
          console.log('クライアントデータ(results形式):', clientsResponse.results);
          setClients(clientsResponse.results);
        } else if (Array.isArray(clientsResponse)) {
          // 直接配列で返されるケース
          console.log('クライアントデータ(配列形式):', clientsResponse);
          setClients(clientsResponse);
        } else if (clientsResponse && Array.isArray(clientsResponse.data)) {
          // data配列に含まれているケース
          console.log('クライアントデータ(data配列形式):', clientsResponse.data);
          setClients(clientsResponse.data);
        } else {
          console.warn('クライアントデータがありません');
          setClients([]);
        }
      } catch (error) {
        console.error('クライアント一覧の取得に失敗しました:', error);
        setClients([]);
        hasErrors = true;
      }
      
      // 決算期一覧は初期状態では空配列にして、クライアント選択時に取得
      try {
        // デフォルトでは空の配列を設定
        console.log('初期化時は決算期を空配列に設定します');
        setFiscalYears([]);
      } catch (error) {
        console.error('Error initializing fiscal years:', error);
        setFiscalYears([]);
        hasErrors = true;
      }
      
      // ユーザー一覧を取得 - 同じビジネスのユーザーのみ
      try {
        console.log('Fetching users with businessId:', businessId);
        
        // ビジネスIDを使ってユーザー一覧取得
        const usersResponse = await usersApi.getUsers({ business: businessId });
        console.log('Users API response in TaskEditor:', usersResponse);
        
        if (usersResponse && usersResponse.data && Array.isArray(usersResponse.data)) {
          console.log('Setting users from API:', usersResponse.data.length, 'users found');
          setUsers(usersResponse.data);
        } else {
          console.warn('No valid user data received');
          // フォールバック：ビジネスユーザーを直接取得
          try {
            const businessUsers = await usersApi.getBusinessUsers(businessId);
            console.log('Business users fallback:', businessUsers);
            if (Array.isArray(businessUsers) && businessUsers.length > 0) {
              setUsers(businessUsers);
            } else {
              // フォールバック2：デモユーザー
              const demoUsers = [
                { id: 1, username: 'admin', email: 'admin@example.com', first_name: '管理者', last_name: 'ユーザー' },
                { id: 2, username: 'worker1', email: 'worker1@example.com', first_name: '担当者', last_name: '1' },
                { id: 3, username: 'worker2', email: 'worker2@example.com', first_name: '担当者', last_name: '2' },
                { id: 4, username: 'reviewer1', email: 'reviewer1@example.com', first_name: 'レビュアー', last_name: '1' },
              ];
              console.log('Using demo users');
              setUsers(demoUsers);
            }
          } catch (fallbackError) {
            console.error('Fallback error:', fallbackError);
            setUsers([]);
          }
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
        hasErrors = true;
      }
      
      // エラーがあった場合のみ通知
      if (hasErrors) {
        toast.error('一部のマスターデータの取得に失敗しました。一部機能が制限される場合があります。');
      }
    };
    
    fetchMasterData();
  }, []);
  
  /**
   * クライアント変更時の処理 - 決算期も取得
   */
  useEffect(() => {
    if (watchedClient) {
      const clientId = parseInt(watchedClient);
      setSelectedClient(clientId);
      
      // クライアントの決算期を取得
      const fetchFiscalYears = async () => {
        console.log(`クライアント(ID: ${clientId})の決算期を取得します`);
        try {
          const response = await clientsApi.getFiscalYears(clientId);
          console.log('決算期データ取得結果:', response);
          
          if (response && Array.isArray(response.results || response)) {
            const fiscalYearsArray = response.results || response;
            console.log('設定する決算期データ:', fiscalYearsArray);
            setFiscalYears(fiscalYearsArray);
          } else {
            console.warn('決算期データが正しい形式ではありません:', response);
            setFiscalYears([]);
          }
        } catch (error) {
          console.error('決算期データの取得に失敗しました:', error);
          setFiscalYears([]);
        }
      };
      
      fetchFiscalYears();
    } else {
      setSelectedClient(null);
      setFiscalYears([]); // クライアントがnullの場合は決算期も空に
    }
  }, [watchedClient]);
  
  /**
   * 保存処理をバッチでまとめる
   */
  const debounceSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(() => {
      if (Object.keys(pendingChanges).length > 0 && !isNewTask && task) {
        // タイトルを空にする変更がある場合は無視する
        if ('title' in pendingChanges && (!pendingChanges.title || pendingChanges.title.trim() === '')) {
          console.warn('タイトルを空にする変更は無視されます');
          setPendingChanges(prev => {
            const newChanges = {...prev};
            delete newChanges.title;
            return newChanges;
          });
          
          if (Object.keys(pendingChanges).length <= 1) {
            // タイトル以外に変更がなければ保存しない
            return;
          }
        }
        
        saveChanges();
      }
    }, 1000);
  }, [pendingChanges, isNewTask, task]);
  
  /**
   * フィールド変更時の処理
   */
  const handleFieldChange = (fieldName, value, skipAutosave = false) => {
    setIsDirty(true);
    
    // タイトル関連の特別処理
    if (fieldName === 'title') {
      // タイトルが空の場合は変更を無視
      if (!value || value.trim() === '') {
        console.warn('タイトルは空にできません');
        toast.error('タイトルは必須項目です');
        
        // タイトルフィールドの値を元に戻す
        if (task && task.title) {
          setTimeout(() => {
            setValue('title', task.title);
          }, 0);
        }
        return;
      }
    }
    
    if (!isNewTask && task) {
      // 空のタイトルになる変更は許可しない追加チェック
      if (fieldName === 'title' && value.trim() === '' && task.title) {
        console.warn('タイトルを空にすることはできません');
        return;
      }
      
      // 特定のフィールドは自動保存しない
      // - タイトル、レビュアー、作業者
      // - 説明
      // - 完了日（skipAutosaveフラグが設定された場合）
      const noAutosaveFields = ['reviewer', 'worker', 'title', 'completed_at', 'description'];
      if (noAutosaveFields.includes(fieldName) || skipAutosave) {
        setPendingChanges(prev => ({
          ...prev,
          [fieldName]: value,
        }));
        // 特別フィールド変更時は自動保存しない
        console.log(`${fieldName}を変更しました。保存ボタンを押して変更を確定してください。`);
      } else {
        // その他のフィールドは従来通り自動保存
        setPendingChanges(prev => ({
          ...prev,
          [fieldName]: value,
        }));
        
        debounceSave();
      }
    }
  };
  
  /**
   * 保存処理
   */
  const saveChanges = async () => {
    if (!isNewTask && task && Object.keys(pendingChanges).length > 0) {
      setSaveState('saving');
      
      try {
        const updateData = { ...pendingChanges };
        
        console.log('Saving changes:', updateData);
        
        // タイトルが含まれている場合、空でないことを確認
        if ('title' in updateData) {
          if (!updateData.title || updateData.title.trim() === '') {
            console.warn('タイトルが空のため保存をスキップします');
            toast.error('タイトルは必須項目です');
            setPendingChanges(prev => {
              const newChanges = {...prev};
              delete newChanges.title; // 無効なタイトル変更を削除
              return newChanges;
            });
            setSaveState('error');
            return; // 保存処理を中断
          }
        }
        
        // boolean値の変換
        if ('is_fiscal_task' in updateData) {
          updateData.is_fiscal_task = updateData.is_fiscal_task === 'true';
        }
        if ('is_recurring' in updateData) {
          updateData.is_recurring = updateData.is_recurring === 'true';
        }
        if ('is_template' in updateData) {
          updateData.is_template = updateData.is_template === 'true';
        }
        
        // 数値フィールドの処理
        try {
          // IDフィールドの変換
          ['worker', 'reviewer', 'status', 'category', 'client', 'fiscal_year', 'priority'].forEach(field => {
            if (field in updateData) {
              // nullが明示的に送信された場合はそのままnullとして保持
              if (updateData[field] === null) {
                // nullはそのまま保持
              } else if (updateData[field] && updateData[field] !== '') {
                const parsedValue = parseInt(updateData[field]);
                updateData[field] = !isNaN(parsedValue) ? parsedValue : null;
              } else {
                updateData[field] = null;
              }
            }
          });
          
          // 数値フィールドの変換
          if ('priority_value' in updateData && updateData.priority_value !== '') {
            const parsedValue = parseInt(updateData.priority_value);
            updateData.priority_value = !isNaN(parsedValue) ? parsedValue : null;
          }
          
          // 日付フィールドの検証
          ['due_date', 'start_date', 'completed_at', 'recurrence_end_date'].forEach(dateField => {
            if (dateField in updateData && updateData[dateField]) {
              if (!isValidDate(updateData[dateField])) {
                console.warn(`Invalid date in ${dateField}: ${updateData[dateField]}. Setting to null.`);
                updateData[dateField] = null;
              }
            }
          });
        } catch (conversionError) {
          console.error('Error converting field values:', conversionError);
          // エラーが発生してもプロセスは継続
        }
        
        console.log('Processed update data:', updateData);
        
        // タスク更新処理
        const response = await tasksApi.updateTask(task.id, updateData);
        console.log('Task update response:', response);
        
        // 状態をリセット
        setPendingChanges({});
        setIsDirty(false);
        setSaveState('saved');
        
        // 3秒後に保存状態表示をクリア
        setTimeout(() => {
          if (setSaveState) setSaveState('idle');
        }, 3000);
        
        // 親コンポーネントに通知 - 更新されたタスクデータを渡す
        if (onTaskUpdated) {
          // APIレスポンスがある場合はそれを使用、なければタスクデータと更新内容をマージ
          const updatedTaskData = response || { ...task, ...updateData };
          console.log('Sending updated task to parent:', updatedTaskData);
          onTaskUpdated(updatedTaskData);
        }
      } catch (error) {
        console.error('Error saving task:', error);
        
        // APIからのエラーメッセージを取得
        let errorMessage = 'タスクの保存に失敗しました';
        
        if (error.message === 'タイトルは必須項目です') {
          errorMessage = 'タイトルは必須項目です。空のタイトルでは保存できません。';
        } else if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Status code:', error.response.status);
          
          // タイトルに関するエラーの場合
          if (error.response.data && error.response.data.title) {
            errorMessage = `タイトルエラー: ${Array.isArray(error.response.data.title) ? error.response.data.title.join(', ') : error.response.data.title}`;
          }
        }
        
        setSaveState('error');
        toast.error(errorMessage);
        
        // タイトルエラーの場合、タイトルを変更せずにpendingChangesからtitleを削除
        if (errorMessage.includes('タイトル')) {
          setPendingChanges(prev => {
            const newChanges = {...prev};
            delete newChanges.title;
            return newChanges;
          });
        }
      }
    }
  };
  
  /**
   * タスク新規作成/更新処理
   */
  const submitTask = async (data) => {
    setSaveState('saving');
    
    try {
      const submitData = { ...data };
      
      // タイトルは必須項目なのでチェック
      if (!submitData.title || submitData.title.trim() === '') {
        console.error('タイトルは必須項目です');
        toast.error('タイトルを入力してください');
        setSaveState('error');
        return; // 送信処理を中断
      }
      
      // boolean値の変換
      if ('is_fiscal_task' in submitData) {
        submitData.is_fiscal_task = submitData.is_fiscal_task === 'true';
      }
      if ('is_recurring' in submitData) {
        submitData.is_recurring = submitData.is_recurring === 'true';
      }
      if ('is_template' in submitData) {
        submitData.is_template = submitData.is_template === 'true';
      }
      
      // 数値に変換（エラーハンドリングを追加）
      try {
        // 作業者の処理 - nullの場合は明示的にnullとして保持
        if (submitData.worker === null) {
          // nullの場合はそのまま保持
        } else if (submitData.worker && submitData.worker !== '') {
          submitData.worker = parseInt(submitData.worker) || null;
        } else {
          submitData.worker = null;
        }
        
        // レビューアーの処理 - nullの場合は明示的にnullとして保持
        if (submitData.reviewer === null) {
          // nullの場合はそのまま保持
        } else if (submitData.reviewer && submitData.reviewer !== '') {
          submitData.reviewer = parseInt(submitData.reviewer) || null;
        } else {
          submitData.reviewer = null;
        }
        
        if (submitData.status && submitData.status !== '') {
          submitData.status = parseInt(submitData.status) || null;
        }
        
        // カテゴリーの処理 - nullなら明示的にnullとして保持
        if (submitData.category === null) {
          // nullの場合はそのまま
        } else if (submitData.category && submitData.category !== '') {
          submitData.category = parseInt(submitData.category) || null;
        } else {
          submitData.category = null;
        }
        
        if (submitData.client && submitData.client !== '') {
          submitData.client = parseInt(submitData.client) || null;
        } else {
          submitData.client = null;
        }
        
        if (submitData.fiscal_year && submitData.fiscal_year !== '') {
          submitData.fiscal_year = parseInt(submitData.fiscal_year) || null;
        } else {
          submitData.fiscal_year = null;
        }
        
        // 優先度値が入力されている場合、優先度オブジェクトを作成または取得
        if (submitData.priority_value && submitData.priority_value !== '') {
          const priorityValue = parseInt(submitData.priority_value) || 50;
          
          try {
            // 優先度値からオブジェクトを作成または取得
            const priorityResponse = await tasksApi.createPriorityForValue(priorityValue);
            submitData.priority = priorityResponse.id;
          } catch (priorityError) {
            console.error('Error creating priority for value:', priorityError);
            // エラーが発生した場合はpriorityフィールドをクリア
            submitData.priority = null;
          }
        } else {
          // 優先度値がない場合はpriorityフィールドもクリア
          submitData.priority = null;
        }
        
        // 日付フィールドが有効な形式であることを確認
        ['due_date', 'start_date', 'completed_at', 'recurrence_end_date'].forEach(dateField => {
          if (submitData[dateField] && !isValidDate(submitData[dateField])) {
            console.warn(`Invalid date format for ${dateField}: ${submitData[dateField]}, setting to null`);
            submitData[dateField] = null;
          }
        });
      } catch (error) {
        console.error('Error converting form values:', error);
        // エラーが発生してもプロセスは継続
      }
      
      // ビジネスIDの設定
      if (businessId) {
        submitData.business = businessId;
      }
      
      let response;
      if (isNewTask) {
        // 新規作成
        response = await tasksApi.createTask(submitData);
        toast.success('タスクを作成しました', { duration: 2000 });
      } else {
        // 更新
        response = await tasksApi.updateTask(task.id, submitData);
        toast.success('タスクを保存しました', { duration: 2000 });
      }
      
      // 状態をリセット
      setPendingChanges({});
      setIsDirty(false);
      setSaveState('saved');
      
      // 親コンポーネントに通知
      if (onTaskUpdated) {
        // データを取り出して確実に更新する
        const taskData = response.data || response;
        console.log("Sending updated task data to parent:", taskData);
        onTaskUpdated(taskData);
      }
      
      // 注意: TasksPage.jsの親コンポーネントがイベントを発火するので、ここでは発火しない
      // (二重更新を防止するため)
      
      // 作成/更新後はパネルを閉じる
      // フォームの状態をリセット
      reset({
        title: '',
        description: '',
        status: '',
        category: '',
        client: '',
        fiscal_year: '',
        worker: '',
        reviewer: '',
        due_date: '',
        start_date: '',
        completed_at: '',
        priority: '',
        priority_value: '',
        is_fiscal_task: 'false',
        is_recurring: 'false',
        recurrence_pattern: '',
        recurrence_end_date: '',
        is_template: 'false',
        template_name: ''
      });
      // リセットキーを更新して次回の表示時に確実に新しい状態にする
      setResetKey(Date.now());
      
      // 閉じる前に十分な時間を設けて、タスク一覧の更新を確実にする
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error submitting task:', error);
      
      // APIからのエラーメッセージを取得
      let errorMessage = 'タスクの保存に失敗しました';
      
      if (error.message === 'タイトルは必須項目です') {
        errorMessage = 'タイトルは必須項目です。空のタイトルでは保存できません。';
      } else if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Status code:', error.response.status);
        
        // タイトルに関するエラーの場合
        if (error.response.data && error.response.data.title) {
          errorMessage = `タイトルエラー: ${Array.isArray(error.response.data.title) ? error.response.data.title.join(', ') : error.response.data.title}`;
        }
      }
      
      setSaveState('error');
      toast.error(errorMessage);
    }
  };
  
  /**
   * 削除確認モーダルを表示
   */
  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(true);
  };
  
  /**
   * タスク削除処理
   */
  const handleDeleteTask = async () => {
    if (!task || !task.id) return;
    
    setIsDeleting(true);
    
    try {
      await tasksApi.deleteTask(task.id);
      setIsDeleteModalOpen(false);
      
      // 親コンポーネントに通知
      if (onTaskUpdated) {
        onTaskUpdated(null, true);
      }
      
      // タスク削除のカスタムイベントをディスパッチ
      const taskDeletedEvent = new CustomEvent('task-deleted', {
        detail: {
          taskId: task.id,
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(taskDeletedEvent);
      console.log('📣 Dispatched task-deleted event', { taskId: task.id });
      
      toast.success('タスクを削除しました');
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('タスクの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };
  
  /**
   * タスクの時間記録を開始
   */
  const startTimeRecording = async () => {
    if (!task || !task.id) return;
    
    try {
      const response = await timeManagementApi.startTimeEntry(task.id);
      setTimeEntry(response.data);
      setIsRecordingTime(true);
      setStartTime(new Date());
      
      // タイマーのスタート
      const intervalId = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      setTimerIntervalId(intervalId);
      toast.success('時間記録を開始しました');
    } catch (error) {
      console.error('Error starting time entry:', error);
      toast.error('時間記録の開始に失敗しました');
    }
  };
  
  /**
   * タスクの時間記録を停止
   */
  const stopTimeRecording = async () => {
    if (!task || !task.id || !timeEntry) return;
    
    try {
      await timeManagementApi.stopTimeEntry(timeEntry.id);
      setIsRecordingTime(false);
      setElapsedTime(0);
      
      // タイマーの停止
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }
      
      // キャッシュをクリアして時間エントリリストを更新
      setCachedTimeEntries([]);
      fetchTimeEntries();
      
      toast.success('時間記録を停止しました');
    } catch (error) {
      console.error('Error stopping time entry:', error);
      toast.error('時間記録の停止に失敗しました');
    }
  };
  
  /**
   * アクティブな時間エントリを確認
   */
  const checkActiveTimeEntry = async (taskId) => {
    if (!taskId) return;
    
    try {
      const response = await timeManagementApi.getActiveTimeEntry(taskId);
      if (response.data && response.data.id) {
        setTimeEntry(response.data);
        setIsRecordingTime(true);
        
        // 開始時間からの経過時間を計算
        const startTime = new Date(response.data.start_time);
        const now = new Date();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsedSeconds);
        
        // タイマーのスタート
        const intervalId = setInterval(() => {
          setElapsedTime(prev => prev + 1);
        }, 1000);
        
        setTimerIntervalId(intervalId);
      }
    } catch (error) {
      console.error('Error checking active time entry:', error);
    }
  };
  
  /**
   * タイマーのクリーンアップ
   */
  useEffect(() => {
    return () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
      }
    };
  }, [timerIntervalId]);
  
  /**
   * 時間エントリのリストを取得
   */
  const fetchTimeEntries = async () => {
    if (!task || !task.id) return;
    
    // キャッシュがあれば使用
    if (cachedTimeEntries && cachedTimeEntries.length > 0) {
      return;
    }
    
    setIsLoadingTimeEntries(true);
    
    try {
      const response = await timeManagementApi.getTimeEntries(task.id);
      setCachedTimeEntries(response.data || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      toast.error('時間記録の取得に失敗しました');
      // エラー時は空の配列を設定して、以降のエラーを防止
      setCachedTimeEntries([]);
    } finally {
      setIsLoadingTimeEntries(false);
    }
  };
  
  /**
   * 時間エントリの編集を開始
   */
  const startEditingTimeEntry = (entry) => {
    setEditingTimeEntry(entry.id);
    
    // フォームに値をセット
    setTimeEntryForm({
      start_time: entry.start_time,
      end_time: entry.end_time || '',
      description: entry.description || '',
      duration_seconds: entry.duration_seconds || 0
    });
  };
  
  /**
   * 時間エントリの編集をキャンセル
   */
  const cancelEditingTimeEntry = () => {
    setEditingTimeEntry(null);
    setTimeEntryForm({
      start_time: '',
      end_time: '',
      description: '',
      duration_seconds: 0
    });
  };
  
  /**
   * 時間エントリの編集を保存
   */
  const saveTimeEntryEdit = async () => {
    if (!editingTimeEntry) return;
    
    try {
      // 開始時間と終了時間から新しい所要時間を計算
      const startTime = new Date(timeEntryForm.start_time);
      const endTime = new Date(timeEntryForm.end_time);
      const durationSeconds = Math.floor((endTime - startTime) / 1000);
      
      // 時間エントリの更新データ
      const updateData = {
        ...timeEntryForm,
        duration_seconds: durationSeconds > 0 ? durationSeconds : timeEntryForm.duration_seconds
      };
      
      // APIで更新
      await timeManagementApi.updateTimeEntry(editingTimeEntry, updateData);
      
      // 編集モードを終了
      cancelEditingTimeEntry();
      
      // キャッシュをクリアして時間エントリリストを更新
      setCachedTimeEntries([]);
      fetchTimeEntries();
      
      toast.success('時間記録を更新しました');
    } catch (error) {
      console.error('Error updating time entry:', error);
      toast.error('時間記録の更新に失敗しました');
    }
  };
  
  /**
   * 時間エントリを削除
   */
  const deleteTimeEntry = async (entryId) => {
    if (!entryId) return;
    
    if (!window.confirm('この時間記録を削除してもよろしいですか？')) {
      return;
    }
    
    try {
      // APIで削除
      await timeManagementApi.deleteTimeEntry(entryId);
      
      // キャッシュをクリアして時間エントリリストを更新
      setCachedTimeEntries([]);
      fetchTimeEntries();
      
      toast.success('時間記録を削除しました');
    } catch (error) {
      console.error('Error deleting time entry:', error);
      toast.error('時間記録の削除に失敗しました');
    }
  };
  
  /**
   * 日付フォーマット変換（YYYY-MM-DD形式に）
   */
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };
  
  /**
   * 日付が有効かどうかをチェック
   */
  const isValidDate = (dateString) => {
    if (!dateString) return false;
    
    // YYYY-MM-DD形式かどうかを正規表現でチェック
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(dateString)) {
      return false;
    }
    
    // 実際に有効な日付かどうかをチェック
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };
  
  // Asana風スライドパネル - isOpenプロパティに基づいて条件付きレンダリング
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 overflow-hidden">
        {/* オーバーレイ */}
        <div 
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        {/* スライドパネル */}
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="relative w-screen max-w-2xl transform transition ease-in-out duration-300">
            <div className="h-full flex flex-col bg-white shadow-xl overflow-y-auto">
              {/* ヘッダー */}
              <TaskEditorHeader 
                isNewTask={isNewTask}
                onClose={onClose}
                saveState={saveState}
                isDirty={isDirty}
                saveChanges={saveChanges}
              />
              
              {/* フォーム本体 */}
              <div className="flex-1 py-6 px-4 sm:px-6 overflow-auto">
                <form onSubmit={handleSubmit(submitTask)} key={resetKey}>
                  <div className="space-y-6">
                    <TaskBasicInfoSection 
                      control={control}
                      statuses={statuses}
                      categories={categories}
                      clients={clients}
                      fiscalYears={fiscalYears}
                      formState={formState}
                      handleFieldChange={handleFieldChange}
                      watch={watch}
                    />
                    
                    <TaskAssigneeSection 
                      task={task}
                      users={users}
                      control={control}
                      handleFieldChange={handleFieldChange}
                      formState={formState}
                      watch={watch}
                    />
                    
                    <TaskDatePrioritySection 
                      control={control}
                      handleFieldChange={handleFieldChange}
                      formState={formState}
                      watch={watch}
                    />
                    
                    <TaskDescriptionSection 
                      control={control}
                      handleFieldChange={handleFieldChange}
                    />
                    
                    {/* 作業時間記録セクション - コンポーネント化 */}
                    {!isNewTask && task && (
                      <TimeTracking 
                        task={task}
                        isRecordingTime={isRecordingTime}
                        timeEntry={timeEntry}
                        elapsedTime={elapsedTime}
                        cachedTimeEntries={cachedTimeEntries}
                        isLoadingTimeEntries={isLoadingTimeEntries}
                        editingTimeEntry={editingTimeEntry}
                        timeEntryForm={timeEntryForm}
                        startTimeRecording={startTimeRecording}
                        stopTimeRecording={stopTimeRecording}
                        startEditingTimeEntry={startEditingTimeEntry}
                        cancelEditingTimeEntry={cancelEditingTimeEntry}
                        saveTimeEntryEdit={saveTimeEntryEdit}
                        deleteTimeEntry={deleteTimeEntry}
                        setTimeEntryForm={setTimeEntryForm}
                      />
                    )}
                    
                    {/* 見積時間 - 削除 */}
                    
                    {/* タスク種別（決算期関連）セクションは削除 */}
                    
                    <TaskAdditionalSettingsSection 
                      control={control}
                      handleFieldChange={handleFieldChange}
                      isNewTask={isNewTask}
                      watch={watch}
                    />
                    
                    {/* タスクコメント（新規作成時は表示しない） */}
                    {!isNewTask && task && (
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-md font-medium text-gray-700 mb-3">コメント</h3>
                        {/* TaskCommentsコンポーネントをインポート */}
                        {task.id && (
                          <React.Suspense fallback={<div className="text-center py-4">コメントを読み込み中...</div>}>
                            {/* TaskCommentsコンポーネントの遅延ロード */}
                            {(() => {
                              const TaskComments = React.lazy(() => import('../../tasks/TaskComments'));
                              return <TaskComments taskId={task.id} task={task} onCommentAdded={() => {}} />;
                            })()}
                          </React.Suspense>
                        )}
                      </div>
                    )}

                    {/* タスク作成日時（新規作成時は表示しない） */}
                    {!isNewTask && task && (
                      <TaskMetaInfoSection task={task} />
                    )}
                  </div>
                </form>
              </div>
              
              {/* フッター（保存ボタンと削除ボタン） */}
              <TaskEditorFooter
                isNewTask={isNewTask}
                task={task}
                onClose={onClose}
                handleSubmit={handleSubmit}
                submitTask={submitTask}
                saveState={saveState}
                handleDeleteConfirm={handleDeleteConfirm}
              />
              
              {/* 削除確認モーダル */}
              <DeleteTaskModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteTask}
                isDeleting={isDeleting}
                taskTitle={task?.title}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskEditor;