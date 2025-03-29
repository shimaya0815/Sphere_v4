import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { HiOutlineSave, HiOutlineX } from 'react-icons/hi';

const SavedFilterModal = ({ 
  isOpen, 
  onClose, 
  currentFilters, 
  savedFilters, 
  onSaveFilter, 
  onSetDefaultFilter, 
  defaultFilterName = '', 
  onDeleteFilter 
}) => {
  const [filterName, setFilterName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [mode, setMode] = useState('new'); // 'new' または 'edit'

  // モーダルが開かれたときに状態をリセット
  useEffect(() => {
    if (isOpen) {
      setFilterName('');
      setIsDefault(false);
      setSelectedFilter('');
      setMode('new');
    }
  }, [isOpen, defaultFilterName]);

  // 編集モードに切り替え
  const handleEditMode = (filterName) => {
    setSelectedFilter(filterName);
    setFilterName(filterName);
    setIsDefault(defaultFilterName === filterName);
    setMode('edit');
    
    // デバッグログ
    console.log(`編集モードに切り替え: ${filterName}, デフォルト: ${defaultFilterName === filterName}`);
  };

  // フィルタの保存
  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    
    console.log(`フィルタを保存: ${filterName}, デフォルト: ${isDefault}`);
    onSaveFilter(filterName, currentFilters);
    
    if (isDefault) {
      console.log(`デフォルトフィルタに設定: ${filterName}`);
      onSetDefaultFilter(filterName);
    } else if (defaultFilterName === filterName) {
      // 既存のデフォルトからチェックを外した場合、デフォルト設定を解除
      console.log(`デフォルトフィルタを解除: ${filterName}`);
      onSetDefaultFilter('');
    }

    onClose();
  };

  // 既存のフィルタの更新
  const handleUpdateFilter = () => {
    if (!selectedFilter) return;
    
    console.log(`フィルタを更新: ${selectedFilter}, デフォルト: ${isDefault}`);
    onSaveFilter(selectedFilter, currentFilters);
    
    if (isDefault) {
      console.log(`デフォルトフィルタに設定: ${selectedFilter}`);
      onSetDefaultFilter(selectedFilter);
    } else if (defaultFilterName === selectedFilter) {
      // 既存のデフォルトからチェックを外した場合、デフォルト設定を解除
      console.log(`デフォルトフィルタを解除: ${selectedFilter}`);
      onSetDefaultFilter('');
    }

    onClose();
  };

  // フィルタの削除
  const handleDeleteFilter = (filterName) => {
    if (window.confirm(`フィルタ「${filterName}」を削除してもよろしいですか？`)) {
      onDeleteFilter(filterName);
      if (mode === 'edit' && selectedFilter === filterName) {
        setMode('new');
        setFilterName('');
      }
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                >
                  {mode === 'new' ? 'フィルタを保存' : 'フィルタを編集'}
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <HiOutlineX className="h-5 w-5" />
                  </button>
                </Dialog.Title>

                <div className="mt-4">
                  {mode === 'new' ? (
                    <div>
                      <div className="mb-4">
                        <label htmlFor="filter-name" className="block text-sm font-medium text-gray-700">
                          フィルタ名
                        </label>
                        <input
                          type="text"
                          id="filter-name"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                          placeholder="フィルタ名を入力"
                        />
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center">
                          <input
                            id="default-filter"
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                          />
                          <label htmlFor="default-filter" className="ml-2 block text-sm text-gray-700">
                            デフォルトフィルタとして設定
                          </label>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          タスク一覧を開いたときに、このフィルタが自動的に適用されます
                        </p>
                      </div>

                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                        onClick={handleSaveFilter}
                        disabled={!filterName.trim()}
                      >
                        <HiOutlineSave className="mr-2 h-5 w-5" />
                        保存
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <div className="flex items-center">
                          <input
                            id="default-filter-edit"
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                          />
                          <label htmlFor="default-filter-edit" className="ml-2 block text-sm text-gray-700">
                            デフォルトフィルタとして設定
                          </label>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          タスク一覧を開いたときに、このフィルタが自動的に適用されます
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                          onClick={handleUpdateFilter}
                        >
                          <HiOutlineSave className="mr-2 h-5 w-5" />
                          更新
                        </button>
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                          onClick={() => {
                            setMode('new');
                            setFilterName('');
                          }}
                        >
                          新規作成
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {Object.keys(savedFilters || {}).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">保存済みフィルタ</h4>
                    <ul className="divide-y divide-gray-200">
                      {Object.entries(savedFilters).map(([name, filter]) => {
                        const isSystemDefault = filter.is_system_default;
                        return (
                          <li key={name} className="py-2 flex justify-between items-center">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-800">{name}</span>
                              {isSystemDefault && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  システム
                                </span>
                              )}
                              {defaultFilterName === name && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  デフォルト
                                </span>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              {!isSystemDefault && (
                                <>
                                  <button
                                    type="button"
                                    className="text-xs text-primary-600 hover:text-primary-800"
                                    onClick={() => handleEditMode(name)}
                                  >
                                    編集
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-red-600 hover:text-red-800"
                                    onClick={() => handleDeleteFilter(name)}
                                  >
                                    削除
                                  </button>
                                </>
                              )}
                              {isSystemDefault && (
                                <button
                                  type="button"
                                  className="text-xs text-primary-600 hover:text-primary-800"
                                  onClick={() => onSetDefaultFilter(name)}
                                >
                                  {defaultFilterName === name ? 'デフォルト解除' : 'デフォルトに設定'}
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SavedFilterModal; 