import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/auth';
import { authApi } from '../api';
import tasksApi from '../api/tasks';
import axios from 'axios';

// 認証コンテキスト
const AuthContext = createContext(null);

/**
 * 認証プロバイダーコンポーネント
 * @param {object} props props
 * @param {React.ReactNode} props.children 子要素
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ユーザープロフィールを取得
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return null;
      }
      
      const userData = await authApi.getProfile();
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'プロフィールの取得に失敗しました');
      setIsAuthenticated(false);
      clearAuthToken();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // ログイン
  const login = useCallback(async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authApi.login(credentials);
      const { token, user: userData } = response;
      
      // トークンを保存
      setAuthToken(token);
      setUser(userData);
      setIsAuthenticated(true);
      
      return response;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'ログインに失敗しました');
      setIsAuthenticated(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // ユーザー登録
  const register = useCallback(async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // ユーザー登録API呼び出し - authApi.registerの代わりにaxios直接利用
      const response = await axios.post('/api/auth/users/', userData);
      
      // 登録後自動的にログイン
      const loginResponse = await login({
        email: userData.email,
        password: userData.password
      });
      
      // ログイン成功後、ユーザーのデフォルトテンプレートを作成
      if (loginResponse) {
        try {
          const { user: loggedInUser } = loginResponse;
          
          // LocalStorageに保存（他の機能で使用するため）
          if (loggedInUser.business && loggedInUser.business.id) {
            localStorage.setItem('businessId', loggedInUser.business.id);
          }
          
          if (loggedInUser.current_workspace && loggedInUser.current_workspace.id) {
            localStorage.setItem('workspaceId', loggedInUser.current_workspace.id);
          } else if (loggedInUser.workspaces && loggedInUser.workspaces.length > 0) {
            localStorage.setItem('workspaceId', loggedInUser.workspaces[0].id);
          }
          
          // デフォルトテンプレートの作成
          await createDefaultTemplates();
        } catch (templateError) {
          console.error('Error creating default templates during registration:', templateError);
          // テンプレート作成でエラーが発生しても登録自体は成功とする
        }
      }
      
      return response.data;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data || err.message || 'ユーザー登録に失敗しました');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [login]);
  
  // ログアウト
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      await authApi.logout();
      clearAuthToken();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
      // エラーが発生してもトークンはクリア
      clearAuthToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // デフォルトテンプレート作成（ユーザー登録時に呼び出す）
  const createDefaultTemplates = useCallback(async () => {
    try {
      // カテゴリとステータスを取得
      const [categoriesResponse, statusesResponse] = await Promise.all([
        tasksApi.getCategories(),
        tasksApi.getStatuses()
      ]);
      
      // 配列化 - DRFのページネーション対応
      const categories = Array.isArray(categoriesResponse) ? categoriesResponse : 
                      (categoriesResponse?.results || categoriesResponse?.data || []);
      
      const statuses = Array.isArray(statusesResponse) ? statusesResponse : 
                     (statusesResponse?.results || statusesResponse?.data || []);
      
      // ビジネスIDとワークスペースID
      const businessId = localStorage.getItem('businessId');
      const workspaceId = localStorage.getItem('workspaceId');
      
      if (!businessId || !workspaceId) {
        console.error('ビジネスIDまたはワークスペースIDが取得できません。');
        return;
      }
      
      // デフォルトステータスの取得
      const defaultStatus = statuses.find(s => s.name === '未着手');
      if (!defaultStatus) {
        console.error('デフォルトステータスが見つかりません');
        return;
      }
      
      // デフォルトテンプレートの定義（TaskTemplateList.jsと同じ定義）
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
      
      // テンプレートを作成
      for (const template of DEFAULT_TEMPLATES) {
        try {
          // カテゴリを検索
          const category = categories.find(c => c.name === template.category_name) || categories[0];
          
          // テンプレート作成データを準備
          const templateData = {
            title: template.title,
            description: template.description,
            category: category?.id,
            status: defaultStatus.id,
            is_template: true,
            template_name: template.template_name,
            recurrence_pattern: template.recurrence_pattern,
            estimated_hours: template.estimated_hours,
            business: businessId,
            workspace: workspaceId,
          };
          
          // テンプレート作成
          await tasksApi.createTask(templateData);
        } catch (err) {
          console.error(`Error creating template ${template.title}:`, err);
          // エラーがあっても続行
        }
      }
    } catch (error) {
      console.error('Error in createDefaultTemplates:', error);
    }
  }, []);
  
  // アプリ起動時に認証状態をチェック
  useEffect(() => {
    const initAuth = async () => {
      await fetchProfile();
    };
    
    initAuth();
  }, [fetchProfile]);
  
  // コンテキスト値
  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    fetchProfile,
    createDefaultTemplates
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 認証フック
 * @returns {object} 認証コンテキスト
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth; 