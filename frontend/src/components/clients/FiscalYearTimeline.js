import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, LabelList } from 'recharts';
import dayjs from 'dayjs';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded shadow-md">
        <p className="font-semibold">第{data.fiscal_period}期</p>
        <p>開始: {dayjs(data.start_date).format('YYYY年MM月DD日')}</p>
        <p>終了: {dayjs(data.end_date).format('YYYY年MM月DD日')}</p>
        <p>期間: {data.duration}日間</p>
        {data.description && <p className="border-t mt-2 pt-2">{data.description}</p>}
      </div>
    );
  }
  return null;
};

const FiscalYearTimeline = ({ fiscalYears }) => {
  // 日付データの前処理
  const timelineData = useMemo(() => {
    if (!fiscalYears || !fiscalYears.length) return [];
    
    return fiscalYears.map(year => {
      const startDate = dayjs(year.start_date);
      const endDate = dayjs(year.end_date);
      return {
        ...year,
        start: startDate.valueOf(), // ミリ秒タイムスタンプに変換
        end: endDate.valueOf(),
        duration: endDate.diff(startDate, 'day'),
        range: [startDate.valueOf(), endDate.valueOf()],
        name: `第${year.fiscal_period}期`
      };
    }).sort((a, b) => a.fiscal_period - b.fiscal_period);
  }, [fiscalYears]);
  
  // 現在日付
  const today = useMemo(() => dayjs().valueOf(), []);
  
  // Y軸のドメイン（期数の最小と最大）
  const yDomain = useMemo(() => {
    if (!timelineData.length) return [0, 1];
    const periods = timelineData.map(d => d.fiscal_period);
    return [Math.min(...periods) - 0.5, Math.max(...periods) + 0.5];
  }, [timelineData]);
  
  // X軸のドメイン（全体の日付範囲に余白を追加）
  const xDomain = useMemo(() => {
    if (!timelineData.length) return [today - 30 * 24 * 60 * 60 * 1000, today + 30 * 24 * 60 * 60 * 1000];
    
    const allDates = timelineData.flatMap(d => [d.start, d.end]);
    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);
    
    // 20%の余白を両端に追加
    const padding = (maxDate - minDate) * 0.1;
    return [minDate - padding, maxDate + padding];
  }, [timelineData, today]);
  
  // 表示するラベルのフォーマット
  const formatXAxis = (timestamp) => {
    return dayjs(timestamp).format('YYYY/MM');
  };
  
  if (!timelineData.length) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
        決算期情報が登録されていません
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">決算期タイムライン</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={timelineData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <XAxis 
              type="number" 
              dataKey="range" 
              domain={xDomain}
              tickFormatter={formatXAxis}
              allowDataOverflow
            />
            <YAxis 
              type="number" 
              dataKey="fiscal_period" 
              domain={yDomain}
              tickFormatter={value => `第${value}期`}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={today} stroke="#ff4040" label={{ value: '現在', position: 'top', fill: '#ff4040' }} />
            <Bar dataKey="range" fill="#8884d8" radius={[4, 4, 4, 4]} barSize={20}>
              <LabelList dataKey="name" position="insideLeft" fill="#fff" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* 残り日数表示 */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {timelineData
          .filter(d => d.end > today && d.start < today) // 現在進行中の期のみ
          .map(period => {
            const daysRemaining = Math.ceil(dayjs(period.end_date).diff(dayjs(), 'day', true));
            const progress = Math.min(100, Math.max(0, 
              (today - period.start) / (period.end - period.start) * 100
            ));
            
            return (
              <div key={period.id} className="bg-blue-50 p-3 rounded-lg">
                <p className="font-semibold">現在の決算期: 第{period.fiscal_period}期</p>
                <p>決算日まで残り: <span className="font-bold text-blue-600">{daysRemaining}日</span></p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-right mt-1">{Math.round(progress)}% 経過</p>
              </div>
            );
          })
        }
        
        {timelineData
          .filter(d => d.start > today) // 未来の期のみ
          .sort((a, b) => a.start - b.start) // 開始日順
          .slice(0, 1) // 最も近い未来の期のみ
          .map(period => {
            const daysUntilStart = Math.ceil(dayjs(period.start_date).diff(dayjs(), 'day', true));
            
            return (
              <div key={period.id} className="bg-green-50 p-3 rounded-lg">
                <p className="font-semibold">次の決算期: 第{period.fiscal_period}期</p>
                <p>開始まで残り: <span className="font-bold text-green-600">{daysUntilStart}日</span></p>
                <p className="text-sm mt-1">
                  {dayjs(period.start_date).format('YYYY年MM月DD日')} ~ {dayjs(period.end_date).format('YYYY年MM月DD日')}
                </p>
              </div>
            );
          })
        }
      </div>
    </div>
  );
};

export default FiscalYearTimeline;