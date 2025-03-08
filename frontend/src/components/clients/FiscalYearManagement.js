import React, { useState, useEffect, useRef } from 'react';
import { clientsApi } from '../../api';
import toast from 'react-hot-toast';
import { HiOutlineRefresh, HiLockClosed, HiLockOpen, HiStar } from 'react-icons/hi';
import { HiCalendarDays, HiMiniArrowsRightLeft } from 'react-icons/hi2';
import FiscalYearForm from './FiscalYearForm';
import FiscalYearTimeline from './FiscalYearTimeline';

const FiscalYearManagement = ({ clientId }) => {
  const [fiscalYears, setFiscalYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const modalContainerRef = useRef(null);
  
  useEffect(() => {
    console.log('FiscalYearManagement mounted or clientId changed:', clientId);
    fetchFiscalYears();
  }, [clientId]);
  
  // モーダルが閉じられた後に再度データを取得するためのポーリングメカニズム
  useEffect(() => {
    // showFormが false (モーダルが閉じられた) になった時にデータを再取得
    if (!showForm) {
      console.log('Modal closed, refetching data...');
      setTimeout(() => {
        fetchFiscalYears();
      }, 300);
    }
  }, [showForm]);
  
  const fetchFiscalYears = async () => {
    console.log('Fetching fiscal years for client:', clientId);
    setLoading(true);
    try {
      const data = await clientsApi.getFiscalYears(clientId);
      console.log('Fiscal years fetched:', data);
      setFiscalYears(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching fiscal years:', error);
      setError('決算期の取得に失敗しました');
      toast.error('決算期の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddClick = () => {
    setSelectedFiscalYear(null);
    setShowForm(true);
  };
  
  const handleEditClick = (fiscalYear) => {
    setSelectedFiscalYear(fiscalYear);
    setShowForm(true);
  };
  
  const handleFormClose = () => {
    setShowForm(false);
    setSelectedFiscalYear(null);
  };
  
  const handleFormSuccess = () => {
    console.log('Form success callback triggered');
    setTimeout(() => {
      console.log('Fetching fiscal years after form success');
      fetchFiscalYears();
    }, 800); // データが更新される時間を確保するために少し遅延を入れる
  };
  
  const handleSetCurrentFiscalYear = async (fiscalYear) => {
    if (actionLoading) return;
    
    if (fiscalYear.is_locked) {
      toast.error('ロックされた決算期は現在の期として設定できません');
      return;
    }
    
    if (fiscalYear.is_current) {
      toast('この決算期は既に現在の期として設定されています');
      return;
    }
    
    try {
      setActionLoading(true);
      await clientsApi.setCurrentFiscalYear(fiscalYear.id);
      toast.success(`第${fiscalYear.fiscal_period}期を現在の期として設定しました`);
      fetchFiscalYears();
    } catch (error) {
      console.error('Error setting current fiscal year:', error);
      let errorMsg = '現在の期の設定に失敗しました';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      toast.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleToggleLock = async (fiscalYear) => {
    if (actionLoading) return;
    
    try {
      setActionLoading(true);
      const result = await clientsApi.toggleFiscalYearLock(fiscalYear.id);
      
      if (result.is_locked) {
        toast.success(`第${fiscalYear.fiscal_period}期をロックしました`);
      } else {
        toast.success(`第${fiscalYear.fiscal_period}期のロックを解除しました`);
      }
      
      fetchFiscalYears();
    } catch (error) {
      console.error('Error toggling fiscal year lock:', error);
      let errorMsg = 'ロック状態の変更に失敗しました';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      toast.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };
  
  const calculateDuration = (start, end) => {
    if (!start || !end) return '';
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // 日数を計算（終了日も含める）
    const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const months = Math.floor(days / 30);
    
    if (months < 1) {
      return `${days}日間`;
    } else {
      return `約${months}ヶ月間 (${days}日)`;
    }
  };
  
  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <HiCalendarDays className="mr-2 text-primary" />
          決算期管理
        </h3>
        <button 
          className="btn btn-sm btn-outline btn-primary"
          onClick={handleAddClick}
          disabled={actionLoading}
        >
          決算期を追加
        </button>
      </div>
      
      {error && (
        <div className="alert alert-error mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={fetchFiscalYears}
            className="btn btn-sm btn-ghost"
          >
            <HiOutlineRefresh className="mr-1" /> 再読み込み
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-4">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      ) : fiscalYears.length === 0 ? (
        <div className="alert alert-info">
          まだ決算期が登録されていません。「決算期を追加」ボタンから登録してください。
        </div>
      ) : (
        <>
          <div className="mb-6">
            <FiscalYearTimeline fiscalYears={fiscalYears} />
          </div>
        
          <div className="overflow-x-auto rounded-lg border">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>期</th>
                  <th>期間</th>
                  <th>長さ</th>
                  <th>状態</th>
                  <th>備考</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {fiscalYears.map((fiscalYear) => (
                  <tr key={fiscalYear.id} className={fiscalYear.is_current ? 'bg-primary bg-opacity-10' : ''}>
                    <td className="font-medium">
                      第{fiscalYear.fiscal_period}期
                      {fiscalYear.is_current && (
                        <span className="ml-2 badge badge-primary badge-sm">現在</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {fiscalYear.start_date} 〜 {fiscalYear.end_date}
                    </td>
                    <td>
                      <div className="flex items-center">
                        <HiMiniArrowsRightLeft className="mr-1 text-gray-500" />
                        {calculateDuration(fiscalYear.start_date, fiscalYear.end_date)}
                        {fiscalYear.duration_days && <span className="text-xs ml-1">({fiscalYear.duration_days}日)</span>}
                      </div>
                    </td>
                    <td>
                      {fiscalYear.is_locked ? (
                        <span className="flex items-center text-warning">
                          <HiLockClosed className="mr-1" /> ロック済
                        </span>
                      ) : (
                        <span className="flex items-center text-success">
                          <HiLockOpen className="mr-1" /> 編集可能
                        </span>
                      )}
                    </td>
                    <td className="truncate max-w-[200px]">{fiscalYear.description}</td>
                    <td>
                      <div className="flex space-x-2">
                        {!fiscalYear.is_current && (
                          <button
                            className="btn btn-xs btn-outline btn-primary"
                            onClick={() => handleSetCurrentFiscalYear(fiscalYear)}
                            disabled={actionLoading || fiscalYear.is_locked}
                            title="現在の期として設定"
                          >
                            <HiStar className="mr-1" />
                            現在
                          </button>
                        )}
                        
                        <button
                          className={`btn btn-xs btn-outline ${fiscalYear.is_locked ? 'btn-warning' : 'btn-ghost'}`}
                          onClick={() => handleToggleLock(fiscalYear)}
                          disabled={actionLoading}
                          title={fiscalYear.is_locked ? 'ロック解除' : 'ロック'}
                        >
                          {fiscalYear.is_locked ? <HiLockClosed /> : <HiLockOpen />}
                        </button>
                        
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={() => handleEditClick(fiscalYear)}
                          disabled={actionLoading || fiscalYear.is_locked}
                          title="編集"
                        >
                          編集
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      
      {/* モーダルコンテナ - z-indexが親コンポーネントに影響されないために別途追加 */}
      <div ref={modalContainerRef} className="fiscal-year-form-modal-container" style={{ position: 'relative', zIndex: 9999 }}>
        {showForm && (
          <FiscalYearForm
            clientId={clientId}
            fiscalYear={selectedFiscalYear}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default FiscalYearManagement;