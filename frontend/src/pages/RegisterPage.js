import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const { register: registerForm, handleSubmit, watch, formState: { errors } } = useForm();
  const { register: registerUser, error } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const password = watch('password', '');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Prepare user data
      const userData = {
        email: data.email,
        password: data.password,
        re_password: data.confirmPassword,
        first_name: data.firstName,
        last_name: data.lastName,
      };

      // Register user
      const success = await registerUser(userData);
      
      if (success) {
        // 登録成功
        console.log("Registration successful, redirecting to dashboard");
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Registration error:", error);
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
              新規アカウント登録
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              既にアカウントをお持ちの方は{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                ログイン
              </Link>
            </p>
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-4">
            {typeof error === 'object' 
              ? Object.entries(error).map(([key, value]) => (
                  <div key={key} className="mb-1 last:mb-0">{key}: {Array.isArray(value) ? value.join(', ') : value}</div>
                ))
              : error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">名</label>
              <input
                id="firstName"
                type="text"
                className={`appearance-none relative block w-full px-4 py-3 border ${
                  errors.firstName ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
                placeholder="例：太郎"
                {...registerForm('firstName', { 
                  required: '名を入力してください',
                })}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">姓</label>
              <input
                id="lastName"
                type="text"
                className={`appearance-none relative block w-full px-4 py-3 border ${
                  errors.lastName ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
                placeholder="例：山田"
                {...registerForm('lastName', { 
                  required: '姓を入力してください',
                })}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
              )}
            </div>
            
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
                {...registerForm('email', { 
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
                autoComplete="new-password"
                className={`appearance-none relative block w-full px-4 py-3 border ${
                  errors.password ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
                placeholder="••••••••"
                {...registerForm('password', { 
                  required: 'パスワードは必須です',
                  minLength: {
                    value: 8,
                    message: 'パスワードは8文字以上で入力してください'
                  }
                })}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">パスワード（確認）</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`appearance-none relative block w-full px-4 py-3 border ${
                  errors.confirmPassword ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors sm:text-sm`}
                placeholder="••••••••"
                {...registerForm('confirmPassword', { 
                  required: 'パスワード確認は必須です',
                  validate: value => value === password || 'パスワードが一致しません'
                })}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="agree-terms"
                name="agree-terms"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                {...registerForm('agreeTerms', { 
                  required: '利用規約に同意してください'
                })}
              />
              <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-700">
                <Link to="#" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">利用規約</Link>に同意します
              </label>
            </div>
          </div>
          {errors.agreeTerms && (
            <p className="mt-1 text-xs text-red-600">{errors.agreeTerms.message}</p>
          )}

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
                  アカウント作成中...
                </span>
              ) : (
                'アカウント作成'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;