import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  HiOutlinePlus, 
  HiOutlineFilter, 
  HiOutlineDocumentText,
  HiOutlineExclamationCircle, 
  HiCheck,
  HiChevronLeft,
  HiChevronRight
} from 'react-icons/hi';
import { useAuth } from '../../../context/AuthContext';
import { tasksApi } from '../../../api';
import usersApi from '../../../api/users';  // ユーザーAPIをインポート
import clientsApi from '../../../api/clients';  // クライアントAPIをインポート

// 分割したコンポーネントのインポート
import TaskFilters from './TaskFilters';
import TaskTable from './TaskTable';
import { TaskBulkEditBar } from './TaskBulkEdit';
import TaskBulkEditModal from './TaskBulkEdit';
import DeleteConfirmModal from './DeleteConfirmModal';
import useTaskSorting from './useTaskSorting';

const TaskList = forwardRef((props, ref) => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const { currentUser } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [usersList, setUsersList] = useState([]); // ユーザー一覧を保持するstate
  const [clientsList, setClientsList] = useState([]); // クライアント一覧を保持するstate
  
  // 現在のURLパスを取得
  const currentPath = location.pathname;
  
  // 一括編集関連の状態
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    status: '',
    worker: '',
    reviewer: '',
    due_date: ''
  });

  // デフォルトのフィルターを設定（自分担当のみ、完了タスク非表示）
  const [filters, setFilters] = useState({
    status: '',
    searchTerm: '',
    client: '',
    assignee: currentUser?.id || '',
    hide_completed: true,  // デフォルトで完了タスクを非表示
  });
  
  // ページネーション関連の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // デフォルトは10件表示
  const [totalItems, setTotalItems] = useState(0);
  const [paginatedTasks, setPaginatedTasks] = useState([]);
  
  // ユーザーごとのフィルター設定を保存・復元
  useEffect(() => {
    const loadUserFilters = async () => {
      if (!currentUser?.id) return;
      
      try {
        // バックエンドからユーザー設定を取得
        const preferences = await usersApi.getUserPreferences();
        
        if (preferences && preferences.task_filters) {
          // パスごとのフィルター設定を持っているか確認
          if (preferences.task_filters[currentPath]) {
            // 現在のパスのフィルタ設定を使用
            console.log(`バックエンドから現在のパス(${currentPath})のフィルター設定を読み込みました:`, preferences.task_filters[currentPath]);
            setFilters(preferences.task_filters[currentPath]);
          } else {
            // パスに対する設定がない場合はローカルストレージをチェック
            const savedFilters = localStorage.getItem(`task_filters_${currentUser.id}_${currentPath}`);
            if (savedFilters) {
              try {
                const parsedFilters = JSON.parse(savedFilters);
                console.log(`ローカルストレージから現在のパス(${currentPath})のフィルター設定を読み込みました:`, parsedFilters);
                setFilters(parsedFilters);
                
                // ローカルストレージの設定をバックエンドにも保存
                const updatedTaskFilters = {
                  ...preferences.task_filters,
                  [currentPath]: parsedFilters
                };
                
                await usersApi.updateUserPreferences({
                  task_filters: updatedTaskFilters
                });
              } catch (error) {
                console.error('フィルター設定の読み込みでエラーが発生しました:', error);
              }
            } else {
              // 保存された設定がない場合はデフォルト設定を使用
              const defaultFilters = {
                status: '',
                searchTerm: '',
                client: '',
                assignee: currentUser.id,
                hide_completed: true,
              };
              setFilters(defaultFilters);
              
              // デフォルト設定をバックエンドに保存
              const updatedTaskFilters = {
                ...preferences.task_filters,
                [currentPath]: defaultFilters
              };
              
              await usersApi.updateUserPreferences({
                task_filters: updatedTaskFilters
              });
            }
          }
        } else {
          // task_filtersがない場合は新規作成
          const savedFilters = localStorage.getItem(`task_filters_${currentUser.id}_${currentPath}`);
          if (savedFilters) {
            try {
              const parsedFilters = JSON.parse(savedFilters);
              console.log(`ローカルストレージから現在のパス(${currentPath})のフィルター設定を読み込みました:`, parsedFilters);
              setFilters(parsedFilters);
              
              // ローカルストレージの設定をバックエンドにも保存
              await usersApi.updateUserPreferences({
                task_filters: {
                  [currentPath]: parsedFilters
                }
              });
            } catch (error) {
              console.error('フィルター設定の読み込みでエラーが発生しました:', error);
            }
          } else {
            // 保存された設定がない場合はデフォルト設定を使用
            const defaultFilters = {
              status: '',
              searchTerm: '',
              client: '',
              assignee: currentUser.id,
              hide_completed: true,
            };
            setFilters(defaultFilters);
            
            // デフォルト設定をバックエンドに保存
            await usersApi.updateUserPreferences({
              task_filters: {
                [currentPath]: defaultFilters
              }
            });
          }
        }
      } catch (error) {
        console.error('フィルター設定の取得でエラーが発生しました:', error);
        
        // バックエンドからの取得に失敗した場合はローカルストレージから読み込む
        const savedFilters = localStorage.getItem(`task_filters_${currentUser.id}_${currentPath}`);
        if (savedFilters) {
          try {
            const parsedFilters = JSON.parse(savedFilters);
            console.log(`ローカルストレージから現在のパス(${currentPath})のフィルター設定を読み込みました（バックエンド取得失敗時）:`, parsedFilters);
            setFilters(parsedFilters);
          } catch (parseError) {
            console.error('ローカルストレージのフィルター設定の解析でエラーが発生しました:', parseError);
          }
        }
      }
      
      setInitialized(true);
    };
    
    loadUserFilters();
  }, [currentUser, currentPath]);
  
  // フィルター設定が変更されたときに保存
  const saveUserFilters = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      // ローカルストレージにパスごとに保存
      localStorage.setItem(`task_filters_${currentUser.id}_${currentPath}`, JSON.stringify(filters));
      console.log(`フィルター設定をローカルストレージに保存しました(パス: ${currentPath}):`, filters);
      
      // バックエンドにも保存
      // 既存の設定を取得して、現在のパスの設定だけを更新
      const preferences = await usersApi.getUserPreferences();
      const currentTaskFilters = preferences.task_filters || {};
      
      const updatedTaskFilters = {
        ...currentTaskFilters,
        [currentPath]: filters
      };
      
      await usersApi.updateUserPreferences({
        task_filters: updatedTaskFilters
      });
      console.log(`フィルター設定をバックエンドに保存しました(パス: ${currentPath}):`, filters);
    } catch (error) {
      console.error('フィルター設定の保存でエラーが発生しました:', error);
    }
  }, [filters, currentUser, currentPath]);
  
  // フィルター設定が変更されたときに保存
  useEffect(() => {
    if (initialized) {
      saveUserFilters();
    }
  }, [filters, initialized, saveUserFilters]);
  
  // 初期化：ユーザー情報が取得できた直後に担当者フィルタを設定
  useEffect(() => {
    if (currentUser?.id && !initialized) {
      console.log('🔄 初期化時に現在のユーザーをフィルターに設定します:', currentUser.id);
      setFilters(prev => ({
        ...prev,
        assignee: currentUser.id
      }));
      setInitialized(true);
    }
  }, [currentUser, initialized]);
  
  // URLクエリパラメータからフィルターを取得
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const assigneeParam = query.get('assignee');
    
    console.log('🔍 URLクエリパラメータから担当者情報を取得:', assigneeParam);
    console.log('🔍 現在のユーザーID:', currentUser?.id);
    
    // URLにassigneeパラメータがなければ、現在のユーザーをフィルタリング条件に設定
    if (!assigneeParam && currentUser?.id) {
      console.log('🔄 URLに担当者パラメータがないため、現在のユーザーを設定します');
      setFilters(prev => ({
        ...prev,
        assignee: currentUser.id
      }));
    } else if (assigneeParam) {
      console.log('🔄 URLから指定された担当者でフィルターを設定します:', assigneeParam);
      setFilters(prev => ({
        ...prev,
        assignee: assigneeParam
      }));
    }
  }, [location.search, currentUser?.id]);
  
  // ソート機能のカスタムフック
  const { 
    tasks, 
    sortConfig, 
    handleSortChange, 
    updateTasks, 
    sortTasks 
  } = useTaskSorting([]);

  // 担当者IDに基づいてクライアント側でタスクをフィルタリング
  const filterTasksByAssignee = (allTasks, assigneeId) => {
    // フィルターが空の場合はすべてのタスクを表示
    if (!assigneeId || assigneeId === '') {
      console.log('🔍 担当者フィルターなし - すべてのタスクを表示します');
      return allTasks;
    }
    
    // 未割り当てタスクのフィルタリング
    if (assigneeId === 'unassigned') {
      console.log('🔍 未割り当てタスクをフィルタリングします');
      return allTasks.filter(task => {
        const hasAssignee = 
          task.assignee || 
          (task.assignee_data && task.assignee_data.id) || 
          (task.assignee_name && task.assignee_name.id);
        return !hasAssignee;
      });
    }
    
    console.log('🔍 クライアント側でタスクをフィルタリング - 担当者ID:', assigneeId);
    
    return allTasks.filter(task => {
      // 担当者IDがマッチするか確認
      const taskAssigneeId = 
        task.assignee || 
        (task.assignee_data && task.assignee_data.id) || 
        (task.assignee_name && task.assignee_name.id);
      
      const isMatch = String(taskAssigneeId) === String(assigneeId);
      if (!isMatch) {
        console.log(`タスク「${task.title}」(ID: ${task.id})は担当者が一致しないためフィルタリングされました`);
        console.log('タスクの担当者:', {
          assignee: task.assignee,
          assignee_data: task.assignee_data,
          assignee_name: task.assignee_name
        });
      }
      return isMatch;
    });
  };

  // タスク一覧取得
  const fetchTasks = async () => {
    setLoading(true);
    try {
      // フィルターのクリーンアップ（空の値は送信しない）
      const cleanFilters = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          cleanFilters[key] = value;
        }
      });
      
      // 担当者フィルターが明示的に設定されていないかつ、フィルターリセットでない場合のみ
      // 現在のユーザーIDをデフォルトとして使用
      const userSelectedFilter = filters.assignee === '' || filters.assignee === 'unassigned';
      if (currentUser?.id && !cleanFilters.assignee && !userSelectedFilter) {
        cleanFilters.assignee = currentUser.id;
      }
      
      // hide_completedフィルターを処理 (APIに送信せず、クライアント側でフィルターする)
      const hideCompleted = filters.hide_completed;
      delete cleanFilters.hide_completed;
      
      // 不要なデバッグログを削減
      let fetchedTasks = [];
      
      try {
        // APIリクエスト
        const response = await tasksApi.getTasks(cleanFilters);
        
        // API応答チェック
        if (response && Array.isArray(response.results)) {
          fetchedTasks = response.results;
          setError(null);
        } else if (Array.isArray(response)) {
          fetchedTasks = response;
          setError(null);
        } else if (response && typeof response === 'object' && Object.keys(response).length > 0) {
          if (response.results && response.results.length === 0) {
            // 結果が空の場合は空のタスク配列を設定
            fetchedTasks = [];
            setError(null);
          } else {
            // 形式は想定外だが何かデータはある
            if (response.detail) {
              // エラーメッセージがある場合
              console.error('API returned error:', response.detail);
              setError(`APIエラー: ${response.detail}`);
              fetchedTasks = [];
            } else {
              // それ以外の場合、オブジェクトをタスクとして扱う
              fetchedTasks = [response];
              setError(null);
            }
          }
        } else {
          console.error('API response is empty or invalid:', response);
          fetchedTasks = [];
          setError('タスクデータの取得に失敗しました');
        }
        
        // 担当者に基づくフィルタリング
        if (filters.assignee) {
          fetchedTasks = filterTasksByAssignee(fetchedTasks, filters.assignee);
        }
        
        // 完了タスク非表示フィルター
        if (hideCompleted) {
          fetchedTasks = fetchedTasks.filter(task => {
            // 完了ステータスを検出
            const isCompleted = 
              (task.status && task.status.toString() === '11') || // 完了ステータスID
              (task.status_name && task.status_name === '完了') || 
              (task.status_data && task.status_data.name === '完了');
            return !isCompleted;
          });
        }
        
        // タスクデータを設定
        updateTasks(fetchedTasks);
      } catch (apiError) {
        console.error('API request failed:', apiError);
        setError('APIリクエストが失敗しました');
        updateTasks([]);
      }
    } catch (error) {
      console.error('タスクの取得中にエラーが発生しました:', error);
      setError('タスクの取得に失敗しました');
      updateTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // ユーザー一覧を取得
  const fetchUsers = async () => {
    try {
      console.log('🔍 ユーザー一覧を取得します');
      const users = await usersApi.getAvailableWorkers();
      console.log('📋 取得したユーザー一覧:', users);
      setUsersList(users);
    } catch (error) {
      console.error('ユーザー一覧の取得中にエラーが発生しました:', error);
      toast.error('ユーザー一覧の取得に失敗しました');
    }
  };

  // クライアント一覧を取得
  const fetchClients = async () => {
    try {
      console.log('🔍 クライアント一覧を取得します');
      const response = await clientsApi.getClients();
      const clients = response.results || [];
      console.log('📋 取得したクライアント一覧:', clients);
      setClientsList(clients);
    } catch (error) {
      console.error('クライアント一覧の取得中にエラーが発生しました:', error);
      toast.error('クライアント一覧の取得に失敗しました');
    }
  };

  // 初期読み込み時
  useEffect(() => {
    if (currentUser?.id) {
      console.log('🔄 初期読み込み時に現在のユーザーID確認:', currentUser.id);
      // 初期化処理を並列で実行
      Promise.all([
        fetchTasks(),
        fetchUsers(),
        fetchClients()
      ]);
      
      // 冗長な二重ロードを削除（パフォーマンス改善）
      setInitialized(true);
    }
  }, [currentUser?.id]);
  
  // フィルター変更時のタスク取得（debounce処理を追加）
  useEffect(() => {
    if (!initialized) return;
    
    // 300msのデバウンスを追加してフィルター変更時の連続API呼び出しを防止
    const debounceTimer = setTimeout(() => {
      fetchTasks();
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [filters, initialized]);

  /**
   * 依存関係を固定したfetchTasksのメモ化バージョン
   */
  const memoizedFetchTasks = useCallback(async () => {
    console.log('memoizedFetchTasks called - 強制的にタスクを再取得します');
    setLoading(true);
    try {
      // 強制的に再取得（キャッシュを使わない）
      await fetchTasks();
    } catch (error) {
      console.error('タスク再取得中にエラーが発生しました:', error);
    } finally {
      setLoading(false);
    }
  }, []); // fetchTasksを依存配列から削除して不要な再取得を防ぐ

  // タスク更新イベントの監視
  useEffect(() => {
    const handleTaskUpdate = (event) => {
      console.log("🔔 Task updated event received", event.detail);
      
      if (!event.detail || !event.detail.task) {
        console.warn("Invalid task update event with no task data");
        memoizedFetchTasks(); // 無効なイベントの場合は全体を再取得
        return;
      }
      
      const updatedTask = event.detail.task;
      console.log("Handling task update for task:", updatedTask);
      
      // タイムスタンプを確認して最新のイベントであることを確認
      const timestamp = event.detail.timestamp || Date.now();
      const currentTime = Date.now();
      // 10秒以上前のイベントは処理しない
      if (currentTime - timestamp > 10000) {
        console.warn("Ignoring outdated task update event");
        return;
      }
      
      if (event.detail.isNew) {
        // 新規作成されたタスクの場合はリストに追加してソート
        console.log("Adding new task to the list", updatedTask);
        
        // 担当者フィルタリングをチェック
        if (filters.assignee && 
            updatedTask.assignee && 
            updatedTask.assignee.toString() !== filters.assignee.toString()) {
          console.log(`タスク「${updatedTask.title}」は現在のフィルタ（担当者ID: ${filters.assignee}）と一致しないため表示しません`);
          return;
        }
        
        // 既存のタスクをチェックして重複を避ける
        const existingTask = tasks.find(t => t.id === updatedTask.id);
        if (!existingTask) {
          updateTasks([updatedTask, ...tasks]);
          
          // 重要：新規タスクが追加されたことを明示的に表示
          toast.success(`新しいタスク「${updatedTask.title}」がリストに追加されました`, {
            id: `task-added-list-${Date.now()}`,
            duration: 3000
          });
        } else {
          console.log('タスクは既にリストに存在します - 全体を更新します');
          memoizedFetchTasks();
        }
      } else {
        // 既存タスクの更新の場合は、そのタスクだけを置き換える
        console.log("Updating existing task in the list", updatedTask);
        const taskIndex = tasks.findIndex(t => t.id === updatedTask.id);
        
        if (taskIndex >= 0) {
          // タスクが見つかった場合は置き換えてソート
          console.log(`Task found at index ${taskIndex}, replacing with updated version`);
          const newTasks = [...tasks];
          newTasks[taskIndex] = updatedTask;
          updateTasks(newTasks);
        } else {
          // 更新されたタスクがリストにない場合は追加
          console.log("Updated task not found in current list, adding to top");
          
          // 担当者フィルタリングをチェック
          if (filters.assignee && 
              updatedTask.assignee && 
              updatedTask.assignee.toString() !== filters.assignee.toString()) {
            console.log(`タスク「${updatedTask.title}」は現在のフィルタ（担当者ID: ${filters.assignee}）と一致しないため表示しません`);
            return;
          }
          
          updateTasks([updatedTask, ...tasks]);
        }
      }
    };
    
    const handleTaskDeleted = (event) => {
      console.log("🔔 Task deleted event received", event.detail);
      
      if (!event.detail || !event.detail.taskId) {
        console.warn("Invalid task delete event with no task ID");
        memoizedFetchTasks(); // 無効なイベントの場合は全体を再取得
        return;
      }
      
      const deletedTaskId = event.detail.taskId;
      console.log("Removing deleted task from list, ID:", deletedTaskId);
      
      // 削除されたタスクをリストから除外
      updateTasks(tasks.filter(task => task.id !== deletedTaskId));
    };
    
    const handleForceRefresh = () => {
      console.log("🔔 Force refresh event received - reloading task list");
      memoizedFetchTasks();
    };
    
    // カスタムイベントのリスナーを追加
    window.addEventListener('task-updated', handleTaskUpdate);
    window.addEventListener('task-deleted', handleTaskDeleted);
    window.addEventListener('task-update-force-refresh', handleForceRefresh);
    
    // デバッグ用：イベントリスナーが登録されたことを確認
    console.log("🎧 Event listeners registered for task updates and deletes");
    
    // クリーンアップ関数
    return () => {
      console.log("🧹 Cleaning up event listeners");
      window.removeEventListener('task-updated', handleTaskUpdate);
      window.removeEventListener('task-deleted', handleTaskDeleted);
      window.removeEventListener('task-update-force-refresh', handleForceRefresh);
    };
  }, [tasks, memoizedFetchTasks, filters.assignee]);
  
  // TasksPageから渡されるforceRefreshプロップの変更を監視
  useEffect(() => {
    // 実行回数を制限するためのデバウンス処理
    const refreshKey = 'last-list-refresh-time';
    const lastRefreshTime = parseInt(sessionStorage.getItem(refreshKey) || '0');
    const currentTime = Date.now();
    
    // 前回のリフレッシュから500ms以上経過している場合のみ実行
    if (props.forceRefresh && currentTime - lastRefreshTime > 500) {
      console.log("Force refresh prop changed with throttling, refreshing tasks");
      sessionStorage.setItem(refreshKey, currentTime.toString());
      
      // 即時実行せず、少し遅延させる
      const timeoutId = setTimeout(() => {
        memoizedFetchTasks();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [props.forceRefresh]); // memoizedFetchTasksを依存配列から削除
  
  // 親コンポーネントに公開するメソッド
  useImperativeHandle(ref, () => ({
    refreshTasks: () => {
      console.log("Refresh tasks method called");
      memoizedFetchTasks();
    },
    refreshTasksWithData: (newTask, isNewTask = false) => {
      console.log("Refresh with task data", newTask, "isNew:", isNewTask);
      
      if (!newTask) {
        console.warn("No task data provided for refresh");
        memoizedFetchTasks();
        return;
      }
      
      if (isNewTask) {
        console.log("Adding new task to the list");
        
        // 担当者フィルタリングをチェック
        if (filters.assignee && 
            newTask.assignee && 
            newTask.assignee.toString() !== filters.assignee.toString()) {
          console.log(`タスク「${newTask.title}」は現在のフィルタ（担当者ID: ${filters.assignee}）と一致しないため表示しません`);
          return;
        }
        
        // 既存のタスクをチェックして重複を避ける
        const existingTask = tasks.find(t => t.id === newTask.id);
        if (!existingTask) {
          updateTasks([newTask, ...tasks]);
        } else {
          console.log('タスクは既にリストに存在します - 全体を更新します');
          memoizedFetchTasks();
        }
      } else {
        console.log("Updating existing task in list");
        const taskIndex = tasks.findIndex(t => t.id === newTask.id);
        
        if (taskIndex >= 0) {
          // タスクが見つかった場合は置き換え
          console.log(`Task found at index ${taskIndex}, replacing with updated version`);
          const newTasks = [...tasks];
          newTasks[taskIndex] = newTask;
          updateTasks(newTasks);
        } else {
          // タスクが見つからない場合は先頭に追加
          console.log("Task not found in current list, adding to top");
          
          // 担当者フィルタリングをチェック
          if (filters.assignee && 
              newTask.assignee && 
              newTask.assignee.toString() !== filters.assignee.toString()) {
            console.log(`タスク「${newTask.title}」は現在のフィルタ（担当者ID: ${filters.assignee}）と一致しないため表示しません`);
            return;
          }
          
          updateTasks([newTask, ...tasks]);
        }
      }
    }
  }), [tasks, memoizedFetchTasks, filters.assignee]);
  
  // ----- イベントハンドラー -----
  
  // フィルター変更
  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value });
  };
  
  // フィルター適用
  const handleFilterApply = () => {
    fetchTasks();
  };
  
  // フィルターリセット
  const handleFilterReset = async () => {
    // リセット時には自分が担当者のタスクのみに戻す（デフォルト状態）
    const defaultFilters = {
      status: '',
      searchTerm: '',
      client: '',
      assignee: currentUser?.id || '',
      hide_completed: true,
    };
    setFilters(defaultFilters);
    
    try {
      // バックエンドの設定も更新
      // 既存の設定を取得して、現在のパスの設定だけをリセット
      const preferences = await usersApi.getUserPreferences();
      const currentTaskFilters = preferences.task_filters || {};
      
      const updatedTaskFilters = {
        ...currentTaskFilters,
        [currentPath]: defaultFilters
      };
      
      await usersApi.updateUserPreferences({
        task_filters: updatedTaskFilters
      });
      
      // ローカルストレージからも削除
      if (currentUser?.id) {
        localStorage.removeItem(`task_filters_${currentUser.id}_${currentPath}`);
      }
    } catch (error) {
      console.error('フィルター設定のリセットでエラーが発生しました:', error);
    }
    
    // すぐに適用
    setTimeout(() => fetchTasks(), 0);
  };
  
  // 一括編集モード切り替え
  const toggleBulkEditMode = () => {
    const newMode = !bulkEditMode;
    setBulkEditMode(newMode);
    
    if (!newMode) {
      // モードを終了する時に選択をクリア
      setSelectedTasks([]);
    }
  };
  
  // タスク選択切り替え
  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };
  
  // 全選択/全解除切り替え
  const toggleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(task => task.id));
    }
  };
  
  // 一括編集実行
  const handleBulkEdit = async () => {
    if (selectedTasks.length === 0) {
      toast.error('タスクが選択されていません');
      return;
    }
    
    setLoading(true);
    try {
      // 空のフィールドをフィルタリング
      const editData = {};
      for (const [key, value] of Object.entries(bulkEditData)) {
        if (value !== '') {
          editData[key] = value;
        }
      }
      
      if (Object.keys(editData).length === 0) {
        toast.error('変更する項目が選択されていません');
        setLoading(false);
        return;
      }
      
      // APIに送信するデータを整形
      const apiData = { ...editData };
      
      // worker と reviewer フィールドを適切にマッピング
      if (apiData.worker) {
        apiData.assignee = apiData.worker;
        delete apiData.worker;
      }
      
      if (apiData.reviewer) {
        apiData.reviewer_id = apiData.reviewer;
        delete apiData.reviewer;
      }
      
      // 一括編集データのログ
      console.log('Bulk editing tasks:', selectedTasks);
      console.log('Original edit data:', editData);
      console.log('API送信データ:', apiData);
      
      // 選択されたタスクごとに更新を実行
      const promises = selectedTasks.map(taskId => 
        tasksApi.updateTask(taskId, apiData)
      );
      
      await Promise.all(promises);
      
      toast.success('タスクを一括更新しました');
      setBulkEditModalOpen(false);
      setBulkEditData({
        status: '',
        worker: '',
        reviewer: '',
        due_date: ''
      });
      fetchTasks();
    } catch (error) {
      console.error('Error in bulk edit:', error);
      toast.error('一括編集に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  // タスク削除
  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    
    setLoading(true);
    
    try {
      const taskId = selectedTask.id;
      const taskTitle = selectedTask.title;
      
      // 先にUIを更新して良いレスポンス時間を確保
      setDeleteModalOpen(false);
      
      // UIからタスクを先に削除することで、表示の即時性を確保
      updateTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      // 削除イベントを発火（タイムスタンプを含めて）
      const deleteEvent = new CustomEvent('task-deleted', {
        detail: {
          taskId: taskId,
          timestamp: new Date().getTime()
        }
      });
      
      // APIリクエスト前に数ミリ秒待つことでUIの更新を先に完了させる
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // バックエンドでの削除処理
      await tasksApi.deleteTask(taskId);
      
      // APIコールが完了したらイベントをディスパッチ
      window.dispatchEvent(deleteEvent);
      
      // 選択状態をクリア
      setSelectedTask(null);
      
      // 削除成功のメッセージ
      toast.success(`「${taskTitle}」を削除しました`);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('タスクの削除に失敗しました');
      
      // エラーが発生した場合、最新のタスクリストを再取得
      memoizedFetchTasks();
    } finally {
      setLoading(false);
    }
  };
  
  // タスク選択（詳細表示へ遷移）
  const handleTaskSelect = (task) => {
    console.log('Task selected:', task);
    props.onTaskSelect && props.onTaskSelect(task);
  };
  
  // onBulkEditDataChangeハンドラを修正
  const handleBulkEditDataChange = (field, value) => {
    console.log('Bulk edit data change:', field, value);
    setBulkEditData(prev => ({ ...prev, [field]: value }));
  };
  
  // タスクデータのページネーション処理
  useEffect(() => {
    if (tasks.length > 0) {
      const totalItems = tasks.length;
      setTotalItems(totalItems);
      
      // 現在のページが範囲外になった場合は、ページを調整
      const totalPages = Math.ceil(totalItems / pageSize);
      if (currentPage > totalPages) {
        setCurrentPage(Math.max(1, totalPages));
      }
      
      // 現在のページのタスクのみを取得
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalItems);
      const tasksForCurrentPage = tasks.slice(startIndex, endIndex);
      
      setPaginatedTasks(tasksForCurrentPage);
      console.log(`現在のページ: ${currentPage}, 表示件数: ${pageSize}, 全${totalItems}件中${startIndex + 1}〜${endIndex}件を表示`);
    } else {
      setPaginatedTasks([]);
      setTotalItems(0);
    }
  }, [tasks, currentPage, pageSize]);
  
  // ページサイズが変更されたとき、ページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);
  
  // ページネーションのハンドラー
  const handlePageChange = (newPage) => {
    // ページ範囲内のチェック
    const totalPages = Math.ceil(totalItems / pageSize);
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // ページ上部にスクロール
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // ページサイズ変更ハンドラー
  const handlePageSizeChange = (event) => {
    const newSize = parseInt(event.target.value, 10);
    setPageSize(newSize);
  };
  
  // ----- レンダリング -----
  return (
    <div className="bg-gray-50 shadow-card rounded-lg overflow-hidden">
      {/* ツールバー */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-2xl font-semibold text-gray-900">タスク一覧</h1>
        
        <div className="flex space-x-2 items-center">
          {/* フィルターボタン */}
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 shadow-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <HiOutlineFilter className="mr-2 h-5 w-5" />
            フィルター
          </button>
          
          {/* 一括編集モードボタン */}
          <button
            className={`inline-flex items-center px-4 py-2 rounded-lg shadow-sm border ${
              bulkEditMode 
                ? 'text-white bg-primary-600 hover:bg-primary-700 border-primary-600' 
                : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-300'
            }`}
            onClick={toggleBulkEditMode}
          >
            <HiCheck className="mr-2 h-5 w-5" />
            一括編集モード {bulkEditMode ? 'ON' : 'OFF'}
          </button>
          
          {/* 新規タスク作成ボタン */}
          <Link
            to="/tasks/new"
            className="inline-flex items-center px-4 py-2 rounded-lg text-white bg-primary-600 hover:bg-primary-700 shadow-sm"
          >
            <HiOutlinePlus className="mr-2 h-5 w-5" />
            新規タスク
          </Link>
        </div>
      </div>
      
      {/* フィルターコンポーネント */}
      {showFilters && (
        <TaskFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleFilterApply}
          onResetFilters={handleFilterReset}
          onClose={() => setShowFilters(false)}
          currentUser={currentUser}
          usersList={usersList} // ユーザー一覧を渡す
          clientsList={clientsList} // クライアント一覧を渡す
        />
      )}
      
      {/* 一括編集バー */}
      {bulkEditMode && selectedTasks.length > 0 && (
        <TaskBulkEditBar
          selectedCount={selectedTasks.length}
          onEditClick={() => setBulkEditModalOpen(true)}
          onClearSelection={() => setSelectedTasks([])}
        />
      )}
      
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <HiOutlineExclamationCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 現在のフィルター表示 */}
      {filters.assignee === currentUser?.id && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex items-center">
            <HiOutlineFilter className="h-5 w-5 text-blue-500 mr-2" />
            <p className="text-sm text-blue-700">現在「自分の担当タスク」のみを表示しています</p>
          </div>
        </div>
      )}
      
      {/* タスク一覧 */}
      {loading ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-500">タスクを読み込み中...</p>
        </div>
      ) : tasks.length > 0 ? (
        <>
          {/* ページサイズ選択とページネーション情報 */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex items-center">
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{totalItems}</span>
                  件中 
                  <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
                  から
                  <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span>
                  件を表示
                </p>
              </div>
              <div className="ml-4">
                <label htmlFor="pageSize" className="text-sm text-gray-700 mr-2">表示件数:</label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={5}>5件</option>
                  <option value={10}>10件</option>
                  <option value={20}>20件</option>
                  <option value={50}>50件</option>
                  <option value={100}>100件</option>
                </select>
              </div>
            </div>
          </div>
      
          {/* タスクテーブル - tasks -> paginatedTasksに変更 */}
          <TaskTable 
            tasks={paginatedTasks}
            sortConfig={sortConfig}
            onSortChange={handleSortChange}
            bulkEditMode={bulkEditMode}
            selectedTasks={selectedTasks}
            onSelectTask={toggleTaskSelection}
            onSelectAll={toggleSelectAll}
            onTaskSelect={handleTaskSelect}
          />
          
          {/* ページネーションコントロール */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              {/* モバイル用ページネーション */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
              >
                前へ
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalItems / pageSize)}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white ${currentPage >= Math.ceil(totalItems / pageSize) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
              >
                次へ
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  ページ
                  <span className="font-medium mx-1">{currentPage}</span>
                  /
                  <span className="font-medium mx-1">{Math.ceil(totalItems / pageSize)}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {/* 前へボタン */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                  >
                    <span className="sr-only">前へ</span>
                    <HiChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* ページ番号ボタン（最大5ページまでを表示） */}
                  {(() => {
                    // 現在のページを中心に表示するための計算
                    const totalPages = Math.ceil(totalItems / pageSize);
                    let pageNumbers = [];
                    
                    if (totalPages <= 5) {
                      // 全5ページ以下なら全て表示
                      pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
                    } else {
                      // 5ページ以上の場合、現在のページを中心に表示
                      const startPage = Math.max(1, currentPage - 2);
                      const endPage = Math.min(totalPages, startPage + 4);
                      
                      pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
                    }
                    
                    return pageNumbers.map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border ${pageNum === currentPage ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'} text-sm font-medium`}
                      >
                        {pageNum}
                      </button>
                    ));
                  })()}
                  
                  {/* 次へボタン */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalItems / pageSize)}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${currentPage >= Math.ceil(totalItems / pageSize) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                  >
                    <span className="sr-only">次へ</span>
                    <HiChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white shadow-card rounded-lg p-8 text-center">
          <HiOutlineDocumentText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">タスクがありません</h3>
          <p className="mt-1 text-sm text-gray-500">
            {Object.values(filters).some(value => value !== '') 
              ? 'フィルター条件に一致するタスクはありません。条件を変更してください。' 
              : 'まだタスクが登録されていません。「新規タスク」から追加してください。'}
          </p>
        </div>
      )}
      
      {/* 一括編集モーダル */}
      <TaskBulkEditModal
        isOpen={bulkEditModalOpen}
        onClose={() => setBulkEditModalOpen(false)}
        selectedCount={selectedTasks.length}
        bulkEditData={bulkEditData}
        onBulkEditDataChange={handleBulkEditDataChange}
        onSubmit={handleBulkEdit}
        isLoading={loading}
        currentUser={currentUser}
        usersList={usersList}
      />
      
      {/* 削除確認モーダル */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteTask}
        loading={loading}
        targetName={selectedTask?.title || 'このタスク'}
      />
    </div>
  );
});

export default TaskList; 