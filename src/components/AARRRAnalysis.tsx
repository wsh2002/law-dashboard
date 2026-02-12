import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DataItem } from '../App';
import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip, Cell } from 'recharts';
import { Users, MousePointerClick, Heart, Star, Share2, TrendingUp, Info, ThumbsUp } from 'lucide-react';
import { format, getQuarter, getYear } from 'date-fns';

interface AARRRAnalysisProps {
  data: DataItem[];
}

type TimeFilter = 'all' | 'quarterly' | 'monthly';

export const AARRRAnalysis = ({ data }: AARRRAnalysisProps) => {
  const [filterMode, setFilterMode] = useState<TimeFilter>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // 1. Extract available quarters and months from data
  const { availableQuarters, availableMonths } = useMemo(() => {
    if (!data || data.length === 0) return { availableQuarters: [], availableMonths: [] };

    const quarters = new Set<string>();
    const months = new Set<string>();

    data.forEach(item => {
      const date = item.parsedDate;
      const quarterStr = `${getYear(date)} Q${getQuarter(date)}`;
      const monthStr = format(date, 'yyyy-MM');
      quarters.add(quarterStr);
      months.add(monthStr);
    });

    return {
      availableQuarters: Array.from(quarters).sort().reverse(),
      availableMonths: Array.from(months).sort().reverse()
    };
  }, [data]);

  // Initialize selection if empty
  useMemo(() => {
    if (availableQuarters.length > 0 && !selectedQuarter) {
      setSelectedQuarter(availableQuarters[0]);
    }
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableQuarters, availableMonths]);

  // 2. Filter data based on selection
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (filterMode === 'all') return data;

    return data.filter(item => {
      const date = item.parsedDate;
      if (filterMode === 'quarterly') {
         const quarterStr = `${getYear(date)} Q${getQuarter(date)}`;
         return quarterStr === selectedQuarter;
      } else if (filterMode === 'monthly') {
         const monthStr = format(date, 'yyyy-MM');
         return monthStr === selectedMonth;
      }
      return true;
    });
  }, [data, filterMode, selectedQuarter, selectedMonth]);


  const analysis = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    // Aggregate data for AARRR metrics
    const totalViews = filteredData.reduce((acc, item) => acc + item.views, 0);
    const totalLikes = filteredData.reduce((acc, item) => acc + item.likes, 0);
    const totalComments = filteredData.reduce((acc, item) => acc + item.comments, 0);
    const totalNetFans = filteredData.reduce((acc, item) => acc + item.netFans, 0);
    const totalFavorites = filteredData.reduce((acc, item) => acc + item.favorites, 0);
    const totalShares = filteredData.reduce((acc, item) => acc + item.shares, 0);
    const totalRecommendations = filteredData.reduce((acc, item) => acc + (item.recommendationsCount || 0), 0);

    // Determine Revenue Stage Metric (Favorites vs Recommendations)
    // If Favorites is 0 (e.g. Video Number), try to use Recommendations
    const useRecommendations = totalFavorites === 0 && totalRecommendations > 0;
    
    const revenueStage = useRecommendations ? {
        name: 'Recommendation',
        label: '系统推荐',
        value: totalRecommendations,
        metric: '推荐量',
        icon: ThumbsUp,
        color: '#f59e0b', // amber-500
        desc: '被系统/用户推荐的总量'
    } : {
        name: 'Revenue',
        label: '变现潜力',
        value: totalFavorites,
        metric: '收藏量',
        icon: Star,
        color: '#f59e0b', // amber-500
        desc: '高意向咨询转化潜力'
    };

    // AARRR Stages Mapping
    const stages = [
      {
        name: 'Acquisition',
        label: '用户获取',
        value: totalViews,
        metric: '播放量',
        icon: Users,
        color: '#3b82f6', // blue-500
        desc: '曝光触达用户总量'
      },
      {
        name: 'Activation',
        label: '用户活跃',
        value: totalLikes + totalComments,
        metric: '赞评互动',
        icon: MousePointerClick,
        color: '#8b5cf6', // violet-500
        desc: '有效互动行为总量'
      },
      {
        name: 'Retention',
        label: '用户留存',
        value: totalNetFans,
        metric: '粉丝净增',
        icon: Heart,
        color: '#ec4899', // pink-500
        desc: '转化为关注用户'
      },
      revenueStage,
      {
        name: 'Referral',
        label: '自传播',
        value: totalShares,
        metric: '转发量',
        icon: Share2,
        color: '#10b981', // emerald-500
        desc: '用户自发传播推荐'
      }
    ];

    // Calculate conversion rates between stages for funnel visualization
    const funnelData = stages.map((stage, index) => {
      const prevValue = index === 0 ? stage.value : stages[index - 1].value;
      const conversionRate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(2) : '0';
      const percentOfViews = totalViews > 0 ? ((stage.value / totalViews) * 100).toFixed(2) : '0';
      
      return {
        ...stage,
        conversionRate,
        percentOfViews
      };
    });

    return funnelData;
  }, [filteredData]);

  if (!analysis) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">AARRR 用户生命周期模型分析</h3>
            <p className="text-xs text-gray-500">基于上传数据的全链路转化漏斗诊断</p>
          </div>
        </div>

        {/* Time Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
           <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterMode === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                全部
              </button>
              <button 
                onClick={() => setFilterMode('quarterly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterMode === 'quarterly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                按季度
              </button>
              <button 
                onClick={() => setFilterMode('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterMode === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                按月
              </button>
           </div>

           {/* Secondary Selector (Quarter/Month) */}
           {filterMode === 'quarterly' && (
             <select 
               value={selectedQuarter} 
               onChange={(e) => setSelectedQuarter(e.target.value)}
               className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 outline-none"
             >
               {availableQuarters.map(q => <option key={q} value={q}>{q}</option>)}
             </select>
           )}

            {filterMode === 'monthly' && (
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 outline-none"
              >
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {analysis.map((stage, index) => (
          <motion.div
            key={stage.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <div className={`
              h-full p-4 rounded-xl border-t-4 bg-gradient-to-b from-white to-gray-50
              hover:shadow-md transition-shadow duration-300
            `}
            style={{ borderColor: stage.color }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <stage.icon className="w-5 h-5" style={{ color: stage.color }} />
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {stage.name}
                  </span>
                </div>
              </div>
              
              <div className="mb-2">
                <h4 className="text-sm font-semibold text-gray-600">{stage.label}</h4>
                <div className="text-2xl font-bold text-gray-800 my-1">
                  {stage.value.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{stage.metric}</div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">转化率 (vs Views)</span>
                  <span className="font-medium" style={{ color: stage.color }}>
                    {stage.percentOfViews}%
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-1 leading-tight">
                  {stage.desc}
                </div>
              </div>
            </div>

            {/* Arrow connector for desktop */}
            {index < analysis.length - 1 && (
              <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                <div className="w-2 h-2 border-t border-r border-gray-300 transform rotate-45"></div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Funnel Chart */}
      <div className="mt-8 h-[400px] w-full bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
            <Info className="w-4 h-4" /> 
            漏斗转化可视化
        </h4>
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [value?.toLocaleString(), '数量']}
            />
            <Funnel
                dataKey="value"
                data={analysis}
                isAnimationActive
            >
                <LabelList 
                    position="right" 
                    fill="#000" 
                    stroke="none" 
                    dataKey="label" 
                    content={(props: any) => {
                        const { x, y, width, height, index } = props;
                        const item = analysis[index];
                        return (
                            <g>
                                <text x={x + width + 20} y={y + height / 2 - 8} fill="#374151" textAnchor="start" fontSize={14} fontWeight="bold">
                                    {item.label}
                                </text>
                                <text x={x + width + 20} y={y + height / 2 + 14} fill="#6b7280" textAnchor="start" fontSize={12}>
                                    {item.value.toLocaleString()} 
                                    {index > 0 && (
                                        <tspan fill={item.color} fontWeight="bold" dx="5">
                                            → 转化率: {item.conversionRate}%
                                        </tspan>
                                    )}
                                </text>
                            </g>
                        );
                    }}
                />
                {analysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
