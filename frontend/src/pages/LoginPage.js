import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login, error } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const navigate = useNavigate();
  
  // デバッグ用の直接API呼び出し関数
  const testDirectApiCall = async () => {
    try {
      setDebugInfo("API呼び出し中...");
      const response = await axios.post('/api/auth/token/login/', {
        email: 'shimaya@smy-cpa.com',
        password: 'Pu8jbzMG1!',
        business_id: 's-business-416c756d'
      }, {
        timeout: 60000 // Increase timeout to 60 seconds
      });
      setDebugInfo(`API呼び出し成功: ${JSON.stringify(response.data)}`);
    } catch (err) {
      setDebugInfo(`API呼び出し失敗: ${err.message}\n${JSON.stringify(err.response?.data || {})}`);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const success = await login(data.email, data.password, data.businessId);
      if (success) {
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-card">
        <div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary-700 mb-2">Sphere</h1>
            <h2 className="text-2xl font-bold text-gray-900">
              アカウントにログイン
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              または{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                新規アカウント登録
              </Link>
            </p>
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-4">
            {typeof error === 'object' 
              ? Object.entries(error).map(([key, value]) => (
                  <div key={key} className="mb-1 last:mb-0">{key}: {value}</div>
                ))
              : error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`appearance-none relative block w-full px-4 py-3 border ${
                  errors.email ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
                placeholder="your.email@example.com"
                {...register('email', { 
                  required: 'メールアドレスは必須です',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: '有効なメールアドレスを入力してください'
                  }
                })}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`appearance-none relative block w-full px-4 py-3 border ${
                  errors.password ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
                placeholder="••••••••"
                {...register('password', { 
                  required: 'パスワードは必須です',
                  minLength: {
                    value: 6,
                    message: 'パスワードは6文字以上で入力してください'
                  }
                })}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="businessId" className="block text-sm font-medium text-gray-700 mb-1">ビジネスID</label>
              <input
                id="businessId"
                type="text"
                className={`appearance-none relative block w-full px-4 py-3 border ${
                  errors.businessId ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
                placeholder="your-business-id"
                {...register('businessId', { required: 'ビジネスIDは必須です' })}
              />
              {errors.businessId && (
                <p className="mt-1 text-xs text-red-600">{errors.businessId.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                ログイン状態を保存
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                パスワードをお忘れですか？
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ログイン中...
                </span>
              ) : (
                'ログイン'
              )}
            </button>
            
            {/* デバッグボタン */}
            <div className="mt-4">
              <button
                type="button"
                onClick={testDirectApiCall}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100"
              >
                デバッグテスト
              </button>
              
              {debugInfo && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs font-mono overflow-auto max-h-40">
                  <pre>{debugInfo}</pre>
                </div>
              )}
            </div>
          </div>
        </form>
        
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                または以下でログイン
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <button
                type="button"
                className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.501 12.2551C22.501 11.4411 22.4296 10.6261 22.2808 9.83011H12.2148V14.2551H18.1198C17.887 15.5901 17.1579 16.7931 16.0476 17.6001V20.3821H19.6212C21.7584 18.3411 22.501 15.5511 22.501 12.2551Z" fill="#4285F4"/>
                  <path d="M12.214 23.0008C15.1068 23.0008 17.5353 22.0148 19.6254 20.3828L16.0518 17.6008C15.0899 18.2518 13.8078 18.6258 12.214 18.6258C9.38654 18.6258 6.97086 16.6928 6.11961 14.0938H2.4165V16.9378C4.5009 20.6648 8.18049 23.0008 12.214 23.0008Z" fill="#34A853"/>
                  <path d="M6.11865 14.0941C5.92595 13.4431 5.8189 12.7301 5.8189 12.0001C5.8189 11.2701 5.92595 10.5571 6.11865 9.90609V7.06209H2.4165C1.73845 8.5941 1.35156 10.2581 1.35156 12.0001C1.35156 13.7421 1.73845 15.4061 2.4165 16.9381L6.11865 14.0941Z" fill="#FBBC05"/>
                  <path d="M12.214 5.37429C13.7572 5.37429 15.1356 5.92229 16.231 7.01629L19.3578 3.87429C17.5346 1.99529 15.1068 0.999292 12.214 0.999292C8.18049 0.999292 4.5009 3.33529 2.4165 7.06229L6.11865 9.90629C6.97086 7.30729 9.38654 5.37429 12.214 5.37429Z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </button>
            </div>

            <div>
              <button
                type="button"
                className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>GitHub</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;