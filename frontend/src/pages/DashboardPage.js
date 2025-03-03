import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { timeManagementApi } from '../api';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { useToast } from '../hooks/useToast';

// Charts for dashboard
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Icons
import { 
  HiOutlineClock, 
  HiOutlineClipboardCheck, 
  HiOutlineUserGroup, 
  HiOutlineCalendar,
  HiOutlineBell,
  HiOutlineDocumentText,
  HiArrowRight,
  HiOutlineCheckCircle,
  HiOutlineClock as HiOutlineClockAlarm
} from 'react-icons/hi';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    recentTasks: [],
    upcomingEvents: [],
    timeData: [],
    clientData: []
  });
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', '#FF6B6B'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // これらはモックデータなので、実際のAPIが実装されたら切り替える
      
      // 時間データを取得
      const timeSummary = await timeManagementApi.getDashboardSummary();
      
      // グラフデータ
      const timeChartData = await timeManagementApi.getChartData('time', 'week');
      
      // 最近のタスク - モックデータ
      const recentTasks = generateMockTasks(5);
      
      // 今後のイベント - モックデータ
      const upcomingEvents = generateMockEvents();
      
      // クライアントデータ - モックデータ
      const clientData = generateMockClients();
      
      // 実際のデータが取得できるものだけを使用し、
      // 取得できないものは空の配列やデフォルト値を設定
      
      // 既存のAPIから取得した時間データのみ実データを使用
      const formattedTimeData = timeChartData.labels.map((day, index) => ({
        name: day,
        hours: timeChartData.datasets[0].data[index]
      }));
            
      // データをまとめる
      setDashboardData({
        stats: {
          activeTasks: 0,  // 実データがないためゼロ表示
          completedTasks: 0, // 実データがないためゼロ表示
          clients: 0, // 実データがないためゼロ表示
          hoursTracked: Math.floor(timeSummary.this_month.hours)
        },
        recentTasks: [], // 実データがないため空配列
        upcomingEvents: [], // 実データがないため空配列
        timeData: formattedTimeData,
        clientData: [] // 実データがないため空配列
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showToast('ダッシュボードデータの取得中にエラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  // モックタスクデータの生成
  const generateMockTasks = (count) => {
    const statuses = ['Not Started', 'In Progress', 'In Review', 'Completed'];
    const priorities = ['High', 'Medium', 'Low'];
    const titles = [
      '顧客書類の更新',
      '四半期レポートの作成',
      'ウェブサイトデザインのレビュー',
      'クライアントミーティングの準備',
      '税務申告書の作成',
      '経理データの確認',
      '新規クライアントの提案書作成',
      '社内研修の資料作成',
      'プロジェクト計画の立案',
      'リスク評価の実施'
    ];

    const today = new Date();
    
    return Array.from({ length: count }, (_, i) => {
      const daysAhead = Math.floor(Math.random() * 14) - 3; // -3から10日先まで
      const dueDate = addDays(today, daysAhead);
      
      return {
        id: i + 1,
        title: titles[Math.floor(Math.random() * titles.length)],
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
      };
    }).sort((a, b) => {
      // 期限が近い順に並べる
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  };

  // モックイベントデータの生成
  const generateMockEvents = () => {
    const types = ['meeting', 'deadline', 'call'];
    const titles = [
      'チームミーティング',
      'プロジェクト期限',
      'クライアントコール',
      '四半期レビュー',
      'タスク期限',
      '部署会議',
      '定例ミーティング',
      '顧客訪問',
      'レポート提出期限',
      '社内研修'
    ];

    const today = new Date();
    
    return Array.from({ length: 4 }, (_, i) => {
      const daysAhead = Math.floor(Math.random() * 7);
      const eventDate = addDays(today, daysAhead);
      const hours = Math.floor(Math.random() * 9) + 9; // 9時〜17時
      const minutes = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
      
      let dateText;
      if (daysAhead === 0) {
        dateText = `今日 ${hours}:${minutes.toString().padStart(2, '0')}`;
      } else if (daysAhead === 1) {
        dateText = `明日 ${hours}:${minutes.toString().padStart(2, '0')}`;
      } else {
        dateText = `${format(eventDate, 'MM/dd')} ${hours}:${minutes.toString().padStart(2, '0')}`;
      }
      
      return {
        id: i + 1,
        title: titles[Math.floor(Math.random() * titles.length)],
        date: dateText,
        rawDate: eventDate,
        type: types[Math.floor(Math.random() * types.length)],
      };
    }).sort((a, b) => a.rawDate - b.rawDate); // 日付順に並べる
  };

  // モッククライアントデータの生成
  const generateMockClients = () => {
    const clientNames = [
      '株式会社テクノロジー',
      'グローバル商事',
      'スマート物流',
      'クリエイティブデザイン株式会社',
      'ヘルスケア研究所',
      'エコフレンドリー産業',
      'インテリジェントシステムズ'
    ];
    
    return clientNames.map((name, index) => ({
      id: index + 1,
      name,
      value: Math.floor(Math.random() * 50) + 10 // 作業時間
    }));
  };

  // 日付の表示フォーマット
  const formatDueDate = (dateString) => {
    const date = parseISO(dateString);
    const today = new Date();
    const diffDays = differenceInDays(date, today);
    
    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '明日';
    if (diffDays === -1) return '昨日';
    if (diffDays < -1) return `${Math.abs(diffDays)}日前`;
    if (diffDays > 1) return `${diffDays}日後`;
    
    return format(date, 'MM/dd');
  };

  // 期限切れかどうかの判定
  const isPastDue = (dateString) => {
    const date = parseISO(dateString);
    const today = new Date();
    return date < today;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 mb-8 shadow-md">
        <h2 className="text-2xl font-semibold mb-2">おかえりなさい、{currentUser?.first_name || 'User'}さん！</h2>
        <p>今日も素晴らしい一日にしましょう。今日のあなたのプロジェクト状況をお知らせします。</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-100 text-blue-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <HiOutlineClipboardCheck className="w-8 h-8 mr-3" />
            <div>
              <p className="font-medium">アクティブなタスク</p>
              <p className="text-3xl font-bold mt-1">{dashboardData.stats.activeTasks}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-100 text-green-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <HiOutlineCheckCircle className="w-8 h-8 mr-3" />
            <div>
              <p className="font-medium">完了したタスク</p>
              <p className="text-3xl font-bold mt-1">{dashboardData.stats.completedTasks}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-100 text-purple-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <HiOutlineUserGroup className="w-8 h-8 mr-3" />
            <div>
              <p className="font-medium">クライアント数</p>
              <p className="text-3xl font-bold mt-1">{dashboardData.stats.clients}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-100 text-red-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <HiOutlineClock className="w-8 h-8 mr-3" />
            <div>
              <p className="font-medium">今月の作業時間</p>
              <p className="text-3xl font-bold mt-1">{dashboardData.stats.hoursTracked}h</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Time Tracking Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">今週の作業時間</h3>
            <button 
              className="text-blue-600 hover:text-blue-800 flex items-center"
              onClick={() => navigate('/time-management')}
            >
              詳細を見る
              <HiArrowRight className="ml-1" />
            </button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.timeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value.toFixed(1)}時間`, '作業時間']} />
                <Legend />
                <Bar dataKey="hours" name="作業時間" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Client Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">クライアント別作業時間</h3>
            <button 
              className="text-blue-600 hover:text-blue-800 flex items-center"
              onClick={() => navigate('/clients')}
            >
              詳細を見る
              <HiArrowRight className="ml-1" />
            </button>
          </div>
          <div className="h-72 flex flex-col items-center justify-center">
            {dashboardData.clientData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.clientData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name.substring(0, 4)}... ${(percent * 100).toFixed(0)}%`}
                  >
                    {dashboardData.clientData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [
                    `${value}時間`, 
                    props.payload.name
                  ]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center">
                <HiOutlineUserGroup className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">クライアントデータはありません</p>
                <button 
                  className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                  onClick={() => navigate('/clients')}
                >
                  クライアントページへ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Task & Event Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">最近のタスク</h3>
              <button 
                className="text-blue-600 hover:text-blue-800 flex items-center"
                onClick={() => navigate('/tasks')}
              >
                すべて表示
                <HiArrowRight className="ml-1" />
              </button>
            </div>
            {dashboardData.recentTasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">タスク</th>
                      <th className="px-6 py-3">期限</th>
                      <th className="px-6 py-3">ステータス</th>
                      <th className="px-6 py-3">優先度</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dashboardData.recentTasks.map(task => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{task.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`${isPastDue(task.dueDate) && task.status !== 'Completed' ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                            {formatDueDate(task.dueDate)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            task.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                            task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'In Review' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status === 'Completed' ? '完了' : 
                             task.status === 'In Progress' ? '進行中' :
                             task.status === 'In Review' ? 'レビュー中' :
                             '未着手'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            task.priority === 'High' ? 'bg-red-100 text-red-800' : 
                            task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority === 'High' ? '高' : 
                             task.priority === 'Medium' ? '中' : '低'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <HiOutlineClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">最近のタスクはありません</p>
                <button 
                  className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                  onClick={() => navigate('/tasks')}
                >
                  タスクを作成する
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Upcoming Events */}
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">今後の予定</h3>
              <button 
                className="text-blue-600 hover:text-blue-800 flex items-center"
                onClick={() => navigate('/calendar')}
              >
                すべて表示
                <HiArrowRight className="ml-1" />
              </button>
            </div>
            {dashboardData.upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className={`rounded-full p-2 ${
                      event.type === 'meeting' ? 'bg-blue-100 text-blue-600' : 
                      event.type === 'deadline' ? 'bg-red-100 text-red-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {event.type === 'meeting' ? <HiOutlineCalendar className="w-5 h-5" /> : 
                       event.type === 'deadline' ? <HiOutlineClockAlarm className="w-5 h-5" /> : 
                       <HiOutlineBell className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-gray-600">{event.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <HiOutlineCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">予定はありません</p>
                <button 
                  className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                  onClick={() => navigate('/calendar')}
                >
                  カレンダーを見る
                </button>
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">クイックアクション</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg flex flex-col items-center transition-colors"
                onClick={() => navigate('/tasks/new')}
              >
                <HiOutlineClipboardCheck className="w-6 h-6 text-blue-600 mb-2" />
                <span className="text-sm">タスク作成</span>
              </button>
              
              <button 
                className="p-4 bg-green-50 hover:bg-green-100 rounded-lg flex flex-col items-center transition-colors"
                onClick={() => navigate('/time-management')}
              >
                <HiOutlineClock className="w-6 h-6 text-green-600 mb-2" />
                <span className="text-sm">時間記録</span>
              </button>
              
              <button 
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg flex flex-col items-center transition-colors"
                onClick={() => navigate('/clients')}
              >
                <HiOutlineUserGroup className="w-6 h-6 text-purple-600 mb-2" />
                <span className="text-sm">クライアント</span>
              </button>
              
              <button 
                className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg flex flex-col items-center transition-colors"
                onClick={() => navigate('/wiki')}
              >
                <HiOutlineDocumentText className="w-6 h-6 text-orange-600 mb-2" />
                <span className="text-sm">Wiki</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;