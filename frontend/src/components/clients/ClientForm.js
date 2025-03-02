import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsApi } from '../../api';
import toast from 'react-hot-toast';
import { 
  HiOutlineOfficeBuilding, 
  HiOutlinePhone, 
  HiOutlineMail, 
  HiOutlineGlobeAlt,
  HiOutlineUser,
  HiOutlineCalendar,
  HiOutlineIdentification,
  HiOutlineBriefcase,
  HiOutlineDocumentText
} from 'react-icons/hi';

const ClientForm = ({ clientId = null, initialData = null }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(clientId ? true : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    industry: '',
    notes: '',
    contact_name: '',
    contact_position: '',
    contact_email: '',
    contact_phone: '',
    fiscal_year_end: '',
    tax_id: '',
    account_manager: null
  });
  
  useEffect(() => {
    // If initialData is provided, use it
    if (initialData) {
      setFormData(initialData);
      setLoading(false);
      return;
    }
    
    // Otherwise, if clientId is provided, fetch the client data
    if (clientId) {
      fetchClient();
    }
  }, [clientId, initialData]);
  
  const fetchClient = async () => {
    try {
      const data = await clientsApi.getClient(clientId);
      setFormData(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching client:', error);
      setError('クライアント情報の取得に失敗しました');
      toast.error('クライアント情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('クライアント名は必須です');
      return;
    }
    
    setSaving(true);
    
    try {
      if (clientId) {
        // Update existing client
        await clientsApi.updateClient(clientId, formData);
        toast.success('クライアント情報を更新しました');
      } else {
        // Create new client
        const newClient = await clientsApi.createClient(formData);
        toast.success('新規クライアントを作成しました');
        navigate(`/clients/${newClient.id}`);
      }
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('クライアント情報の保存に失敗しました');
    } finally {
      setSaving(false);
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
            onClick={() => navigate('/clients')}
            className="text-red-700 underline"
          >
            クライアント一覧に戻る
          </button>
        </p>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8 p-6 bg-white rounded-lg shadow">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          {clientId ? 'クライアント情報の編集' : '新規クライアント登録'}
        </h2>
      </div>
      
      {/* 基本情報セクション */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4">基本情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              クライアント名 <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlineOfficeBuilding />
              </span>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
              業種
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlineBriefcase />
              </span>
              <input
                type="text"
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="tax_id" className="block text-sm font-medium text-gray-700 mb-1">
              法人番号
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlineIdentification />
              </span>
              <input
                type="text"
                id="tax_id"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
              />
            </div>
          </div>
          
          <div className="col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              住所
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
              className="textarea textarea-bordered w-full"
            ></textarea>
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              電話番号
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlinePhone />
              </span>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlineMail />
              </span>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              Webサイト
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlineGlobeAlt />
              </span>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="fiscal_year_end" className="block text-sm font-medium text-gray-700 mb-1">
              決算期
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlineCalendar />
              </span>
              <input
                type="date"
                id="fiscal_year_end"
                name="fiscal_year_end"
                value={formData.fiscal_year_end || ''}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* 担当者情報セクション */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4">担当者情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
              担当者名
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlineUser />
              </span>
              <input
                type="text"
                id="contact_name"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="contact_position" className="block text-sm font-medium text-gray-700 mb-1">
              役職
            </label>
            <input
              type="text"
              id="contact_position"
              name="contact_position"
              value={formData.contact_position}
              onChange={handleChange}
              className="input input-bordered w-full"
            />
          </div>
          
          <div>
            <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
              担当者メールアドレス
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlineMail />
              </span>
              <input
                type="email"
                id="contact_email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
              担当者電話番号
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                <HiOutlinePhone />
              </span>
              <input
                type="tel"
                id="contact_phone"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="input input-bordered rounded-l-none w-full"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* 備考セクション */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          備考
        </label>
        <div className="flex">
          <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
            <HiOutlineDocumentText />
          </span>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="4"
            className="textarea textarea-bordered rounded-l-none w-full"
          ></textarea>
        </div>
      </div>
      
      {/* 送信ボタン */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="btn btn-ghost"
          disabled={saving}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2"></span>
              保存中...
            </>
          ) : (
            clientId ? '更新する' : '登録する'
          )}
        </button>
      </div>
    </form>
  );
};

export default ClientForm;