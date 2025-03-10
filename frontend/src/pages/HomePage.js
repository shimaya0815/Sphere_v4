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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white font-sans">
      <header className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="text-3xl font-bold text-blue-600">Sphere</div>
          <div className="space-x-4">
            {isAuthenticated() ? (
              <Link 
                to="/dashboard" 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                ダッシュボード
              </Link>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="px-6 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                >
                  ログイン
                </Link>
                <Link 
                  to="/register" 
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  新規登録
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight">
              業務効率化を実現する<br />ビジネス管理プラットフォーム
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              タスク管理・顧客管理・チームコミュニケーション・時間管理を一つのプラットフォームで実現。業務フローを最適化し、生産性を向上させます。
            </p>
            <div className="space-x-4">
              {isAuthenticated() ? (
                <Link 
                  to="/dashboard" 
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-lg font-medium"
                >
                  ダッシュボードへ
                </Link>
              ) : (
                <Link 
                  to="/register" 
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-lg font-medium"
                >
                  無料で始める
                </Link>
              )}
            </div>
          </div>
          <div className="relative">
            <div className="rounded-xl bg-white shadow-xl p-6 border border-gray-100">
              <div className="bg-blue-50 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
                <h3 className="font-bold text-blue-800">タスク管理</h3>
                <p className="text-blue-700 mt-2">プロジェクトやタスクを一元管理し、進捗状況を可視化</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 mb-4 border-l-4 border-green-500">
                <h3 className="font-bold text-green-800">顧客管理</h3>
                <p className="text-green-700 mt-2">顧客情報や対応履歴を一元管理し、適切なフォローアップを実現</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 mb-4 border-l-4 border-purple-500">
                <h3 className="font-bold text-purple-800">チャット機能</h3>
                <p className="text-purple-700 mt-2">リアルタイムコミュニケーションでチーム連携を強化</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                <h3 className="font-bold text-red-800">時間管理</h3>
                <p className="text-red-700 mt-2">業務時間の記録・分析で業務効率化を促進</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            ビジネスに必要な機能をすべて集約
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon="✅" 
              title="タスク管理" 
              description="カスタマイズ可能なワークフローでタスクを作成・割り当て・追跡"
            />
            <FeatureCard 
              icon="👥" 
              title="顧客管理" 
              description="顧客情報、書類、プロジェクト詳細を一元管理"
            />
            <FeatureCard 
              icon="💬" 
              title="チームチャット" 
              description="チャンネルやダイレクトメッセージでファイル共有も可能"
            />
            <FeatureCard 
              icon="⏱️" 
              title="時間管理" 
              description="勤務時間の追跡と詳細なレポート生成"
            />
            <FeatureCard 
              icon="📝" 
              title="ドキュメント管理" 
              description="社内ナレッジベースの作成と共有"
            />
            <FeatureCard 
              icon="🔔" 
              title="通知機能" 
              description="リアルタイムアラートとリマインダーで重要な情報を把握"
            />
            <FeatureCard 
              icon="📊" 
              title="レポート・分析" 
              description="カスタマイズ可能なチャートとダッシュボードでデータを視覚化"
            />
            <FeatureCard 
              icon="🔐" 
              title="権限管理" 
              description="ロールベースの権限設定でアクセス制御を強化"
            />
          </div>
        </div>
      </section>

      <footer className="bg-slate-800 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-8 md:mb-0">
              <div className="text-2xl font-bold mb-4">Sphere</div>
              <p className="text-gray-300 max-w-xs">
                あらゆる規模のチームに最適な、業務効率化のためのビジネス管理ツール
              </p>
              <div className="mt-6 flex space-x-4">
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">製品情報</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><a href="#" className="hover:text-white transition-colors">機能一覧</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">料金プラン</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">連携サービス</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">アップデート履歴</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">会社情報</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><a href="#" className="hover:text-white transition-colors">企業概要</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">ブログ</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">採用情報</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">お問い合わせ</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">法的情報</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">利用規約</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">セキュリティ</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-12 pt-8 text-gray-300 text-sm">
            &copy; {new Date().getFullYear()} Sphere. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100">
    <div className="flex items-center mb-4">
      <div className="text-2xl p-2 rounded-lg bg-blue-50 text-blue-600">{icon}</div>
      <h3 className="text-lg font-bold ml-3 text-gray-800">{title}</h3>
    </div>
    <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    <div className="mt-4 pt-2 border-t border-gray-100">
      <a href="#" className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center">
        詳細を見る
        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </a>
    </div>
  </div>
);

export default HomePage;