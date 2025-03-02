import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { FaUser, FaEnvelope, FaPhone, FaBriefcase, FaBuilding } from 'react-icons/fa';
import { apiClient, authApi } from '../api';

const ProfilePage = () => {
  const { currentUser, setCurrentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  // Set form defaults when user data is available
  useEffect(() => {
    if (currentUser) {
      setValue('first_name', currentUser.first_name || '');
      setValue('last_name', currentUser.last_name || '');
      setValue('phone', currentUser.phone || '');
      setValue('position', currentUser.position || '');
      
      // Set image preview if profile image exists
      if (currentUser.profile_image) {
        setImagePreview(currentUser.profile_image);
      }
    }
  }, [currentUser, setValue]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Handle image upload separately if there's a file
      if (data.profile_image && data.profile_image.length > 0) {
        const formData = new FormData();
        formData.append('profile_image', data.profile_image[0]);
        
        await apiClient.post('/users/profile/me/upload_image/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      
      // Update user profile data
      const updateData = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        position: data.position,
      };
      
      const response = await authApi.updateProfile(updateData);
      
      // Update current user context with new data
      setCurrentUser({
        ...currentUser,
        ...response,
      });
      
      toast.success('プロフィールを更新しました');
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('プロフィールの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 bg-blue-600 p-8 text-white">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center">
                  {imagePreview || currentUser.profile_image ? (
                    <img 
                      src={imagePreview || currentUser.profile_image} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaUser className="text-gray-400 text-4xl" />
                  )}
                </div>
                {isEditMode && (
                  <label 
                    htmlFor="profile_image" 
                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </label>
                )}
              </div>
              <h2 className="text-2xl font-semibold">
                {currentUser.first_name} {currentUser.last_name}
              </h2>
              <p className="text-blue-200">{currentUser.position || 'No position set'}</p>
            </div>
            
            <div className="mt-8">
              <div className="flex items-center mb-4">
                <FaEnvelope className="mr-3" />
                <div>
                  <p className="text-sm text-blue-200">メールアドレス</p>
                  <p>{currentUser.email}</p>
                </div>
              </div>
              
              <div className="flex items-center mb-4">
                <FaPhone className="mr-3" />
                <div>
                  <p className="text-sm text-blue-200">電話番号</p>
                  <p>{currentUser.phone || '未設定'}</p>
                </div>
              </div>
              
              <div className="flex items-center mb-4">
                <FaBriefcase className="mr-3" />
                <div>
                  <p className="text-sm text-blue-200">役職</p>
                  <p>{currentUser.position || '未設定'}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <FaBuilding className="mr-3" />
                <div>
                  <p className="text-sm text-blue-200">ビジネスID</p>
                  <p>{currentUser.business_id || '未割り当て'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="md:w-2/3 p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">プロフィール</h1>
              {!isEditMode ? (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  編集する
                </button>
              ) : (
                <button
                  onClick={() => setIsEditMode(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  キャンセル
                </button>
              )}
            </div>
            
            {isEditMode ? (
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="first_name">
                    名前
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md ${errors.first_name ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="名前"
                    {...register('first_name', { required: '名前は必須です' })}
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="last_name">
                    姓
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md ${errors.last_name ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="姓"
                    {...register('last_name', { required: '姓は必須です' })}
                  />
                  {errors.last_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
                    電話番号
                  </label>
                  <input
                    id="phone"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="電話番号"
                    {...register('phone')}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="position">
                    役職
                  </label>
                  <input
                    id="position"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="役職"
                    {...register('position')}
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="profile_image">
                    プロフィール画像
                  </label>
                  <input
                    id="profile_image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    {...register('profile_image')}
                    onChange={handleImageChange}
                  />
                  <div className="flex items-center">
                    <label
                      htmlFor="profile_image"
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 cursor-pointer"
                    >
                      ファイルを選択
                    </label>
                    <span className="ml-3 text-sm text-gray-500">
                      {imagePreview ? '画像が選択されています' : 'ファイルが選択されていません'}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
                      isLoading ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? '保存中...' : '変更を保存'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">アカウント情報</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500 mb-1">メールアドレス</p>
                    <p className="text-gray-800">{currentUser.email}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">個人情報</h3>
                  <div className="bg-gray-50 p-4 rounded-md space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">氏名</p>
                      <p className="text-gray-800">{currentUser.first_name} {currentUser.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">電話番号</p>
                      <p className="text-gray-800">{currentUser.phone || '未設定'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">役職</p>
                      <p className="text-gray-800">{currentUser.position || '未設定'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">ビジネス情報</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500 mb-1">ビジネスID</p>
                    <p className="text-gray-800">{currentUser.business_id || '未割り当て'}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">アカウント設定</h3>
                  <div className="space-y-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      パスワード変更
                    </button>
                    <button className="block text-blue-600 hover:text-blue-800 text-sm">
                      通知設定
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;