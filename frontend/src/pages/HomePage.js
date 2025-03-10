import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white font-sans">
      <header className="relative z-10">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">Sphere</div>
            </div>
            <div className="space-x-4">
              {isAuthenticated() ? (
                <Link 
                  to="/dashboard" 
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all"
                >
                  ダッシュボード
                </Link>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="px-6 py-2 text-indigo-700 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-all"
                  >
                    ログイン
                  </Link>
                  <Link 
                    to="/register" 
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all"
                  >
                    無料で始める
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-24">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 opacity-80"></div>
          <div className="container mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="max-w-xl">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
                  会計事務所専用ツール
                </span>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight">
                  会計事務所の業務効率を<br />飛躍的に向上させる<br />一元管理プラットフォーム
                </h1>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  顧問先ごとの申告期限管理、スタッフのタスク配分、業務の進捗状況をリアルタイムで把握。会計事務所特有の複雑な業務フローを完全に自動化し、ミスや漏れを防ぎます。
                </p>
                <div className="flex flex-wrap gap-4">
                  {isAuthenticated() ? (
                    <Link 
                      to="/dashboard" 
                      className="px-8 py-3 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all text-lg font-medium"
                    >
                      ダッシュボードへ
                    </Link>
                  ) : (
                    <>
                      <Link 
                        to="/register" 
                        className="px-8 py-3 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all text-lg font-medium flex items-center"
                      >
                        無料でデモを体験
                        <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                        </svg>
                      </Link>
                      <Link 
                        to="/login" 
                        className="px-8 py-3 bg-white text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-all text-lg font-medium"
                      >
                        ログイン
                      </Link>
                    </>
                  )}
                </div>
                <div className="mt-8 flex items-center text-gray-500 text-sm">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  <span>クレジットカード不要・初期費用ゼロ円</span>
                </div>
              </div>
              <div className="relative hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-3xl opacity-10 transform rotate-6"></div>
                <div className="relative bg-white shadow-xl rounded-2xl p-6 border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <div className="ml-4 text-sm text-gray-600 font-medium">顧問先別業務ダッシュボード</div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                      <div className="flex justify-between">
                        <h3 className="font-bold text-blue-800">法人税確定申告</h3>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">進行中</span>
                      </div>
                      <p className="text-blue-700 mt-2 text-sm">株式会社山田商事 - 3月決算 - 期限: 5月31日</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                      <div className="flex justify-between">
                        <h3 className="font-bold text-green-800">消費税申告</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">完了</span>
                      </div>
                      <p className="text-green-700 mt-2 text-sm">合同会社斉藤 - 第2期 - 完了日: 3月15日</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                      <div className="flex justify-between">
                        <h3 className="font-bold text-purple-800">月次処理</h3>
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">期限間近</span>
                      </div>
                      <p className="text-purple-700 mt-2 text-sm">田中商店 - 2月度 - 期限: 3月25日</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4 border-l-4 border-indigo-500">
                      <div className="flex justify-between">
                        <h3 className="font-bold text-indigo-800">決算準備</h3>
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">未着手</span>
                      </div>
                      <p className="text-indigo-700 mt-2 text-sm">株式会社鈴木製作所 - 5月決算 - 開始予定: 4月1日</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">会計事務所特有の課題を全て解決</h2>
              <p className="text-gray-600">
                税理士事務所・会計事務所特有の業務フローを徹底分析し、専用設計された唯一の業務管理ツール
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                }
                title="期限管理の自動化" 
                description="クライアントごとの決算期・納期を自動計算。複数年度の税務スケジュールを一括管理し、重要な提出期限の見落としを防止します。"
              />
              <FeatureCard 
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                }
                title="最適なタスク配分" 
                description="スタッフのスキルと稼働状況に基づき、最適な業務分担を自動提案。チーム全体の生産性を向上させます。"
              />
              <FeatureCard 
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                }
                title="税務テンプレート搭載" 
                description="法人税・所得税・消費税など、税目別の標準作業テンプレートを搭載。業種やクライアントに合わせたカスタマイズも可能です。"
              />
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-gradient-to-br from-indigo-50 to-white relative overflow-hidden">
          <div className="container mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
                  専門家のための設計
                </span>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">
                  導入事務所の平均で業務効率40%向上、残業時間50%削減
                </h2>
                <div className="space-y-6">
                  <BenefitItem 
                    title="申告業務の効率化" 
                    description="標準化されたワークフローとチェックリストにより、ミスや手戻りを大幅に削減。" 
                  />
                  <BenefitItem 
                    title="リアルタイム進捗管理" 
                    description="全てのクライアント業務の進捗状況を一画面で把握。問題の早期発見と対応が可能に。" 
                  />
                  <BenefitItem 
                    title="リソース最適化" 
                    description="各スタッフの稼働状況とスキルを可視化し、最適な人員配置を実現。" 
                  />
                  <BenefitItem 
                    title="コミュニケーション円滑化" 
                    description="タスクごとのスレッド化されたコミュニケーションで、情報の分散を防止。" 
                  />
                </div>
              </div>
              <div className="relative">
                <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-800">生産性分析レポート</h3>
                    <span className="text-sm text-gray-500">先月比 +28%</span>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600 text-sm">法人税申告業務</span>
                        <span className="text-gray-900 font-medium text-sm">87%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{width: '87%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600 text-sm">消費税申告業務</span>
                        <span className="text-gray-900 font-medium text-sm">92%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: '92%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600 text-sm">所得税申告業務</span>
                        <span className="text-gray-900 font-medium text-sm">76%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '76%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600 text-sm">月次処理業務</span>
                        <span className="text-gray-900 font-medium text-sm">94%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{width: '94%'}}></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-gray-500 text-sm">合計稼働時間</div>
                        <div className="text-2xl font-bold text-gray-900">168.5h</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm">完了タスク数</div>
                        <div className="text-2xl font-bold text-gray-900">124</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm">顧客満足度</div>
                        <div className="text-2xl font-bold text-gray-900">4.9/5</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-12">
              会計事務所の業務に特化した<br/>必要機能を全て搭載
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <SmallFeatureCard 
                icon="📅" 
                title="スケジュール管理" 
                description="複数の顧問先の決算期や申告期限を一元管理。自動リマインダーで期限切れを防止。"
              />
              <SmallFeatureCard 
                icon="📋" 
                title="税務申告テンプレート" 
                description="法人税・所得税・消費税など、各種申告に必要な作業ステップを網羅したテンプレート。"
              />
              <SmallFeatureCard 
                icon="👥" 
                title="顧問先情報管理" 
                description="顧問先の基本情報、税務情報、契約情報を一元管理。重要書類も添付可能。"
              />
              <SmallFeatureCard 
                icon="⏱️" 
                title="時間記録・工数分析" 
                description="タスク別・クライアント別の作業時間記録と分析。料金プラン最適化にも活用可能。"
              />
              <SmallFeatureCard 
                icon="📊" 
                title="ワークロード可視化" 
                description="スタッフごとの業務負荷と進捗状況をリアルタイムで可視化。最適な人員配置を支援。"
              />
              <SmallFeatureCard 
                icon="🔄" 
                title="承認ワークフロー" 
                description="作業担当者とレビュー担当者の役割を明確化。承認フローでミスを防止。"
              />
              <SmallFeatureCard 
                icon="📝" 
                title="業務マニュアル" 
                description="ナレッジベース機能で業務手順を共有。新人教育や品質の標準化に貢献。"
              />
              <SmallFeatureCard 
                icon="🔔" 
                title="通知・アラート" 
                description="重要な期限や承認依頼をメール・アプリ内通知でお知らせ。見落としを防止。"
              />
              <SmallFeatureCard 
                icon="💬" 
                title="クライアントコミュニケーション" 
                description="クライアントとのやり取りをタスクに紐づけて記録。情報の一元管理を実現。"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-indigo-600 text-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">会計事務所の業務効率化を今すぐ体験</h2>
            <p className="text-indigo-100 max-w-2xl mx-auto mb-8 text-lg">
              初期費用ゼロ円、30日間の無料トライアル。クレジットカードの登録も不要です。
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                to="/register" 
                className="px-8 py-3 bg-white text-indigo-700 rounded-lg shadow-lg hover:bg-indigo-50 transition-all text-lg font-medium"
              >
                無料デモを申し込む
              </Link>
              <Link 
                to="/login" 
                className="px-8 py-3 bg-indigo-700 text-white border border-indigo-500 rounded-lg hover:bg-indigo-800 transition-all text-lg font-medium"
              >
                既存アカウントでログイン
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <div className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">Sphere</div>
              <p className="text-gray-400 mb-6">
                会計事務所専用の業務効率化プラットフォーム。タスク管理から顧問先管理、時間記録まで一元化。
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">製品情報</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-indigo-300 transition-colors">機能一覧</a></li>
                <li><a href="#" className="hover:text-indigo-300 transition-colors">料金プラン</a></li>
                <li><a href="#" className="hover:text-indigo-300 transition-colors">導入事例</a></li>
                <li><a href="#" className="hover:text-indigo-300 transition-colors">サポート体制</a></li>
                <li><a href="#" className="hover:text-indigo-300 transition-colors">アップデート情報</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">会社情報</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-indigo-300 transition-colors">企業概要</a></li>
                <li><a href="#" className="hover:text-indigo-300 transition-colors">ミッション</a></li>
                <li><a href="#" className="hover:text-indigo-300 transition-colors">ブログ</a></li>
                <li><a href="#" className="hover:text-indigo-300 transition-colors">採用情報</a></li>
                <li><a href="#" className="hover:text-indigo-300 transition-colors">お問い合わせ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">法的情報</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-indigo-300 transition-colors">プライバシーポリシー</a></li>
                <li><a href="#" className="hover:text-indigo-300 transition-colors">利用規約</a></li>
                <li><a href="#" className="hover:text-indigo-300 transition-colors">セキュリティ</a></li>
                <li><a href="#" className="hover:text-indigo-300 transition-colors">特定商取引法に基づく表記</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Sphere. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100">
    <div className="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-5">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-gray-800">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
    <div className="mt-4 pt-3 border-t border-gray-100">
      <a href="#" className="text-indigo-600 text-sm font-medium hover:text-indigo-800 flex items-center">
        詳細を見る
        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </a>
    </div>
  </div>
);

const BenefitItem = ({ title, description }) => (
  <div className="flex">
    <div className="flex-shrink-0 mt-1">
      <svg className="h-5 w-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="ml-3">
      <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
      <p className="mt-1 text-gray-600">{description}</p>
    </div>
  </div>
);

const SmallFeatureCard = ({ icon, title, description }) => (
  <div className="bg-white p-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
    <div className="flex items-center mb-3">
      <div className="text-2xl mr-3">{icon}</div>
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
    </div>
    <p className="text-gray-600 text-sm">{description}</p>
  </div>
);

export default HomePage;