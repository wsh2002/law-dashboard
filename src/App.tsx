import React, { useState, useMemo, useEffect, useCallback, ChangeEvent, lazy, Suspense } from 'react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
// import { MOCK_DATA } from './data/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ComposedChart, ScatterChart, Scatter, ZAxis, ReferenceLine
} from 'recharts';
import { Upload, Calendar, ArrowUp, ArrowDown, FileSpreadsheet, TrendingUp, Activity, Heart, GitMerge, Sparkles, Play, MessageCircle, Share2, Users, Search } from 'lucide-react';
// @ts-ignore
import ReactWordcloud from 'react-wordcloud';
import { format, parse, addDays, isValid, startOfDay, subDays, startOfMonth, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { cn } from './lib/utils';


// 懒加载组件
const ViralVideosSection = lazy(() => import('./components/ViralVideosSection'));
const AARRRAnalysis = lazy(() => import('./components/AARRRAnalysis'));
const AIAnalysisCard = lazy(() => import('./components/AIAnalysisCard'));
const AnimatedBackground = lazy(() => import('./components/AnimatedBackground'));
const Login = lazy(() => import('./components/Login'));
const PlatformChartsWrapper = lazy(() => import('./components/PlatformChartsWrapper'));

// Custom Tooltip for comparison charts
const ComparisonTooltip = React.memo(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const compareDate = payload[0]?.payload?.compareDate;
        return (
            <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200/50 min-w-[180px]">
                <p className="font-bold text-gray-800 mb-1">{`当前: ${label}`}</p>
                {compareDate && compareDate !== 'N/A' && (
                   <p className="font-semibold text-gray-500 text-sm mb-2">{`对比: ${compareDate}`}</p>
                )}
                {payload.map((p: any, index: number) => (
                    <p key={index} style={{ color: p.color }} className="text-sm font-medium flex justify-between">
                        <span>{p.name}:</span>
                        <span>{p.value.toLocaleString()}{p.unit || ''}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
});

const VideoTooltip = React.memo(({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200/50 min-w-[200px]">
                <p className="font-bold text-gray-800">{data.x}</p>
                <p className="text-sm text-gray-600 truncate max-w-xs" title={data.title}>{data.title}</p>
                <hr className="my-2" />
                <p className="text-sm font-bold" style={{ color: payload[0].fill }}>类型: {data.category}</p>
                <p className="text-sm" style={{ color: '#333' }}>播放量: {data.y.toLocaleString()}</p>
                <p className="text-sm" style={{ color: '#333' }}>互动率: {data.z.toFixed(2)}%</p>
            </div>
        );
    }
    return null;
});

// Types
export type DataItem = {
  date: string; // YYYY/M/D
  lawyer: string;
  account: string;
  fans: number;
  type: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  favorites: number;
  shares: number;
  netFans: number;
  fanLikeRatio: string;
  completionRate: string;
  recommendationsCount?: number;
  interactionRate: number; // Calculated: (likes+comments+shares)/views
  parsedDate: Date;
  platform?: 'douyin' | 'kuaishou' | 'wechat';
};



// Helper to parse raw data
const parseData = (raw: any[], platform?: 'douyin' | 'kuaishou' | 'wechat'): DataItem[] => {
  return raw.map(item => {
    const dateStr = item['日期'] || item['Date'];
    // Handle Excel serial date
    let parsedDate = new Date();
    try {
        if (typeof dateStr === 'number') {
            // Excel Serial Date
            // Use Math.floor to ignore time part and avoid timezone shifting issues
            // Excel base date: 1899-12-30.
            // 1 day = 86400000 ms.
            // We calculate the UTC timestamp for the given serial date at 00:00:00 UTC.
            const serial = Math.floor(dateStr); 
            // 25569 is offset between 1970-01-01 and 1899-12-30
            const utcDays = serial - 25569;
            const utcTimestamp = utcDays * 86400 * 1000;
            
            // Create a date object that represents this exact moment in UTC
            const dateObj = new Date(utcTimestamp);
            
            // Now, we want to treat this "UTC date" as the local date displayed in Excel.
            // e.g. if Excel says "2025-07-07", we want "2025-07-07" regardless of browser timezone.
            // So we extract UTC parts and construct a local date string.
            const year = dateObj.getUTCFullYear();
            const month = dateObj.getUTCMonth();
            const day = dateObj.getUTCDate();
            
            // Construct a local date at 00:00:00 to avoid timezone shifts when formatting
            parsedDate = new Date(year, month, day);
            
        } else if (!isNaN(Number(dateStr))) {
             // String that looks like a number
            const serial = Math.floor(Number(dateStr));
            const utcDays = serial - 25569;
            const utcTimestamp = utcDays * 86400 * 1000;
            const dateObj = new Date(utcTimestamp);
            parsedDate = new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());
        } else {
            // Robust multi-format string parsing
            const dateString = String(dateStr).trim();
            // Try common formats
            const formats = [
                'yyyy/M/d', 
                'yyyy-M-d', 
                'yyyy.M.d', 
                'yyyy年M月d日',
                'M/d/yyyy',
                'd-MMM-yyyy'
            ];
            
            let isValidDate = false;
            for (const fmt of formats) {
                const d = parse(dateString, fmt, new Date());
                if (isValid(d)) {
                    parsedDate = startOfDay(d);
                    isValidDate = true;
                    break;
                }
            }
            
            if (!isValidDate) {
                // Fallback to native parser
                parsedDate = startOfDay(new Date(dateString));
            }
        }
    } catch (e) {
        console.error("Date parse error", dateStr);
    }

    const views = Number(item['视频播放量'] || item['Views'] || 0);
    const likes = Number(item['点赞量'] || item['Likes'] || 0);
    const comments = Number(item['评论量'] || item['Comments'] || 0);
    const shares = Number(item['转发量'] || item['Shares'] || 0);
    const interactionRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;

    const formatPercentage = (val: any): string => {
        if (typeof val === 'number') {
            // Check if it's a decimal (e.g. 0.5) or percentage value (e.g. 50)
            // Heuristic: if <= 1, assume decimal. If > 1, assume percentage value? 
            // Actually, in Excel, 50% is stored as 0.5. So multiplying by 100 is usually correct.
            // But if user entered 50 manually, it might be 50.
            // Let's assume standard Excel behavior: 0.5 -> 50%
            return (val * 100).toFixed(2) + '%';
        }
        return val ? String(val) : '0%';
    };

    return {
      date: format(parsedDate, 'yyyy-MM-dd'),
      lawyer: item['律师名称'] || item['Lawyer Name'],
      account: item['账号名称'] || item['Account Name'],
      fans: Number(item['累计粉丝量'] || item['Total Fans'] || 0),
      type: item['视频类型'] || item['Video Type'],
      title: item['视频标题'] || item['Video Title'],
      views,
      likes,
      comments,
      favorites: Number(item['收藏量'] || item['Favorites'] || 0),
      shares,
      netFans: Number(item['粉丝净增量'] || item['粉丝净增'] || item['Net Fan Increase'] || 0),
      recommendationsCount: Number(item['推荐量'] || item['Recommendations'] || 0),
      fanLikeRatio: formatPercentage(item['粉赞比'] || item['Fan/Like Ratio']),
      completionRate: formatPercentage(item['视频完播率'] || item['Completion Rate']),
      interactionRate,
      parsedDate,
      platform
    };
  }).filter(item => isValid(item.parsedDate)); // Filter invalid dates
};





export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? 'guest';
  const stateKey = `lawDashboardState_${userId}`;

  // 从 localStorage 加载状态，如果没有则使用默认值
  const loadState = () => {
    try {
      const savedState = localStorage.getItem(stateKey);
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (error) {
      console.error('Error loading state from localStorage:', error);
    }
    return null;
  };

  // 保存状态到 localStorage
  const saveState = (state: any) => {
    try {
      localStorage.setItem(stateKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state to localStorage:', error);
    }
  };

  // 加载保存的状态或使用默认值
  const savedState = loadState();
  const [data, setData] = useState<DataItem[]>([]);
  const [platformData, setPlatformData] = useState<Record<string, DataItem[]>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<'douyin' | 'kuaishou' | 'wechat'>('douyin');
  // 月份筛选状态

  const [tabPlatforms, setTabPlatforms] = useState<Record<string, 'douyin' | 'kuaishou' | 'wechat'>>({
    overview: 'douyin',
    monthly: 'douyin',
    range: 'douyin',
    personal: 'douyin',
    viral: 'douyin'
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'range' | 'personal' | 'viral' | 'platform'>('overview');
  

  
  // Dynamic today reference for initial states
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const lastWeekStr = format(subDays(today, 7), 'yyyy-MM-dd');
  const thisMonthStr = format(today, 'yyyy-MM');
  const lastMonthStr = format(subMonths(today, 1), 'yyyy-MM');

  // Data Date Range State
  const [dataDateRange, setDataDateRange] = useState<{ start: string, end: string } | null>(savedState?.dataDateRange || null);

  // Analysis Visibility State
  const [showAnalysis, setShowAnalysis] = useState(savedState?.showAnalysis || false);

  // Platform-specific time ranges
  const [platformTimeRanges, setPlatformTimeRanges] = useState<Record<string, {
    trendRange: { start: string; end: string };
    trendMode: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    viewsTrendRange: { start: string; end: string };
    viewsTrendMode: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    aiDateRange: { start: string; end: string };
    monthA: string;
    monthB: string;
    selectedMonthForVideos: string;
    dateRange: { start: string; end: string };
    compareRange: { start: string; end: string };
  }>>({ 
    douyin: savedState?.platformTimeRanges?.douyin || {
      trendRange: { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr },
      trendMode: 'weekly',
      viewsTrendRange: { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr },
      viewsTrendMode: 'weekly',
      aiDateRange: { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr },
      monthA: lastMonthStr,
      monthB: thisMonthStr,
      selectedMonthForVideos: thisMonthStr,
      dateRange: { start: lastWeekStr, end: todayStr },
      compareRange: { start: format(subDays(today, 14), 'yyyy-MM-dd'), end: format(subDays(today, 8), 'yyyy-MM-dd') }
    },
    kuaishou: savedState?.platformTimeRanges?.kuaishou || {
      trendRange: { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr },
      trendMode: 'weekly',
      viewsTrendRange: { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr },
      viewsTrendMode: 'weekly',
      aiDateRange: { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr },
      monthA: lastMonthStr,
      monthB: thisMonthStr,
      selectedMonthForVideos: thisMonthStr,
      dateRange: { start: lastWeekStr, end: todayStr },
      compareRange: { start: format(subDays(today, 14), 'yyyy-MM-dd'), end: format(subDays(today, 8), 'yyyy-MM-dd') }
    },
    wechat: savedState?.platformTimeRanges?.wechat || {
      trendRange: { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr },
      trendMode: 'weekly',
      viewsTrendRange: { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr },
      viewsTrendMode: 'weekly',
      aiDateRange: { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr },
      monthA: lastMonthStr,
      monthB: thisMonthStr,
      selectedMonthForVideos: thisMonthStr,
      dateRange: { start: lastWeekStr, end: todayStr },
      compareRange: { start: format(subDays(today, 14), 'yyyy-MM-dd'), end: format(subDays(today, 8), 'yyyy-MM-dd') }
    }
  });

  // Get current platform's time ranges
  const currentTimeRanges = platformTimeRanges[selectedPlatform] || platformTimeRanges.douyin;
  const { trendRange, trendMode, viewsTrendRange, viewsTrendMode, aiDateRange, monthA, monthB, selectedMonthForVideos, dateRange, compareRange } = currentTimeRanges;

  // 当状态变化时保存到 localStorage
  useEffect(() => {
    saveState({
      dataDateRange,
      showAnalysis,
      platformTimeRanges,
      tabPlatforms
    });
  }, [dataDateRange, showAnalysis, platformTimeRanges, tabPlatforms]);

  // 当切换标签页时，更新 selectedPlatform；若当前平台无数据则自动切到有数据的平台
  useEffect(() => {
    const platform = tabPlatforms[activeTab];
    const allKeys: ('douyin' | 'kuaishou' | 'wechat')[] = ['douyin', 'kuaishou', 'wechat'];
    const hasCurrent = platformData[platform]?.length > 0;
    if (!hasCurrent) {
      const fallback = allKeys.find(p => platformData[p]?.length > 0);
      if (fallback) {
        setTabPlatforms(() => Object.fromEntries(allKeys.map(k => [k, fallback])) as Record<string, 'douyin' | 'kuaishou' | 'wechat'>);
        setSelectedPlatform(fallback);
        return;
      }
    }
    setSelectedPlatform(platform);
  }, [activeTab, tabPlatforms, platformData]);

  // 平台选择处理函数
  const handlePlatformSelect = useCallback(async (platform: 'douyin' | 'kuaishou' | 'wechat') => {
    setTabPlatforms(prev => ({
      ...prev,
      [activeTab]: platform
    }));
    
    // 直接更新selectedPlatform，确保立即生效
    setSelectedPlatform(platform);
  }, [activeTab]);

  // Platform-specific setters
  const setPlatformTrendRange = (range: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => {
    setPlatformTimeRanges(prev => {
      const currentPlatformData = prev[selectedPlatform] || prev.douyin;
      const newRange = typeof range === 'function' ? range(currentPlatformData.trendRange) : range;
      return {
        ...prev,
        [selectedPlatform]: {
          ...currentPlatformData,
          trendRange: newRange
        }
      };
    });
  };

  // Auto adjust date ranges when platform changes
  useEffect(() => {
    const platformDataList = platformData[selectedPlatform] || [];
    if (platformDataList.length > 0) {
      const dates = platformDataList.map(d => d.parsedDate.getTime()).sort((a, b) => a - b);
      const minDate = new Date(dates[0]);
      const maxDate = new Date(dates[dates.length - 1]);
      const midDate = new Date(dates[Math.floor(dates.length / 2)]);
      
      const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
      
      // Update date ranges for the current platform
      setPlatformDateRange({ start: fmt(minDate), end: fmt(midDate) });
      setPlatformCompareRange({ start: fmt(addDays(midDate, 1)), end: fmt(maxDate) });
    }
  }, [selectedPlatform, platformData]);

  const setPlatformTrendMode = (mode: 'daily' | 'weekly' | 'monthly' | 'quarterly') => {
    setPlatformTimeRanges(prev => {
      const currentPlatformData = prev[selectedPlatform] || prev.douyin;
      return {
        ...prev,
        [selectedPlatform]: {
          ...currentPlatformData,
          trendMode: mode
        }
      };
    });
  };

  const setPlatformViewsTrendRange = (range: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => {
    setPlatformTimeRanges(prev => {
      const currentPlatformData = prev[selectedPlatform] || prev.douyin;
      const newRange = typeof range === 'function' ? range(currentPlatformData.viewsTrendRange) : range;
      return {
        ...prev,
        [selectedPlatform]: {
          ...currentPlatformData,
          viewsTrendRange: newRange
        }
      };
    });
  };

  const setPlatformViewsTrendMode = (mode: 'daily' | 'weekly' | 'monthly' | 'quarterly') => {
    setPlatformTimeRanges(prev => {
      const currentPlatformData = prev[selectedPlatform] || prev.douyin;
      return {
        ...prev,
        [selectedPlatform]: {
          ...currentPlatformData,
          viewsTrendMode: mode
        }
      };
    });
  };

  const setPlatformAiDateRange = (range: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => {
    setPlatformTimeRanges(prev => {
      const currentPlatformData = prev[selectedPlatform] || prev.douyin;
      const newRange = typeof range === 'function' ? range(currentPlatformData.aiDateRange) : range;
      return {
        ...prev,
        [selectedPlatform]: {
          ...currentPlatformData,
          aiDateRange: newRange
        }
      };
    });
  };

  // Month comparison setters
  const setPlatformMonthA = (month: string) => {
    setPlatformTimeRanges(prev => {
      const currentPlatformData = prev[selectedPlatform] || prev.douyin;
      return {
        ...prev,
        [selectedPlatform]: {
          ...currentPlatformData,
          monthA: month
        }
      };
    });
  };

  const setPlatformMonthB = (month: string) => {
    setPlatformTimeRanges(prev => {
      const currentPlatformData = prev[selectedPlatform] || prev.douyin;
      return {
        ...prev,
        [selectedPlatform]: {
          ...currentPlatformData,
          monthB: month
        }
      };
    });
  };

  const setPlatformSelectedMonthForVideos = (month: string) => {
    setPlatformTimeRanges(prev => {
      const currentPlatformData = prev[selectedPlatform] || prev.douyin;
      return {
        ...prev,
        [selectedPlatform]: {
          ...currentPlatformData,
          selectedMonthForVideos: month
        }
      };
    });
  };

  // Date range setters
  const setPlatformDateRange = (range: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => {
    setPlatformTimeRanges(prev => {
      const currentPlatformData = prev[selectedPlatform] || prev.douyin;
      const newRange = typeof range === 'function' ? range(currentPlatformData.dateRange) : range;
      return {
        ...prev,
        [selectedPlatform]: {
          ...currentPlatformData,
          dateRange: newRange
        }
      };
    });
  };

  const setPlatformCompareRange = (range: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => {
    setPlatformTimeRanges(prev => {
      const currentPlatformData = prev[selectedPlatform] || prev.douyin;
      const newRange = typeof range === 'function' ? range(currentPlatformData.compareRange) : range;
      return {
        ...prev,
        [selectedPlatform]: {
          ...currentPlatformData,
          compareRange: newRange
        }
      };
    });
  };

  const [topVideosMode, setTopVideosMode] = useState<'range' | 'month'>('range');
  const [showPlatformComparison, setShowPlatformComparison] = useState<boolean>(false);
  const [comparePlatform, setComparePlatform] = useState<'douyin' | 'kuaishou' | 'wechat'>('douyin');
  const [platformCompareMode, setPlatformCompareMode] = useState<'overall' | 'monthly'>('overall');
  const [selectedCompareMonth, setSelectedCompareMonth] = useState<string>('');

  // 计算可用的月份
  const availableMonths = useMemo(() => {
    const allMonths = new Set<string>();
    Object.values(platformData).forEach(items => {
      items.forEach(item => {
        allMonths.add(format(item.parsedDate, 'yyyy-MM'));
      });
    });
    return Array.from(allMonths).sort().reverse();
  }, [platformData]);

  // 当可用月份变化时，更新选中的月份
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedCompareMonth) {
      setSelectedCompareMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedCompareMonth]);

  const [detailTrendMode, setDetailTrendMode] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily');

  // User Name extracted from file
  const [userNames, setUserNames] = useState<Record<string, string>>({});



  // File Upload Handler
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 收集所有文件的数据
    const allParsedData: DataItem[] = [];
    const allUserNames: Record<string, string> = {};
    let firstPlatform: 'douyin' | 'kuaishou' | 'wechat' | undefined;

    // 处理单个文件的函数
    const processFile = (file: File, index: number): Promise<void> => {
        return new Promise((resolve) => {
            // Extract name from filename
            // Logic: Take part before "的", or filename without extension if "的" not present
            const filename = file.name;
            let name = filename.substring(0, filename.lastIndexOf('.')); // Remove extension
            if (name.includes('的')) {
                name = name.split('的')[0];
            }
            // Extract platform from filename
            let platform: 'douyin' | 'kuaishou' | 'wechat' | undefined;
            if (filename.includes('抖音')) {
                platform = 'douyin';
            } else if (filename.includes('快手')) {
                platform = 'kuaishou';
            } else if (filename.includes('视频号')) {
                platform = 'wechat';
            }
            
            // Store user name for each platform
            if (platform) {
                allUserNames[platform] = name;
            }
            
            // Set the first extracted platform as the current selected platform
            if (platform && index === 0) {
                firstPlatform = platform;
            }

            const reader = new FileReader();
            reader.onload = (evt) => {
              const arrayBuffer = evt.target?.result as ArrayBuffer;
              const wb = XLSX.read(arrayBuffer, { type: 'array' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const rawData = XLSX.utils.sheet_to_json(ws);
              const parsedData = parseData(rawData, platform);
              
              if (parsedData.length > 0) {
                  allParsedData.push(...parsedData);
              }
              resolve();
            };
            reader.readAsArrayBuffer(file as Blob);
        });
    };

    // 处理所有文件
    await Promise.all(Array.from(files).map((file, index) => processFile(file, index)));

    // 处理所有数据
    if (allParsedData.length > 0) {
        // 按平台分组数据
        const groupedData: Record<string, DataItem[]> = {
            douyin: [],
            kuaishou: [],
            wechat: []
        };
        
        allParsedData.forEach(item => {
            if (item.platform) {
                groupedData[item.platform].push(item);
            }
        });
        
        // 更新用户名称
        setUserNames(allUserNames);
        
        // 更新数据
        setData(allParsedData);
        setPlatformData(groupedData);
        
        // 设置默认平台
        if (firstPlatform) {
            handlePlatformSelect(firstPlatform);
        }
        
        // 自动调整日期范围 - 针对所有平台
        const allDates = allParsedData.map(d => d.parsedDate.getTime()).sort((a, b) => a - b);
        if (allDates.length > 0) {
            const minDate = new Date(allDates[0]);
            const maxDate = new Date(allDates[allDates.length - 1]);
            const midDate = new Date(allDates[Math.floor(allDates.length / 2)]);
            
            const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
            
            // 更新整体数据日期范围
            setDataDateRange({ start: fmt(minDate), end: fmt(maxDate) });
            
            // 更新所有平台的日期范围
            const fullRange = { start: fmt(minDate), end: fmt(maxDate) };
            
            // 为每个平台更新日期范围
            setPlatformTimeRanges(prev => {
                const newRanges = { ...prev };
                
                Object.keys(groupedData).forEach(platform => {
                    const platformKey = platform as 'douyin' | 'kuaishou' | 'wechat';
                    const platformData = groupedData[platformKey];
                    
                    if (platformData.length > 0) {
                        // 更新月度比较默认值
                        const months = Array.from(new Set(platformData.map(d => format(d.parsedDate, 'yyyy-MM')))).sort();
                        const monthA = months.length > 0 ? months[0] : lastMonthStr;
                        const monthB = months.length > 1 ? months[months.length - 1] : thisMonthStr;
                        const selectedMonthForVideos = months.length > 0 ? months[0] : thisMonthStr;
                        
                        newRanges[platformKey] = {
                            ...newRanges[platformKey],
                            trendRange: fullRange,
                            trendMode: 'daily',
                            viewsTrendRange: fullRange,
                            viewsTrendMode: 'daily',
                            aiDateRange: fullRange,
                            monthA,
                            monthB,
                            selectedMonthForVideos,
                            dateRange: fullRange,
                            compareRange: { start: fmt(addDays(midDate, 1)), end: fmt(maxDate) }
                        };
                    }
                });
                
                return newRanges;
            });
            
            // 确保第一个平台的选择正确
            if (firstPlatform) {
                handlePlatformSelect(firstPlatform);
            }
        }
        
        // 上传数据后自动显示分析内容
        setShowAnalysis(true);

        // 找到第一个有数据的平台
        const allPlatformKeys: ('douyin' | 'kuaishou' | 'wechat')[] = ['douyin', 'kuaishou', 'wechat'];
        const targetPlatform = firstPlatform || allPlatformKeys.find(p => groupedData[p]?.length > 0);

        if (targetPlatform) {
            // 把所有 tab 都同步到这个平台，避免切换 tab 时平台不一致
            setTabPlatforms({
                overview: targetPlatform,
                monthly: targetPlatform,
                range: targetPlatform,
                personal: targetPlatform,
                viral: targetPlatform
            });
            setSelectedPlatform(targetPlatform);
        }

        // 如果没有识别到任何平台数据，提示用户检查文件名
        const totalLoaded = Object.values(groupedData).reduce((sum, arr) => sum + arr.length, 0);
        if (totalLoaded === 0) {
            alert('未能识别平台数据。\n\n请确保文件名包含平台名称，例如：\n• 抖音数据.xlsx\n• 快手数据.csv\n• 视频号数据.xlsx');
        }
    }
  };

  // --- Range Analysis Logic ---  
  // Filter Data
  const currentData = useMemo(() => {
    const start = parse(dateRange.start, 'yyyy-MM-dd', new Date());
    const end = parse(dateRange.end, 'yyyy-MM-dd', new Date());
    // Include end date fully
    end.setHours(23, 59, 59, 999);
    let filteredData = (platformData[selectedPlatform] || []).filter(d => {
      const dateMatch = d.parsedDate >= start && d.parsedDate <= end;
      return dateMatch;
    });
    
    return filteredData;
  }, [platformData, dateRange, selectedPlatform]);

  // Visibility Flags based on dataset content
  const hasFavorites = useMemo(() => currentData.some(d => d.favorites > 0), [currentData]);
  const hasRecommendations = useMemo(() => currentData.some(d => (d.recommendationsCount || 0) > 0), [currentData]);

  const compareData = useMemo(() => {
    const start = parse(compareRange.start, 'yyyy-MM-dd', new Date());
    const end = parse(compareRange.end, 'yyyy-MM-dd', new Date());
    end.setHours(23, 59, 59, 999);
    let filteredData = (platformData[selectedPlatform] || []).filter(d => {
      const dateMatch = d.parsedDate >= start && d.parsedDate <= end;
      return dateMatch;
    });
    
    return filteredData;
  }, [platformData, compareRange, selectedPlatform]);

  // AI Analysis Data Filtering
  const aiData = useMemo(() => {
    const start = parse(aiDateRange.start, 'yyyy-MM-dd', new Date());
    const end = parse(aiDateRange.end, 'yyyy-MM-dd', new Date());
    end.setHours(23, 59, 59, 999);
    return (platformData[selectedPlatform] || []).filter(d => {
      const dateMatch = d.parsedDate >= start && d.parsedDate <= end;
      return dateMatch;
    });
  }, [platformData, aiDateRange, selectedPlatform]);

  // Helper for trend aggregation
  const getTrendData = (targetRange: {start: string, end: string}, targetMode: 'daily' | 'weekly' | 'monthly' | 'quarterly') => {
    const start = parse(targetRange.start, 'yyyy-MM-dd', new Date());
    const end = parse(targetRange.end, 'yyyy-MM-dd', new Date());
    end.setHours(23, 59, 59, 999);
    
    // Filter raw data
    const filtered = (platformData[selectedPlatform] || []).filter(d => {
      const dateMatch = d.parsedDate >= start && d.parsedDate <= end;
      return dateMatch;
    });
    
    // Aggregate data
    const grouped: Record<string, any> = {};
    filtered.forEach(item => {
        let d = '';
        if (targetMode === 'daily') {
             d = format(item.parsedDate, 'yyyy-MM-dd');
        } else if (targetMode === 'weekly') {
             // Weekly aggregation
             const weekStart = startOfWeek(item.parsedDate, { weekStartsOn: 1 });
             d = format(weekStart, 'yyyy-MM-dd');
        } else if (targetMode === 'monthly') {
             d = format(item.parsedDate, 'yyyy-MM');
        } else {
             // Quarterly
             d = format(item.parsedDate, 'yyyy-QQQ');
        }
            
        if (!grouped[d]) {
            grouped[d] = {
                date: d,
                views: 0,
                likes: 0,
                comments: 0,
                shares: 0,
                favorites: 0,
                recommendations: 0,
                fans: item.fans, // Snapshot for daily, but for monthly we need logic
                netFans: 0
            };
        }
        grouped[d].views += item.views;
        grouped[d].likes += item.likes;
        grouped[d].comments += item.comments;
        grouped[d].shares += item.shares;
        grouped[d].favorites += item.favorites;
        grouped[d].recommendations += (item.recommendationsCount || 0);
        grouped[d].netFans += item.netFans;
        
        // For 'fans' (cumulative), we usually want the value at the end of the period.
        grouped[d].fans = Math.max(grouped[d].fans, item.fans); 
    });

    let result = Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
    
    return result;
  };

  // Trend Chart Data (Filtered by trendRange)
  const trendData = useMemo(() => getTrendData(trendRange, trendMode), [platformData, trendRange, trendMode, selectedPlatform]);
  
  // Views Trend Chart Data (Independent)
  const viewsTrendData = useMemo(() => getTrendData(viewsTrendRange, viewsTrendMode), [platformData, viewsTrendRange, viewsTrendMode, selectedPlatform]);

  // Aggregations
  const getKPIs = (dataset: DataItem[]) => {
    const views = dataset.reduce((acc, cur) => acc + cur.views, 0);
    const count = dataset.length;
    return {
      views,
      likes: dataset.reduce((acc, cur) => acc + cur.likes, 0),
      comments: dataset.reduce((acc, cur) => acc + cur.comments, 0),
      shares: dataset.reduce((acc, cur) => acc + cur.shares, 0),
      netFans: dataset.reduce((acc, cur) => acc + cur.netFans, 0),
      favorites: dataset.reduce((acc, cur) => acc + cur.favorites, 0),
      recommendations: dataset.reduce((acc, cur) => acc + (cur.recommendationsCount || 0), 0),
      avgCompletionRate: count ? dataset.reduce((acc, cur) => acc + parseFloat(cur.completionRate.replace('%', '')), 0) / count : 0,
      avgInteractionRate: count ? dataset.reduce((acc, cur) => acc + cur.interactionRate, 0) / count : 0,
    };
  };

  const currentKPIs = useMemo(() => getKPIs(currentData), [currentData]);
  const compareKPIs = useMemo(() => getKPIs(compareData), [compareData]);

  // Helper to aggregate daily metrics
  const aggregateDailyData = (dataset: DataItem[]) => {
    const grouped: Record<string, any> = {};
    dataset.forEach(item => {
        const d = format(item.parsedDate, 'yyyy-MM-dd');
        if (!grouped[d]) {
            grouped[d] = { 
                date: d, 
                views: 0, 
                likes: 0, 
                netFans: 0, 
                fans: item.fans, 
                interactions: 0,
                completionRate: 0,
                interactionRate: 0,
                count: 0
            };
        }
        grouped[d].views += item.views;
        grouped[d].likes += item.likes;
        grouped[d].netFans += item.netFans;
        grouped[d].fans = Math.max(grouped[d].fans, item.fans);
        grouped[d].interactions += (item.likes + item.comments + item.shares);
        grouped[d].completionRate += parseFloat(item.completionRate.replace('%', ''));
        grouped[d].interactionRate += item.interactionRate;
        grouped[d].count += 1;
    });
    
    let result = Object.values(grouped).map((g: any) => ({
        ...g,
        completionRate: g.count ? (g.completionRate / g.count).toFixed(2) : 0,
        interactionRate: g.count ? (g.interactionRate / g.count).toFixed(2) : 0,
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));
    
    return result;
  };

  // Daily Trend Data for Charts (Current vs Comparison)
  const dailyTrend = useMemo(() => {
    const currentTrend = aggregateDailyData(currentData);
    const compareTrend = aggregateDailyData(compareData);

    // Merge logic: Map currentTrend indices to compareTrend indices
    return currentTrend.map((item, index) => {
        const compareItem = compareTrend[index] || {};
        return {
            ...item,
            compareDate: compareItem.date || 'N/A',
            compareViews: compareItem.views || 0,
            compareLikes: compareItem.likes || 0,
            compareNetFans: compareItem.netFans || 0,
            compareFans: compareItem.fans || 0,
            compareInteractions: compareItem.interactions || 0,
            compareCompletionRate: compareItem.completionRate || 0,
            compareInteractionRate: compareItem.interactionRate || 0,
        };
    });
  }, [currentData, compareData, dateRange, compareRange, selectedPlatform]);

  // Helper to aggregate monthly metrics for detailed analysis
  const aggregateMonthlyDetailData = (dataset: DataItem[]) => {
    const grouped: Record<string, any> = {};
    dataset.forEach(item => {
        const d = format(item.parsedDate, 'yyyy-MM');
        if (!grouped[d]) {
            grouped[d] = { 
                date: d, 
                views: 0, 
                likes: 0, 
                netFans: 0, 
                fans: item.fans, 
                interactions: 0,
                completionRate: 0,
                interactionRate: 0,
                count: 0
            };
        }
        grouped[d].views += item.views;
        grouped[d].likes += item.likes;
        grouped[d].netFans += item.netFans;
        grouped[d].fans = Math.max(grouped[d].fans, item.fans); // Use max for cumulative
        grouped[d].interactions += (item.likes + item.comments + item.shares);
        grouped[d].completionRate += parseFloat(item.completionRate.replace('%', ''));
        grouped[d].interactionRate += item.interactionRate;
        grouped[d].count += 1;
    });
    
    return Object.values(grouped).map((g: any) => ({
        ...g,
        completionRate: g.count ? (g.completionRate / g.count).toFixed(2) : 0,
        interactionRate: g.count ? (g.interactionRate / g.count).toFixed(2) : 0,
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));
  };

  // Helper to aggregate quarterly metrics
  const aggregateQuarterlyDetailData = (dataset: DataItem[]) => {
    const grouped: Record<string, any> = {};
    dataset.forEach(item => {
        const d = format(item.parsedDate, 'yyyy-QQQ');
        if (!grouped[d]) {
            grouped[d] = {
                date: d,
                views: 0,
                likes: 0,
                netFans: 0,
                fans: item.fans,
                interactions: 0,
                completionRate: 0,
                interactionRate: 0,
                count: 0
            };
        }
        grouped[d].views += item.views;
        grouped[d].likes += item.likes;
        grouped[d].netFans += item.netFans;
        grouped[d].fans = Math.max(grouped[d].fans, item.fans);
        grouped[d].interactions += (item.likes + item.comments + item.shares);
        grouped[d].completionRate += parseFloat(item.completionRate.replace('%', ''));
        grouped[d].interactionRate += item.interactionRate;
        grouped[d].count += 1;
    });

    return Object.values(grouped).map((g: any) => ({
        ...g,
        completionRate: g.count ? (g.completionRate / g.count).toFixed(2) : 0,
        interactionRate: g.count ? (g.interactionRate / g.count).toFixed(2) : 0,
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));
  };

  // Helper to aggregate weekly metrics
  const aggregateWeeklyDetailData = (dataset: DataItem[], range: { start: string, end: string }) => {
    const grouped: Record<string, any> = {};
    
    // Initialize all weeks in range
    const start = parse(range.start, 'yyyy-MM-dd', new Date());
    const end = parse(range.end, 'yyyy-MM-dd', new Date());
    const intervalStart = startOfWeek(start, { weekStartsOn: 1 });
    const intervalEnd = endOfWeek(end, { weekStartsOn: 1 });
    
    const weeks = eachWeekOfInterval({ start: intervalStart, end: intervalEnd }, { weekStartsOn: 1 });
    
    weeks.forEach(weekStart => {
        const d = format(weekStart, 'yyyy-MM-dd');
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const startStr = format(weekStart, 'MM.dd');
        const endStr = format(weekEnd, 'MM.dd');
        
        let displayDate;
        try {
            const isoYear = format(weekStart, 'RRRR');
            const isoWeek = format(weekStart, 'II');
            displayDate = `${isoYear} 第${isoWeek}周 (${startStr}-${endStr})`;
        } catch (e) {
            displayDate = `${format(weekStart, 'yyyy')} 第${format(weekStart, 'w')}周 (${startStr}-${endStr})`;
        }

        grouped[d] = {
            date: displayDate,
            sortKey: d,
            views: 0,
            likes: 0,
            netFans: 0,
            fans: 0,
            interactions: 0,
            completionRate: 0,
            interactionRate: 0,
            count: 0
        };
    });

    dataset.forEach(item => {
        const weekStart = startOfWeek(item.parsedDate, { weekStartsOn: 1 });
        const d = format(weekStart, 'yyyy-MM-dd');
        
        if (grouped[d]) {
            grouped[d].views += item.views;
            grouped[d].likes += item.likes;
            grouped[d].netFans += item.netFans;
            grouped[d].fans = Math.max(grouped[d].fans, item.fans);
            grouped[d].interactions += (item.likes + item.comments + item.shares);
            grouped[d].completionRate += parseFloat(item.completionRate.replace('%', ''));
            grouped[d].interactionRate += item.interactionRate;
            grouped[d].count += 1;
        }
    });

    return Object.values(grouped).map((g: any) => ({
        ...g,
        completionRate: g.count ? (g.completionRate / g.count).toFixed(2) : 0,
        interactionRate: g.count ? (g.interactionRate / g.count).toFixed(2) : 0,
    })).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey));
  };

  const monthlyDetailTrend = useMemo(() => {
    const currentTrend = aggregateMonthlyDetailData(currentData);
    const compareTrend = aggregateMonthlyDetailData(compareData);

    // Merge logic
    return currentTrend.map((item, index) => {
        const compareItem = compareTrend[index] || {};
        return {
            ...item,
            compareDate: compareItem.date || 'N/A',
            compareViews: compareItem.views || 0,
            compareLikes: compareItem.likes || 0,
            compareNetFans: compareItem.netFans || 0,
            compareFans: compareItem.fans || 0,
            compareInteractions: compareItem.interactions || 0,
            compareCompletionRate: compareItem.completionRate || 0,
            compareInteractionRate: compareItem.interactionRate || 0,
        };
    });
  }, [currentData, compareData, selectedPlatform]);

  const quarterlyDetailTrend = useMemo(() => {
    const currentTrend = aggregateQuarterlyDetailData(currentData);
    const compareTrend = aggregateQuarterlyDetailData(compareData);
    return currentTrend.map((item, index) => {
        const compareItem = compareTrend[index] || {};
        return {
            ...item,
            compareDate: compareItem.date || 'N/A',
            compareViews: compareItem.views || 0,
            compareLikes: compareItem.likes || 0,
            compareNetFans: compareItem.netFans || 0,
            compareFans: compareItem.fans || 0,
            compareInteractions: compareItem.interactions || 0,
            compareCompletionRate: compareItem.completionRate || 0,
            compareInteractionRate: compareItem.interactionRate || 0,
        };
    });
  }, [currentData, compareData, selectedPlatform]);

  const weeklyDetailTrend = useMemo(() => {
    const currentTrend = aggregateWeeklyDetailData(currentData, dateRange);
    const compareTrend = aggregateWeeklyDetailData(compareData, compareRange);
    return currentTrend.map((item, index) => {
        const compareItem = compareTrend[index] || {};
        return {
            ...item,
            compareDate: compareItem.date || 'N/A',
            compareViews: compareItem.views || 0,
            compareLikes: compareItem.likes || 0,
            compareNetFans: compareItem.netFans || 0,
            compareFans: compareItem.fans || 0,
            compareInteractions: compareItem.interactions || 0,
            compareCompletionRate: compareItem.completionRate || 0,
            compareInteractionRate: compareItem.interactionRate || 0,
        };
    });
  }, [currentData, compareData, dateRange, compareRange, selectedPlatform]);

  const finalDetailTrend = useMemo(() => {
      switch (detailTrendMode) {
          case 'monthly': return monthlyDetailTrend;
          case 'quarterly': return quarterlyDetailTrend;
          case 'weekly': return weeklyDetailTrend;
          default: return dailyTrend;
      }
  }, [detailTrendMode, dailyTrend, monthlyDetailTrend, quarterlyDetailTrend, weeklyDetailTrend]);

  // Explosive Videos (Top 10 by Views)
  const explosiveVideos = useMemo(() => {
    const platformItems = platformData[selectedPlatform] || [];
    if (platformItems.length === 0) return [];
    
    // 计算总粉丝数（使用最新的数据）
    const sortedItems = [...platformItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalFans = sortedItems.length > 0 ? sortedItems[0].fans : 0;

    const filteredItems = platformItems
      .filter(item => format(item.parsedDate, 'yyyy-MM') === selectedMonthForVideos); // 筛选选中月份的数据
    
    // 确保只使用选中月份的数据
    const itemsToUse = filteredItems.length > 0 ? filteredItems : [];

    return itemsToUse
      .map(item => {
        let category = '正常播放'; // 默认分类
        if (item.views > 500000 && item.views > totalFans * 5) {
          category = '大爆款';
        } else if (item.views > 150000 && item.views > totalFans * 1.5) {
          category = '中爆款';
        } else if (item.views > 50000 && item.views > totalFans * 0.5) {
          category = '小爆款';
        }

        return { ...item, category };
      }); // 包含所有视频，即使没有分类
  }, [platformData, selectedPlatform, selectedMonthForVideos]);

  // Monthly Aggregation - Optimized
  const monthlyData = useMemo(() => {
    const platformItems = platformData[selectedPlatform] || [];
    if (platformItems.length === 0) return [];
    
    const grouped: Record<string, any> = {};
    
    // Process data in a single pass
    for (const item of platformItems) {
        
        const m = format(item.parsedDate, 'yyyy-MM');
        if (!grouped[m]) {
            grouped[m] = {
                month: m, 
                views: 0, 
                likes: 0, 
                netFans: 0,
                comments: 0,
                completionRateSum: 0,
                interactionRateSum: 0,
                count: 0
            };
        }
        
        // Accumulate values
        grouped[m].views += item.views;
        grouped[m].likes += item.likes;
        grouped[m].netFans += item.netFans;
        grouped[m].comments += item.comments || 0;
        grouped[m].completionRateSum += parseFloat(item.completionRate.replace('%', '')) || 0;
        grouped[m].interactionRateSum += item.interactionRate || 0;
        grouped[m].count += 1;
    }
    
    // Calculate averages and sort
    return Object.values(grouped)
        .map(item => ({
            ...item,
            avgCompletionRate: item.count > 0 ? (item.completionRateSum / item.count).toFixed(2) : 0,
            avgInteractionRate: item.count > 0 ? (item.interactionRateSum / item.count).toFixed(2) : 0
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
  }, [platformData, selectedPlatform]);



  // Unique Months for Dropdowns
  const uniqueMonths = useMemo(() => {
      return monthlyData.map(m => m.month);
  }, [monthlyData]);

  // Month Comparison Logic
  const monthDataA = useMemo(() => monthlyData.find(m => m.month === monthA) || { 
      views: 0, 
      likes: 0, 
      netFans: 0,
      comments: 0,
      avgCompletionRate: 0,
      avgInteractionRate: 0
  }, [monthlyData, monthA]);
  const monthDataB = useMemo(() => monthlyData.find(m => m.month === monthB) || { 
      views: 0, 
      likes: 0, 
      netFans: 0,
      comments: 0,
      avgCompletionRate: 0,
      avgInteractionRate: 0
  }, [monthlyData, monthB]);

  const monthComparisonChartData = [
      { name: '月点赞量', A: monthDataA.likes, B: monthDataB.likes },
      { name: '月净增粉', A: monthDataA.netFans, B: monthDataB.netFans },
  ];

  // Monthly Comment Comparison Data
  const monthCommentComparisonData = [
      { name: '月评论量', A: monthDataA.comments || 0, B: monthDataB.comments || 0 },
  ];

  // Monthly Rate Comparison Data
  const monthRateComparisonData = [
      { name: '完播率(%)', A: monthDataA.avgCompletionRate || 0, B: monthDataB.avgCompletionRate || 0 },
      { name: '互动率(%)', A: monthDataA.avgInteractionRate || 0, B: monthDataB.avgInteractionRate || 0 },
  ];

  // Monthly Views Comparison Data
  const monthViewsComparisonData = [
      { name: '月播放量', A: monthDataA.views, B: monthDataB.views },
  ];

  const top10ExplosiveVideos = useMemo(() => {
    return [...currentData]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [currentData]);

  const monthlyTop10Videos = useMemo(() => {
      return data
          .filter(d => {
              const dateMatch = format(d.parsedDate, 'yyyy-MM') === selectedMonthForVideos;
              const platformMatch = d.platform === selectedPlatform;
              return dateMatch && platformMatch;
          })
          .sort((a, b) => b.views - a.views)
          .slice(0, 10); // Top 10
  }, [data, selectedMonthForVideos, selectedPlatform]);

  // 对比平台的Top 10视频（分析周期）
  const compareTop10ExplosiveVideos = useMemo(() => {
    const compareData = platformData[comparePlatform] || [];
    return [...compareData]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [platformData, comparePlatform]);

  // 对比平台的Top 10视频（月度）
  const compareMonthlyTop10Videos = useMemo(() => {
      return data
          .filter(d => {
              const dateMatch = format(d.parsedDate, 'yyyy-MM') === selectedMonthForVideos;
              const platformMatch = d.platform === comparePlatform;
              return dateMatch && platformMatch;
          })
          .sort((a, b) => b.views - a.views)
          .slice(0, 10); // Top 10
  }, [data, selectedMonthForVideos, comparePlatform]);

  // 平台数据对比 - 计算各平台的整体数据
  const platformComparisonData = useMemo(() => {
    const platforms = ['douyin', 'kuaishou', 'wechat'];
    return platforms.map(platform => {
      const platformItems = platformData[platform] || [];
      if (platformItems.length === 0) return null;
      
      const totalViews = platformItems.reduce((sum, item) => sum + item.views, 0);
      const totalLikes = platformItems.reduce((sum, item) => sum + item.likes, 0);
      const totalComments = platformItems.reduce((sum, item) => sum + item.comments, 0);
      const totalShares = platformItems.reduce((sum, item) => sum + item.shares, 0);
      const totalFavorites = platformItems.reduce((sum, item) => sum + (item.favorites || 0), 0);
      
      // 安全计算平均完播率
      const validCompletionRates = platformItems.map(item => {
        try {
          return typeof item.completionRate === 'string' ? parseFloat(item.completionRate.replace('%', '')) : 0;
        } catch {
          return 0;
        }
      }).filter(rate => !isNaN(rate));
      const avgCompletionRate = validCompletionRates.length > 0 ? validCompletionRates.reduce((sum, rate) => sum + rate, 0) / validCompletionRates.length : 0;
      
      // 安全计算平均互动率
      const validInteractionRates = platformItems.map(item => {
        try {
          return typeof item.interactionRate === 'number' ? item.interactionRate : 0;
        } catch {
          return 0;
        }
      });
      const avgInteractionRate = validInteractionRates.length > 0 ? validInteractionRates.reduce((sum, rate) => sum + rate, 0) / validInteractionRates.length : 0;
      
      // 获取最新粉丝数
      const sortedItems = [...platformItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestFans = sortedItems.length > 0 ? sortedItems[0].fans : 0;
      
      // 计算综合评分（基于各项指标的加权平均）
      const calculateScore = () => {
        // 标准化各项指标（0-100分）
        const viewsScore = Math.min((totalViews / 1000000) * 100, 100); // 100万播放量=100分
        const likesScore = Math.min((totalLikes / 10000) * 100, 100); // 1万点赞=100分
        const interactionScore = Math.min(avgInteractionRate * 10, 100); // 10%互动率=100分
        const completionScore = Math.min(avgCompletionRate, 100); // 100%完播率=100分
        const contentScore = Math.min(platformItems.length * 2, 100); // 50个视频=100分
        
        // 加权平均
        const weights = {
          views: 0.3,
          likes: 0.25,
          interaction: 0.2,
          completion: 0.15,
          content: 0.1
        };
        
        return Math.round(
          viewsScore * weights.views +
          likesScore * weights.likes +
          interactionScore * weights.interaction +
          completionScore * weights.completion +
          contentScore * weights.content
        );
      };
      
      const overallScore = calculateScore();
      
      return {
        platform,
        videoCount: platformItems.length,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalFavorites,
        avgCompletionRate,
        avgInteractionRate,
        latestFans,
        avgViews: Math.round(totalViews / platformItems.length),
        avgLikes: Math.round(totalLikes / platformItems.length),
        overallScore
      };
    }).filter(Boolean);
  }, [platformData]);

  // 平台数据对比 - 计算各平台的月度数据
  const monthlyPlatformComparisonData = useMemo(() => {
    if (!selectedCompareMonth) return [];
    
    const platforms = ['douyin', 'kuaishou', 'wechat'];
    return platforms.map(platform => {
      const platformItems = platformData[platform] || [];
      const monthlyItems = platformItems.filter(item => format(item.parsedDate, 'yyyy-MM') === selectedCompareMonth);
      
      if (monthlyItems.length === 0) return null;
      
      const totalViews = monthlyItems.reduce((sum, item) => sum + item.views, 0);
      const totalLikes = monthlyItems.reduce((sum, item) => sum + item.likes, 0);
      const totalComments = monthlyItems.reduce((sum, item) => sum + item.comments, 0);
      const totalShares = monthlyItems.reduce((sum, item) => sum + item.shares, 0);
      const totalFavorites = monthlyItems.reduce((sum, item) => sum + (item.favorites || 0), 0);
      
      // 安全计算平均完播率
      const validCompletionRates = monthlyItems.map(item => {
        try {
          return typeof item.completionRate === 'string' ? parseFloat(item.completionRate.replace('%', '')) : 0;
        } catch {
          return 0;
        }
      }).filter(rate => !isNaN(rate));
      const avgCompletionRate = validCompletionRates.length > 0 ? validCompletionRates.reduce((sum, rate) => sum + rate, 0) / validCompletionRates.length : 0;
      
      // 安全计算平均互动率
      const validInteractionRates = monthlyItems.map(item => {
        try {
          return typeof item.interactionRate === 'number' ? item.interactionRate : 0;
        } catch {
          return 0;
        }
      });
      const avgInteractionRate = validInteractionRates.length > 0 ? validInteractionRates.reduce((sum, rate) => sum + rate, 0) / validInteractionRates.length : 0;
      
      // 获取该月最新粉丝数
      const sortedItems = [...monthlyItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestFans = sortedItems.length > 0 ? sortedItems[0].fans : 0;
      
      // 计算综合评分（基于各项指标的加权平均）
      const calculateScore = () => {
        // 标准化各项指标（0-100分）
        const viewsScore = Math.min((totalViews / 500000) * 100, 100); // 50万播放量=100分
        const likesScore = Math.min((totalLikes / 5000) * 100, 100); // 5000点赞=100分
        const interactionScore = Math.min(avgInteractionRate * 10, 100); // 10%互动率=100分
        const completionScore = Math.min(avgCompletionRate, 100); // 100%完播率=100分
        const contentScore = Math.min(monthlyItems.length * 5, 100); // 20个视频=100分
        
        // 加权平均
        const weights = {
          views: 0.3,
          likes: 0.25,
          interaction: 0.2,
          completion: 0.15,
          content: 0.1
        };
        
        return Math.round(
          viewsScore * weights.views +
          likesScore * weights.likes +
          interactionScore * weights.interaction +
          completionScore * weights.completion +
          contentScore * weights.content
        );
      };
      
      const overallScore = calculateScore();
      
      return {
        platform,
        videoCount: monthlyItems.length,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalFavorites,
        avgCompletionRate,
        avgInteractionRate,
        latestFans,
        avgViews: Math.round(totalViews / monthlyItems.length),
        avgLikes: Math.round(totalLikes / monthlyItems.length),
        overallScore
      };
    }).filter(Boolean);
  }, [platformData, selectedCompareMonth]);

  // Interaction rate average for reference line
  const avgInteractionRate = useMemo(() => {
    if (!finalDetailTrend.length) return 0;
    const sum = finalDetailTrend.reduce((acc: number, cur: any) => acc + parseFloat(cur.interactionRate), 0);
    return sum / finalDetailTrend.length;
  }, [finalDetailTrend]);

  // Pearson correlation matrix for key metrics
  const pearson = (a: number[], b: number[]) => {
    const n = Math.min(a.length, b.length);
    if (n === 0) return 0;
    const ma = a.reduce((acc, v) => acc + v, 0) / n;
    const mb = b.reduce((acc, v) => acc + v, 0) / n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) {
      const va = a[i] - ma;
      const vb = b[i] - mb;
      num += va * vb;
      da += va * va;
      db += vb * vb;
    }
    const denom = Math.sqrt(da) * Math.sqrt(db);
    return denom === 0 ? 0 : num / denom;
  };

  // 词云图配置
  const wordcloudOptions = {
    rotations: 2,
    rotationAngles: [0, 90] as [number, number],
    fontSizes: [12, 60] as [number, number],
    fontStyle: 'normal' as const,
    fontWeight: 'bold' as const,
    padding: 5,
    randomSeed: "42",
    deterministic: true,
    enableTooltip: true,
    tooltipOptions: {
      theme: 'light' as const,
    },
  };

  // 提取标题关键词并计算频率
  const getWordcloudData = (videos: DataItem[]) => {
    const wordFrequency: Record<string, number> = {};
    const stopWords = new Set([
      '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '还', '那', '他', '她', '它', '们', '我们', '你们', '他们', '她们', '它们', '然后', '但是', '因为', '所以', '如果', '虽然', '然而', '可是', '不过', '而且', '并且', '或者', '要么', '除非', '尽管', '不管', '无论', '不仅', '还', '不仅', '而且', '既', '又', '一边', '一边', '与其', '不如', '宁可', '也不', '即使', '也', '只要', '就', '只有', '才', '无论', '都', '不管', '总', '不管', '也', '只要', '就', '只有', '才', '无论', '都', '不管', '总', '不管', '也'
    ]);

    videos.forEach(video => {
      const title = video.title;
      // 简单的中文分词（按空格和常见标点分割）
      const words = title
        .split(/[\s，。！？；：、"'()（）【】\[\]{}]/)
        .filter(word => word.length > 1 && !stopWords.has(word));
      
      words.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      });
    });

    // 转换为词云需要的格式
    return Object.entries(wordFrequency)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50); // 只取前50个词
  };

  // 词云数据
  const wordcloudData = useMemo(() => {
    const videos = topVideosMode === 'range' ? top10ExplosiveVideos : monthlyTop10Videos;
    return getWordcloudData(videos);
  }, [top10ExplosiveVideos, monthlyTop10Videos, topVideosMode]);

  const getHeatColor = (v: number) => {
    const t = Math.max(-1, Math.min(1, v));
    const hue = 240 * (1 - (t + 1) / 2); // -1->240(blue), 0->120, +1->0(red)
    return `hsl(${hue}, 70%, 55%)`;
  };

  const correlationData = useMemo(() => {
    const seriesMap: Record<string, number[]> = {
      '播放量': finalDetailTrend.map((d: any) => Number(d.views)),
      '互动总量': finalDetailTrend.map((d: any) => Number(d.interactions)),
      '点赞量': finalDetailTrend.map((d: any) => Number(d.likes)),
      '净增粉': finalDetailTrend.map((d: any) => Number(d.netFans)),
      '完播率': finalDetailTrend.map((d: any) => parseFloat(d.completionRate)),
      '互动率': finalDetailTrend.map((d: any) => parseFloat(d.interactionRate)),
    };
    const names = Object.keys(seriesMap);
    const res: Array<{ xName: string, yName: string, value: number, fill: string }> = [];
    names.forEach(x => {
      names.forEach(y => {
        const v = pearson(seriesMap[x], seriesMap[y]);
        res.push({ xName: x, yName: y, value: v, fill: getHeatColor(v) });
      });
    });
    return res;
  }, [finalDetailTrend]);

  // Calculate Fan Health (Likes / Fans Ratio)
  const fanHealthData = useMemo(() => {
    return finalDetailTrend.map((d: any) => ({
      ...d,
      healthRate: d.fans > 0 ? ((d.likes / d.fans) * 100).toFixed(2) : 0,
      compareHealthRate: d.compareFans > 0 ? ((d.compareLikes / d.compareFans) * 100).toFixed(2) : 0
    }));
  }, [finalDetailTrend]);

  const avgHealthRate = useMemo(() => {
    const sum = fanHealthData.reduce((acc, curr) => acc + parseFloat(curr.healthRate), 0);
    return fanHealthData.length ? (sum / fanHealthData.length).toFixed(2) : 0;
  }, [fanHealthData]);

  const currentPlatformMonths = useMemo(() => {
    return Array.from(new Set((platformData[selectedPlatform] || []).map(item => format(item.parsedDate, 'yyyy-MM'))))
      .sort((a, b) => b.localeCompare(a));
  }, [platformData, selectedPlatform]);

  const barChartData = useMemo(() => {
    return finalDetailTrend.map((d: any) => ({
      ...d,
      netFans: Math.max(0, d.netFans || 0),
      compareNetFans: Math.max(0, d.compareNetFans || 0)
    }));
  }, [finalDetailTrend]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-slate-500 text-sm">加载中...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <Suspense fallback={<div className="flex justify-center items-center h-screen">加载中...</div>}>
        <Login />
      </Suspense>
    );
  }

  // Chart Components with Memo
  const MonthlyViewsChart = React.memo(() => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthViewsComparisonData} barSize={60} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorAViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorBViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis fontSize={12} stroke="#94a3b8" domain={[0, 'dataMax * 1.2']} />
        <Tooltip 
          contentStyle={{ 
            borderRadius: '8px', 
            border: 'none', 
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            fontSize: '14px'
          }} 
        />
        <Legend wrapperStyle={{ paddingTop: '10px' }} />
        <Bar dataKey="A" name={`月份 A (${monthA})`} fill="url(#colorAViews)" radius={[8, 8, 0, 0]} animationDuration={300} />
        <Bar dataKey="B" name={`月份 B (${monthB})`} fill="url(#colorBViews)" radius={[8, 8, 0, 0]} animationDuration={300} />
      </BarChart>
    </ResponsiveContainer>
  ));

  const MonthlyOtherKPIsChart = React.memo(() => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthComparisonChartData} barSize={60} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorAKPIs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorBKPIs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis fontSize={12} stroke="#94a3b8" domain={[0, 'dataMax * 1.2']} />
        <Tooltip 
          contentStyle={{ 
            borderRadius: '8px', 
            border: 'none', 
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            fontSize: '14px'
          }} 
        />
        <Legend wrapperStyle={{ paddingTop: '10px' }} />
        <Bar dataKey="A" name={`月份 A (${monthA})`} fill="url(#colorAKPIs)" radius={[8, 8, 0, 0]} animationDuration={300} />
        <Bar dataKey="B" name={`月份 B (${monthB})`} fill="url(#colorBKPIs)" radius={[8, 8, 0, 0]} animationDuration={300} />
      </BarChart>
    </ResponsiveContainer>
  ));

  const MonthlyCommentChart = React.memo(() => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthCommentComparisonData} barSize={60} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorAComment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eab308" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#eab308" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorBComment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis fontSize={12} stroke="#94a3b8" domain={[0, 'dataMax * 1.2']} />
        <Tooltip 
          contentStyle={{ 
            borderRadius: '8px', 
            border: 'none', 
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            fontSize: '14px'
          }} 
        />
        <Legend wrapperStyle={{ paddingTop: '10px' }} />
        <Bar dataKey="A" name={`月份 A (${monthA})`} fill="url(#colorAComment)" radius={[8, 8, 0, 0]} animationDuration={300} />
        <Bar dataKey="B" name={`月份 B (${monthB})`} fill="url(#colorBComment)" radius={[8, 8, 0, 0]} animationDuration={300} />
      </BarChart>
    </ResponsiveContainer>
  ));

  const MonthlyRateChart = React.memo(() => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthRateComparisonData} barSize={60} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorARate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorBRate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis fontSize={12} stroke="#94a3b8" domain={[0, 'dataMax * 1.2']} />
        <Tooltip 
          contentStyle={{ 
            borderRadius: '8px', 
            border: 'none', 
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            fontSize: '14px'
          }} 
        />
        <Legend wrapperStyle={{ paddingTop: '10px' }} />
        <Bar dataKey="A" name={`月份 A (${monthA})`} fill="url(#colorARate)" radius={[8, 8, 0, 0]} animationDuration={300} />
        <Bar dataKey="B" name={`月份 B (${monthB})`} fill="url(#colorBRate)" radius={[8, 8, 0, 0]} animationDuration={300} />
      </BarChart>
    </ResponsiveContainer>
  ));

  // Monthly Trend Chart Components with Memo
  const MonthlyViewsLikesChart = React.memo(() => (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={monthlyData}>
        <defs>
          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="month" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis yAxisId="left" fontSize={12} stroke="#3b82f6" label={{ value: '月播放量', angle: -90, position: 'insideLeft' }} domain={[0, 'dataMax * 1.2']} />
        <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#f43f5e" label={{ value: '月点赞量', angle: 90, position: 'insideRight' }} domain={[0, 'dataMax * 1.2']} />
        <Tooltip 
          contentStyle={{ 
            borderRadius: '8px', 
            border: 'none', 
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            fontSize: '14px'
          }} 
        />
        <Legend wrapperStyle={{ paddingTop: '10px' }} />
        <Bar yAxisId="left" dataKey="views" name="月播放量" fill="url(#colorViews)" radius={[8, 8, 0, 0]} animationDuration={300} />
        <Line yAxisId="right" type="monotone" dataKey="likes" name="月点赞量" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} animationDuration={300} />
      </ComposedChart>
    </ResponsiveContainer>
  ));

  const MonthlyNetFansChart = React.memo(() => (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={monthlyData}>
        <defs>
          <linearGradient id="colorNetFans" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="month" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis fontSize={12} stroke="#10b981" label={{ value: '月净增粉', angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
        <Tooltip 
          contentStyle={{ 
            borderRadius: '8px', 
            border: 'none', 
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            fontSize: '14px'
          }} 
        />
        <Legend wrapperStyle={{ paddingTop: '10px' }} />
        <Line type="monotone" dataKey="netFans" name="月净增粉" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} animationDuration={300} />
        <Bar dataKey="netFans" name="月净增粉" fill="url(#colorNetFans)" radius={[8, 8, 0, 0]} animationDuration={300} />
      </ComposedChart>
    </ResponsiveContainer>
  ));

  return (
    <div className="min-h-screen relative font-sans text-slate-800 overflow-x-hidden">
      <Suspense fallback={<div className="flex justify-center items-center h-screen">加载中...</div>}>
        <AnimatedBackground />
      </Suspense>
      <div className="max-w-7xl mx-auto space-y-4 p-4 sm:p-6 lg:p-8 relative z-10">
        
        {/* Header */}
        <div className="relative max-w-3xl mx-auto">
          
          {/* 头部内容 */}
          <motion.div
            initial={{ opacity: 1, y: 0, height: 'auto' }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-white/50 overflow-hidden"
          >
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                多平台运营诊断
              </h1>
              <p className="text-slate-500 mt-1 text-sm">支持 CSV/Excel 导入 · 自动识别日期范围</p>
              {data.length > 0 && dataDateRange && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-xs font-medium"
                >
                  <Calendar className="w-3 h-3" />
                  <span>数据统计范围: {dataDateRange.start} 至 {dataDateRange.end}</span>
                </motion.div>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-1 w-full md:w-auto">
              <div className="flex flex-col sm:flex-row items-center gap-1 w-full md:w-auto">
                <motion.label 
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-md cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">上传</span>
                  <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} multiple />
                </motion.label>
                 <motion.span 
                   initial={{ opacity: 0, y: 5 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.2 }}
                   className="text-[9px] text-gray-500 text-center sm:text-right"
                 >
                   200MB • CSV, XLSX, XLS
                 </motion.span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-400 truncate max-w-[160px]">{session.user.email}</span>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => supabase.auth.signOut()}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg transition-all"
                >
                  退出登录
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div className="fixed left-4 top-20 z-50">
          <div
            className="bg-white/80 backdrop-blur-md border border-white/50 rounded-xl shadow-lg p-2"
          >

            {/* 导航菜单 */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white/90 backdrop-blur-md border border-white/50 rounded-xl shadow-lg p-2 min-w-[180px] overflow-hidden flex flex-col"
            >
              <div className="flex flex-col gap-1">
                {
              [
              { key: 'overview', label: '数据概览和AI诊断', icon: '📊' },
              { key: 'platform', label: '平台数据对比', icon: '🔄' },
              { key: 'monthly', label: '月度对比分析', icon: '📈' },
              { key: 'range', label: '时段对比KPI', icon: '📅' },
              { key: 'personal', label: '个人行业爆款视频', icon: '👤' },
              { key: 'viral', label: '行业爆款视频', icon: '🔥' },
              { key: 'coze', label: 'Coze智能体', icon: '🤖', url: 'https://www.coze.cn/store/agent/7626943462554435603?bot_id=true' }
            ].map((tab) => (
                  tab.url ? (
                    <a
                      key={tab.key}
                      href={tab.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "relative px-3 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                        "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                      )}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </a>
                  ) : (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={cn(
                        "relative px-3 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                        activeTab === tab.key
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                      )}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      {activeTab === tab.key && (
                        <motion.div 
                          layoutId="activeTab"
                          className="absolute right-0 top-0 bottom-0 w-0.5 bg-white"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        />
                      )}
                    </button>
                  )
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="ml-24">
          {data.length > 0 ? (
          <>

        {/* --- SECTION 0: OVERALL TREND --- */}
        {activeTab === 'overview' && showAnalysis && (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* 顶部 KPI 指标卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                whileHover={{ scale: 1.02, translateY: -2 }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs opacity-80 font-medium">总播放量</span>
                  <Play className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-2xl md:text-3xl font-bold mb-2">{currentKPIs.views.toLocaleString()}</div>
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <span>累计视频播放</span>
                  {compareKPIs.views > 0 && (
                    <span className={currentKPIs.views > compareKPIs.views ? "text-green-300 flex items-center" : "text-red-300 flex items-center"}>
                      {currentKPIs.views > compareKPIs.views ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                      {Math.abs(((currentKPIs.views - compareKPIs.views) / compareKPIs.views) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: 0.05 }}
                whileHover={{ scale: 1.02, translateY: -2 }}
                className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs opacity-80 font-medium">总点赞量</span>
                  <Heart className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-2xl md:text-3xl font-bold mb-2">{currentKPIs.likes.toLocaleString()}</div>
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <span>用户互动点赞</span>
                  {compareKPIs.likes > 0 && (
                    <span className={currentKPIs.likes > compareKPIs.likes ? "text-green-300 flex items-center" : "text-red-300 flex items-center"}>
                      {currentKPIs.likes > compareKPIs.likes ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                      {Math.abs(((currentKPIs.likes - compareKPIs.likes) / compareKPIs.likes) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: 0.1 }}
                whileHover={{ scale: 1.02, translateY: -2 }}
                className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs opacity-80 font-medium">粉丝净增</span>
                  <Users className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-2xl md:text-3xl font-bold mb-2">{currentKPIs.netFans.toLocaleString()}</div>
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <span>新增粉丝数量</span>
                  {compareKPIs.netFans > 0 && (
                    <span className={currentKPIs.netFans > compareKPIs.netFans ? "text-green-300 flex items-center" : "text-red-300 flex items-center"}>
                      {currentKPIs.netFans > compareKPIs.netFans ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                      {Math.abs(((currentKPIs.netFans - compareKPIs.netFans) / compareKPIs.netFans) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: 0.15 }}
                whileHover={{ scale: 1.02, translateY: -2 }}
                className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs opacity-80 font-medium">总评论量</span>
                  <MessageCircle className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-2xl md:text-3xl font-bold mb-2">{currentKPIs.comments.toLocaleString()}</div>
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <span>用户评论互动</span>
                  {compareKPIs.comments > 0 && (
                    <span className={currentKPIs.comments > compareKPIs.comments ? "text-green-300 flex items-center" : "text-red-300 flex items-center"}>
                      {currentKPIs.comments > compareKPIs.comments ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                      {Math.abs(((currentKPIs.comments - compareKPIs.comments) / compareKPIs.comments) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: 0.2 }}
                whileHover={{ scale: 1.02, translateY: -2 }}
                className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 text-white shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs opacity-80 font-medium">总转发量</span>
                  <Share2 className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-2xl md:text-3xl font-bold mb-2">{currentKPIs.shares.toLocaleString()}</div>
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <span>内容传播分享</span>
                  {compareKPIs.shares > 0 && (
                    <span className={currentKPIs.shares > compareKPIs.shares ? "text-green-300 flex items-center" : "text-red-300 flex items-center"}>
                      {currentKPIs.shares > compareKPIs.shares ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                      {Math.abs(((currentKPIs.shares - compareKPIs.shares) / compareKPIs.shares) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: 0.25 }}
                whileHover={{ scale: 1.02, translateY: -2 }}
                className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs opacity-80 font-medium">互动率</span>
                  <Activity className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-2xl md:text-3xl font-bold mb-2">{currentKPIs.avgInteractionRate.toFixed(2)}%</div>
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <span>用户互动比例</span>
                  {compareKPIs.avgInteractionRate > 0 && (
                    <span className={currentKPIs.avgInteractionRate > compareKPIs.avgInteractionRate ? "text-green-300 flex items-center" : "text-red-300 flex items-center"}>
                    {currentKPIs.avgInteractionRate > compareKPIs.avgInteractionRate ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                    {Math.abs(((currentKPIs.avgInteractionRate - compareKPIs.avgInteractionRate) / compareKPIs.avgInteractionRate) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </motion.div>
            </div>

            {/* 整体数据趋势图表 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white/85 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        整体数据趋势
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/70 p-2 rounded-lg border border-gray-200">
                            {platformData.douyin?.length > 0 && (
                                <button
                                    onClick={() => handlePlatformSelect('douyin')}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                        selectedPlatform === 'douyin'
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "text-gray-600 hover:bg-white/50"
                                    )}
                                >
                                    抖音
                                </button>
                            )}
                            {platformData.kuaishou?.length > 0 && (
                                <button
                                    onClick={() => handlePlatformSelect('kuaishou')}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                        selectedPlatform === 'kuaishou'
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "text-gray-600 hover:bg-white/50"
                                    )}
                                >
                                    快手
                                </button>
                            )}
                            {platformData.wechat?.length > 0 && (
                                <button
                                    onClick={() => handlePlatformSelect('wechat')}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                        selectedPlatform === 'wechat'
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "text-gray-600 hover:bg-white/50"
                                    )}
                                >
                                    视频号
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 bg-white/70 p-2 rounded-lg border border-gray-200">
                            <input 
                                type="date" 
                                value={trendRange.start} 
                                onChange={e => {
                                    setPlatformTrendRange(prev => ({ ...prev, start: e.target.value }));
                                    setPlatformTrendMode('daily');
                                }}
                                className="bg-transparent text-sm px-2 py-1.5 outline-none text-gray-600 w-36"
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                                type="date" 
                                value={trendRange.end} 
                                onChange={e => {
                                    setPlatformTrendRange(prev => ({ ...prev, end: e.target.value }));
                                    setPlatformTrendMode('daily');
                                }}
                                className="bg-transparent text-sm px-2 py-1.5 outline-none text-gray-600 w-36"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    setPlatformTrendRange(dataDateRange);
                                    setPlatformTrendMode('quarterly');
                                }}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                    trendMode === 'quarterly'
                                        ? "text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                                        : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                                )}
                            >
                                全部(季)
                            </button>
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    const end = parse(dataDateRange.end, 'yyyy-MM-dd', new Date());
                                    const start = subDays(end, 7);
                                    setPlatformTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                    setPlatformTrendMode('daily');
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                近7天
                            </button>
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    const end = parse(dataDateRange.end, 'yyyy-MM-dd', new Date());
                                    const start = subDays(end, 30);
                                    setPlatformTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                    setPlatformTrendMode('daily');
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                近30天
                            </button>
                            <button 
                                onClick={() => {
                                    const now = new Date();
                                    const start = startOfMonth(now);
                                    const end = now;
                                    setPlatformTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                    setPlatformTrendMode('daily');
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                本月
                            </button>
                            <button 
                                onClick={() => {
                                    const now = new Date();
                                    const start = startOfMonth(subMonths(now, 1));
                                    const end = startOfMonth(now);
                                    setPlatformTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                    setPlatformTrendMode('daily');
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                上月
                            </button>
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    setPlatformTrendRange(dataDateRange);
                                    setPlatformTrendMode('daily');
                                }}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                    trendMode === 'daily'
                                        ? "text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                                        : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                                )}
                            >
                                全部(日)
                            </button>
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    setPlatformTrendRange(dataDateRange);
                                    setPlatformTrendMode('weekly');
                                }}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                    trendMode === 'weekly'
                                        ? "text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                                        : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                                )}
                            >
                                按周
                            </button>
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    setPlatformTrendRange(dataDateRange);
                                    setPlatformTrendMode('monthly');
                                }}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                    trendMode === 'monthly'
                                        ? "text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                                        : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                                )}
                            >
                                全年按月
                            </button>
                        </div>
                    </div>
                </div>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            <defs>
                                <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                            <YAxis fontSize={12} stroke="#f97316" label={{ value: '互动数据', angle: -90, position: 'insideLeft' }} />
                            <Tooltip 
                                contentStyle={{ 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    padding: '12px',
                                    fontSize: '14px'
                                }} 
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="likes" name="点赞量" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} fillOpacity={1} fill="url(#colorLikes)" animationDuration={300} />
                            <Line type="monotone" dataKey="comments" name="评论量" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} fillOpacity={1} fill="url(#colorComments)" animationDuration={300} />
                            {/* 根据平台类型显示不同的指标 */}
                            {selectedPlatform === 'wechat' ? (
                                <Line type="monotone" dataKey="recommendations" name="推荐量" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} animationDuration={300} />
                            ) : hasFavorites ? (
                                <Line type="monotone" dataKey="favorites" name="收藏量" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} animationDuration={300} />
                            ) : hasRecommendations ? (
                                <Line type="monotone" dataKey="recommendations" name="推荐量" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} animationDuration={300} />
                            ) : null}
                            <Line type="monotone" dataKey="shares" name="转发量" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} fillOpacity={1} fill="url(#colorShares)" animationDuration={300} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* 播放量与粉丝趋势图表 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="bg-white/85 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                       <TrendingUp className="w-5 h-5 text-blue-600" />
                       播放量与粉丝趋势 (Views & Fans)
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/70 p-2 rounded-lg border border-gray-200">
                            <input 
                                type="date" 
                                value={viewsTrendRange.start} 
                                onChange={e => {
                                    setPlatformViewsTrendRange(prev => ({ ...prev, start: e.target.value }));
                                    setPlatformViewsTrendMode('daily');
                                }}
                                className="bg-transparent text-sm px-2 py-1.5 outline-none text-gray-600 w-36"
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                                type="date" 
                                value={viewsTrendRange.end} 
                                onChange={e => {
                                    setPlatformViewsTrendRange(prev => ({ ...prev, end: e.target.value }));
                                    setPlatformViewsTrendMode('daily');
                                }}
                                className="bg-transparent text-sm px-2 py-1.5 outline-none text-gray-600 w-36"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    setPlatformViewsTrendRange(dataDateRange);
                                    setPlatformViewsTrendMode('quarterly');
                                }}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                    viewsTrendMode === 'quarterly'
                                        ? "text-white bg-purple-600 hover:bg-purple-700 shadow-sm"
                                        : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                                )}
                            >
                                全部(季)
                            </button>
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    const end = parse(dataDateRange.end, 'yyyy-MM-dd', new Date());
                                    const start = subDays(end, 7);
                                    setPlatformViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                    setPlatformViewsTrendMode('daily');
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                近7天
                            </button>
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    const end = parse(dataDateRange.end, 'yyyy-MM-dd', new Date());
                                    const start = subDays(end, 30);
                                    setPlatformViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                    setPlatformViewsTrendMode('daily');
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                近30天
                            </button>
                            <button 
                                onClick={() => {
                                    const now = new Date();
                                    const start = startOfMonth(now);
                                    const end = now;
                                    setPlatformViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                    setPlatformViewsTrendMode('daily');
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                本月
                            </button>
                            <button 
                                onClick={() => {
                                    const now = new Date();
                                    const start = startOfMonth(subMonths(now, 1));
                                    const end = startOfMonth(now);
                                    setPlatformViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                    setPlatformViewsTrendMode('daily');
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                上月
                            </button>
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    setPlatformViewsTrendRange(dataDateRange);
                                    setPlatformViewsTrendMode('daily');
                                }}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                    viewsTrendMode === 'daily'
                                        ? "text-white bg-purple-600 hover:bg-purple-700 shadow-sm"
                                        : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                                )}
                            >
                                全部(日)
                            </button>
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    setPlatformViewsTrendRange(dataDateRange);
                                    setPlatformViewsTrendMode('weekly');
                                }}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                    viewsTrendMode === 'weekly'
                                        ? "text-white bg-purple-600 hover:bg-purple-700 shadow-sm"
                                        : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                                )}
                            >
                                按周
                            </button>
                            <button 
                                onClick={() => {
                                    if (!dataDateRange) return;
                                    setPlatformViewsTrendRange(dataDateRange);
                                    setPlatformViewsTrendMode('monthly');
                                }}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                    viewsTrendMode === 'monthly'
                                        ? "text-white bg-purple-600 hover:bg-purple-700 shadow-sm"
                                        : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                                )}
                            >
                                全年按月
                            </button>
                        </div>
                    </div>
                </div>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={viewsTrendData}>
                            <defs>
                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id="colorFans" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                            <YAxis yAxisId="left" fontSize={12} stroke="#3b82f6" label={{ value: '播放量', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#0ea5e9" label={{ value: '累计粉丝量', angle: 90, position: 'insideRight' }} />
                            <Tooltip 
                                contentStyle={{ 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    padding: '12px',
                                    fontSize: '14px'
                                }} 
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Line yAxisId="left" type="monotone" dataKey="views" name="播放量" stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} fillOpacity={1} fill="url(#colorViews)" animationDuration={300} />
                            <Line yAxisId="right" type="monotone" dataKey="fans" name="累计粉丝量" stroke="#0ea5e9" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} fillOpacity={1} fill="url(#colorFans)" animationDuration={300} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* AARRR Model Analysis */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="bg-white/85 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
            >
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    AARRR 增长模型分析
                </h3>
                <Suspense fallback={<div className="flex justify-center items-center h-64">加载中...</div>}>
                    <AARRRAnalysis data={currentData} />
                </Suspense>
            </motion.div>

            {/* AI 智能运营诊断 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              className="bg-white/85 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        AI 智能运营诊断
                    </h3>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input 
                            type="date" 
                            value={aiDateRange.start} 
                            onChange={e => setPlatformAiDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="border border-gray-200 rounded px-3 py-2 text-sm w-full sm:w-auto bg-white/70 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                            type="date" 
                            value={aiDateRange.end} 
                            onChange={e => setPlatformAiDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="border border-gray-200 rounded px-3 py-2 text-sm w-full sm:w-auto bg-white/70 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        />
                    </div>
                </div>
                <Suspense fallback={<div className="flex justify-center items-center h-64">加载中...</div>}>
                    <AIAnalysisCard data={aiData} title="AI 智能运营诊断 (Intelligent Advisor)" mode="general-only" platform={selectedPlatform} />
                </Suspense>
            </motion.div>
        </motion.div>
        )}






        {/* --- SECTION 2: RANGE ANALYSIS --- */}
        {activeTab === 'range' && (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4"
        >
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="text-red-500">📌</span> 时间段对比 KPI
            </h2>
            <div className="bg-gray-100 p-1 rounded-lg inline-flex text-xs">
                {platformData.douyin?.length > 0 && (
                    <button 
                        onClick={() => handlePlatformSelect('douyin')}
                        className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'douyin' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500')}
                    >
                        抖音
                    </button>
                )}
                {platformData.kuaishou?.length > 0 && (
                    <button 
                        onClick={() => handlePlatformSelect('kuaishou')}
                        className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'kuaishou' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500')}
                    >
                        快手
                    </button>
                )}
                {platformData.wechat?.length > 0 && (
                    <button 
                        onClick={() => handlePlatformSelect('wechat')}
                        className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'wechat' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500')}
                    >
                        视频号
                    </button>
                )}
            </div>
        </motion.div>
        )}
        {/* Date Filters */}
        {activeTab === 'range' && (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            viewport={{ once: true }}
            className="bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/50 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> 当前分析周期 (Range A)
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setPlatformDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-1.5 text-sm w-full bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <span className="text-gray-400">-</span>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setPlatformDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-1.5 text-sm w-full bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> 对比周期 (Range B)
                        </label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="date" 
                                value={compareRange.start} 
                                onChange={e => setPlatformCompareRange(prev => ({ ...prev, start: e.target.value }))}
                                className="border border-gray-200 rounded px-3 py-1.5 text-sm w-full bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                                type="date" 
                                value={compareRange.end} 
                                onChange={e => setPlatformCompareRange(prev => ({ ...prev, end: e.target.value }))}
                                className="border border-gray-200 rounded px-3 py-1.5 text-sm w-full bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
        </motion.div>
        )}


          

        {activeTab === 'range' && (
          <div id="analysis-content" className="space-y-6">
            
            {/* View Mode Toggle */}
            <div className="flex justify-end mt-4 mb-4 pr-4">
                <div className="bg-white border border-gray-200 rounded-lg inline-flex shadow-sm">
                    <button
                        onClick={() => setDetailTrendMode('daily')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-l-md transition-all ${
                            detailTrendMode === 'daily' 
                            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        按日
                    </button>
                    <button
                        onClick={() => setDetailTrendMode('weekly')}
                        className={`px-3 py-1.5 text-sm font-medium transition-all ${
                            detailTrendMode === 'weekly' 
                            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        按周
                    </button>
                    <button
                        onClick={() => setDetailTrendMode('monthly')}
                        className={`px-3 py-1.5 text-sm font-medium transition-all ${
                            detailTrendMode === 'monthly' 
                            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        按月
                    </button>
                    <button
                        onClick={() => setDetailTrendMode('quarterly')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-r-md transition-all ${
                            detailTrendMode === 'quarterly' 
                            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        按季度
                    </button>
                </div>
            </div>

            {/* Advanced Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Fan Growth Trend (Dual Axis) */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                        粉丝增长趋势 (双轴)
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 10, bottom: 20 }} barSize={4}>
                                <defs>
                                  <linearGradient id="colorNetFansCurrent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.85}/>
                                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.2}/>
                                  </linearGradient>
                                  <linearGradient id="colorNetFansCompare" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.85}/>
                                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.2}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#f97316" tickLine={false} axisLine={{ stroke: '#f97316', strokeWidth: 1 }} domain={[0, 'dataMax + 10']} label={{ value: '日增粉丝', angle: 90, position: 'insideRight', offset: 8, style: { fill: '#f97316', fontSize: 12 } }} />
                                <Tooltip 
                                  content={<ComparisonTooltip />}
                                  contentStyle={{ 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    padding: '12px',
                                    fontSize: '14px'
                                  }} 
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                <Bar yAxisId="right" dataKey="compareNetFans" name="对比周期 日增粉丝" fill="url(#colorNetFansCompare)" radius={[1, 1, 0, 0]} barSize={6} animationDuration={300} />
                                <Bar yAxisId="right" dataKey="netFans" name="当前周期 日增粉丝" fill="url(#colorNetFansCurrent)" radius={[1, 1, 0, 0]} barSize={6} animationDuration={300} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Completion Rate Chart */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-500" />
                        用户粘性指标 (完播率)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis fontSize={12} stroke="#94a3b8" unit="%" />
                                <Tooltip 
                                  content={<ComparisonTooltip />}
                                  contentStyle={{ 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    padding: '12px',
                                    fontSize: '14px'
                                  }} 
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                <Line type="monotone" dataKey="completionRate" name="当前周期 完播率(%)" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} animationDuration={300} />
                                <Line type="monotone" dataKey="compareCompletionRate" name="对比周期 完播率(%)" stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} strokeOpacity={0.7} dot={false} activeDot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 1 }} animationDuration={300} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Interaction Rate Chart */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-500" />
                        用户粘性指标 (互动率)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis fontSize={12} stroke="#94a3b8" unit="%" />
                                <Tooltip 
                                  content={<ComparisonTooltip />}
                                  contentStyle={{ 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    padding: '12px',
                                    fontSize: '14px'
                                  }} 
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                <Line type="monotone" dataKey="interactionRate" name="当前周期 互动率(%)" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} animationDuration={300} />
                                <Line type="monotone" dataKey="compareInteractionRate" name="对比周期 互动率(%)" stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={2} strokeOpacity={0.7} dot={false} activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1 }} animationDuration={300} />
                                <ReferenceLine y={avgInteractionRate} stroke="#64748b" strokeDasharray="4 4" label={{ value: `均值: ${avgInteractionRate.toFixed(2)}%`, position: 'right', fill: '#64748b' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Views Trend Chart */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        内容热度趋势 (播放量)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis yAxisId="left" fontSize={12} stroke="#3b82f6" label={{ value: '播放量', angle: -90, position: 'insideLeft' }} />
                                <Tooltip 
                                  content={<ComparisonTooltip />}
                                  contentStyle={{ 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    padding: '12px',
                                    fontSize: '14px'
                                  }} 
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                <Line yAxisId="left" type="monotone" dataKey="views" name="当前周期 播放量" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} animationDuration={300} />
                                <Line yAxisId="left" type="monotone" dataKey="compareViews" name="对比周期 播放量" stroke="#60a5fa" strokeDasharray="5 5" strokeWidth={2} strokeOpacity={0.6} dot={false} activeDot={{ r: 5, fill: '#60a5fa', stroke: '#fff', strokeWidth: 1 }} animationDuration={300} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Interactions Trend Chart */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                        内容热度趋势 (互动总量)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#f97316" label={{ value: '互动总量', angle: 90, position: 'insideRight' }} />
                                <Tooltip 
                                  content={<ComparisonTooltip />}
                                  contentStyle={{ 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    padding: '12px',
                                    fontSize: '14px'
                                  }} 
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                <Line yAxisId="right" type="monotone" dataKey="interactions" name="当前周期 互动总量" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }} animationDuration={300} />
                                <Line yAxisId="right" type="monotone" dataKey="compareInteractions" name="对比周期 互动总量" stroke="#fb923c" strokeDasharray="5 5" strokeWidth={2} strokeOpacity={0.6} dot={false} activeDot={{ r: 5, fill: '#fb923c', stroke: '#fff', strokeWidth: 1 }} animationDuration={300} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Fan Health (Likes / Fans Ratio) */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500" />
                        粉丝健康度 (点赞量/粉丝量)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={fanHealthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis fontSize={12} stroke="#94a3b8" unit="%" />
                                <Tooltip 
                                  content={<ComparisonTooltip />}
                                  contentStyle={{ 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    padding: '12px',
                                    fontSize: '14px'
                                  }} 
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                <Line type="monotone" dataKey="healthRate" name="当前周期 粉赞比(%)" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} animationDuration={300} />
                                <Line type="monotone" dataKey="compareHealthRate" name="对比周期 粉赞比(%)" stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={2} strokeOpacity={0.6} dot={false} activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1 }} animationDuration={300} />
                                <ReferenceLine y={avgHealthRate} stroke="#64748b" strokeDasharray="4 4" label={{ value: `均值: ${avgHealthRate}%`, position: 'right', fill: '#64748b' }} />
                            </LineChart>
                        </ResponsiveContainer>
                </div>
            </motion.div>

             {/* Core Metrics Correlation Analysis */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
            >
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <GitMerge className="w-5 h-5 text-indigo-500" />
                    核心指标相关性分析
                </h3>
                <div className="flex items-center justify-center p-2">
                    <div className="flex items-start gap-2">
                        {/* Labels for left column */}
                        <div className="flex flex-col gap-2">
                            {['播放量', '互动总量', '点赞量', '净增粉', '完播率', '互动率'].map(name => (
                                <div key={name} className="aspect-square flex items-center justify-end pr-2 text-[10px] text-gray-500 font-medium">{name}</div>
                            ))}
                            {/* Empty space for bottom row labels */}
                            <div className="h-4"></div>
                        </div>
                        
                        {/* Main correlation grid */}
                        <div className="grid grid-cols-6 gap-2 w-full aspect-square max-w-[500px]">
                            {correlationData.map((item, index) => (
                                <motion.div 
                                    key={index}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.1 }}
                                    className="aspect-square flex flex-col items-center justify-center rounded text-xs font-medium text-white relative group cursor-pointer shadow-sm hover:shadow-md transition-all"
                                    style={{ backgroundColor: item.fill }}
                                >
                                    <span className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-3 py-1.5 rounded-lg shadow-xl z-20 whitespace-nowrap pointer-events-none transition-opacity backdrop-blur-sm border border-white/10 text-xs">
                                        {item.xName} vs {item.yName}: {item.value.toFixed(2)}
                                    </span>
                                    {item.value.toFixed(2)}
                                </motion.div>
                            ))}
                            {/* Labels for bottom row */}
                            {['播放量', '互动总量', '点赞量', '净增粉', '完播率', '互动率'].map(name => (
                                <div key={name} className="text-center text-[10px] text-gray-500 mt-1 font-medium transform -rotate-45 sm:rotate-0 origin-top-left sm:origin-center">{name}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Video Quality Scatter Plot */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-500" />
                        播放量高光视频定位
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">选择月份：</span>
                        <select
                                value={selectedMonthForVideos}
                                onChange={(e) => setPlatformSelectedMonthForVideos(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {currentPlatformMonths.map(month => (
                                        <option key={month} value={month}>
                                            {month}
                                        </option>
                                    ))}
                            </select>
                    </div>
                </div>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="category" dataKey="x" name="日期" fontSize={12} tickMargin={10} stroke="#94a3b8" allowDuplicatedCategory={false} />
                            <YAxis type="number" dataKey="y" name="播放量" fontSize={12} stroke="#94a3b8" tickFormatter={(value) => `${value / 10000}w`} />
                            <ZAxis type="number" dataKey="z" name="互动率" range={[40, 400]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<VideoTooltip />} />
                            <Legend />
                            <Scatter name="大爆款 (50w+)" data={explosiveVideos.filter(v => v.category === '大爆款').map(v => ({ x: v.date, y: v.views, z: v.interactionRate, title: v.title, category: v.category }))} fill="#ef4444" shape="star" />
                            <Scatter name="中爆款 (15w+)" data={explosiveVideos.filter(v => v.category === '中爆款').map(v => ({ x: v.date, y: v.views, z: v.interactionRate, title: v.title, category: v.category }))} fill="#f97316" shape="triangle" />
                            <Scatter name="小爆款 (5w+)" data={explosiveVideos.filter(v => v.category === '小爆款').map(v => ({ x: v.date, y: v.views, z: v.interactionRate, title: v.title, category: v.category }))} fill="#f59e0b" shape="diamond" />
                            <Scatter name="正常播放 (0.3w-1w)" data={explosiveVideos.filter(v => v.category === '正常播放').map(v => ({ x: v.date, y: v.views, z: v.interactionRate, title: v.title, category: v.category }))} fill="#3b82f6" shape="circle" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>












      </div>
    )}

          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
          >
            <div className="bg-white/80 backdrop-blur-md p-12 rounded-3xl shadow-xl border border-white/50 max-w-2xl">
              <div className="bg-blue-100 p-6 rounded-full inline-flex mb-6">
                <Upload className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">开始您的数据分析之旅</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                请点击右上角的上传按钮，或直接将 CSV/Excel 文件拖入上方区域，即可生成全方位的运营诊断报表。
              </p>
              <div className="flex flex-wrap gap-4 justify-center text-sm text-gray-500">
                <span className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                  <FileSpreadsheet className="w-4 h-4" /> 支持 .xlsx, .csv
                </span>
                <span className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                  <Activity className="w-4 h-4" /> 自动生成图表
                </span>
              </div>
            </div>
          </motion.div>
        )}



        {/* 月度对比分析 */}
        {activeTab === 'monthly' && showAnalysis && !(platformData[selectedPlatform]?.length > 0) && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <span className="text-4xl">📂</span>
            <p className="text-sm">当前平台暂无数据，请先上传 <strong>{selectedPlatform === 'douyin' ? '抖音' : selectedPlatform === 'kuaishou' ? '快手' : '视频号'}</strong> 的数据文件</p>
            <p className="text-xs text-gray-300">文件名需包含平台名称，如"抖音数据.xlsx"</p>
          </div>
        )}
        {activeTab === 'monthly' && showAnalysis && platformData[selectedPlatform]?.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
            >
                {/* 顶部 KPI 指标卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ scale: 1.05, translateY: -5 }}
                        className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs opacity-80 font-medium">月播放量</span>
                            <Play className="w-5 h-5 opacity-80" />
                        </div>
                        <div className="text-2xl md:text-3xl font-bold mb-2">{monthDataB.views.toLocaleString()}</div>
                        <div className="flex items-center gap-2 text-xs opacity-70">
                            <span>当前月份</span>
                            <span className={monthDataB.views > monthDataA.views ? "text-green-300 flex items-center" : "text-red-300 flex items-center"}>
                                {monthDataB.views > monthDataA.views ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                {Math.abs(((monthDataB.views - monthDataA.views) / monthDataA.views) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        whileHover={{ scale: 1.05, translateY: -5 }}
                        className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow-xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs opacity-80 font-medium">月点赞量</span>
                            <Heart className="w-5 h-5 opacity-80" />
                        </div>
                        <div className="text-2xl md:text-3xl font-bold mb-2">{monthDataB.likes.toLocaleString()}</div>
                        <div className="flex items-center gap-2 text-xs opacity-70">
                            <span>当前月份</span>
                            <span className={monthDataB.likes > monthDataA.likes ? "text-green-300 flex items-center" : "text-red-300 flex items-center"}>
                                {monthDataB.likes > monthDataA.likes ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                {Math.abs(((monthDataB.likes - monthDataA.likes) / monthDataA.likes) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        whileHover={{ scale: 1.05, translateY: -5 }}
                        className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs opacity-80 font-medium">月净增粉</span>
                            <Users className="w-5 h-5 opacity-80" />
                        </div>
                        <div className="text-2xl md:text-3xl font-bold mb-2">{monthDataB.netFans.toLocaleString()}</div>
                        <div className="flex items-center gap-2 text-xs opacity-70">
                            <span>当前月份</span>
                            <span className={monthDataB.netFans > monthDataA.netFans ? "text-green-300 flex items-center" : "text-red-300 flex items-center"}>
                                {monthDataB.netFans > monthDataA.netFans ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                {Math.abs(((monthDataB.netFans - monthDataA.netFans) / monthDataA.netFans) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                        whileHover={{ scale: 1.05, translateY: -5 }}
                        className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs opacity-80 font-medium">互动率</span>
                            <Activity className="w-5 h-5 opacity-80" />
                        </div>
                        <div className="text-2xl md:text-3xl font-bold mb-2">{monthDataB.avgInteractionRate}%</div>
                        <div className="flex items-center gap-2 text-xs opacity-70">
                            <span>当前月份</span>
                            <span className={parseFloat(monthDataB.avgInteractionRate) > parseFloat(monthDataA.avgInteractionRate) ? "text-green-300 flex items-center" : "text-red-300 flex items-center"}>
                                {parseFloat(monthDataB.avgInteractionRate) > parseFloat(monthDataA.avgInteractionRate) ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                {Math.abs(((parseFloat(monthDataB.avgInteractionRate) - parseFloat(monthDataA.avgInteractionRate)) / parseFloat(monthDataA.avgInteractionRate)) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* Charts Section 1: Monthly Comparison */}
                <div className="mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="text-blue-500">📊</span> 月度对比分析
                        </h2>
                        <div className="flex flex-wrap gap-4">
                            <div className="bg-gray-100 p-1 rounded-lg inline-flex text-xs">
                                {platformData.douyin?.length > 0 && (
                                    <button 
                                        onClick={() => handlePlatformSelect('douyin')}
                                        className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'douyin' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500')}
                                    >
                                        抖音
                                    </button>
                                )}
                                {platformData.kuaishou?.length > 0 && (
                                    <button 
                                        onClick={() => handlePlatformSelect('kuaishou')}
                                        className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'kuaishou' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500')}
                                    >
                                        快手
                                    </button>
                                )}
                                {platformData.wechat?.length > 0 && (
                                    <button 
                                        onClick={() => handlePlatformSelect('wechat')}
                                        className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'wechat' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500')}
                                    >
                                        视频号
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <select 
                                    value={monthA}
                                    onChange={(e) => setPlatformMonthA(e.target.value)}
                                    className="bg-white/50 border border-gray-200 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <span className="text-gray-400 self-center">VS</span>
                                <select 
                                    value={monthB}
                                    onChange={(e) => setPlatformMonthB(e.target.value)}
                                    className="bg-white/50 border border-gray-200 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Monthly Views Comparison */}
                {platformData[selectedPlatform]?.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="text-blue-500">📊</span> 月度播放量对比
                        </h3>
                        <div className="h-56">
                            <MonthlyViewsChart />
                        </div>
                    </motion.div>
                )}

                {/* Monthly Other KPIs Comparison */}
                {platformData[selectedPlatform]?.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="text-green-500">📊</span> 其他月度指标对比
                        </h3>
                        <div className="h-56">
                            <MonthlyOtherKPIsChart />
                        </div>
                    </motion.div>
                )}
            </div>
            </div>

            {/* Charts Section 1.5: Additional Monthly Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Comment Monthly Comparison */}
                {platformData[selectedPlatform]?.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="text-yellow-500">💬</span> 月度评论量对比
                        </h3>
                        <div className="h-56">
                            <MonthlyCommentChart />
                        </div>
                    </motion.div>
                )}

                {/* Rate Monthly Comparison */}
                {platformData[selectedPlatform]?.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="text-red-500">📈</span> 月度完播率和互动率对比
                        </h3>
                        <div className="h-56">
                            <MonthlyRateChart />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Charts Section 2: Monthly Trends Split Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Chart 1: Views & Likes */}
                {platformData[selectedPlatform]?.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            按月运营趋势 (播放量 & 点赞量)
                        </h3>
                        <div className="h-56">
                            <MonthlyViewsLikesChart />
                        </div>
                    </motion.div>
                )}

                {/* Chart 2: Net Fans */}
                {platformData[selectedPlatform]?.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                    className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        按月运营趋势 (净增粉)
                    </h3>
                    <div className="h-56">
                        <MonthlyNetFansChart />
                    </div>
                </motion.div>
                )}
            </div>
        </motion.div>
        )}

        {/* 个人行业爆款视频 */}
        {activeTab === 'personal' && showAnalysis && !(platformData[selectedPlatform]?.length > 0) && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <span className="text-4xl">📂</span>
            <p className="text-sm">当前平台暂无数据，请先上传 <strong>{selectedPlatform === 'douyin' ? '抖音' : selectedPlatform === 'kuaishou' ? '快手' : '视频号'}</strong> 的数据文件</p>
            <p className="text-xs text-gray-300">文件名需包含平台名称，如"抖音数据.xlsx"</p>
          </div>
        )}
        {activeTab === 'personal' && showAnalysis && platformData[selectedPlatform]?.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-white/50 overflow-hidden"
                >
                    <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="text-red-500">🔥</span> 
                            {userNames[selectedPlatform] ? `${userNames[selectedPlatform]} ` : ''}
                            {selectedPlatform === 'douyin' ? '抖音' : selectedPlatform === 'kuaishou' ? '快手' : '视频号'}
                            {topVideosMode === 'range' ? '行业爆款视频数据明细 (Top 10)' : `月度行业爆款视频 (Top 10)`}
                        </h3>
                        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                            <div className="bg-gray-100 p-1 rounded-lg inline-flex text-xs">
                                {platformData.douyin?.length > 0 && (
                                    <button 
                                        onClick={() => handlePlatformSelect('douyin')}
                                        className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'douyin' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500')}
                                    >
                                        抖音
                                    </button>
                                )}
                                {platformData.kuaishou?.length > 0 && (
                                    <button 
                                        onClick={() => handlePlatformSelect('kuaishou')}
                                        className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'kuaishou' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500')}
                                    >
                                        快手
                                    </button>
                                )}
                                {platformData.wechat?.length > 0 && (
                                    <button 
                                        onClick={() => handlePlatformSelect('wechat')}
                                        className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'wechat' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500')}
                                    >
                                        视频号
                                    </button>
                                )}
                            </div>
                            <div className="bg-gray-100 p-1 rounded-lg inline-flex text-xs">
                                <button onClick={() => setTopVideosMode('range')} className={cn("px-3 py-1 rounded-md transition-all", topVideosMode === 'range' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500')}>按分析周期</button>
                                <button onClick={() => setTopVideosMode('month')} className={cn("px-3 py-1 rounded-md transition-all", topVideosMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500')}>按月份</button>
                            </div>
                            {topVideosMode === 'month' && (
                                <select  
                                    value={selectedMonthForVideos}
                                    onChange={(e) => setPlatformSelectedMonthForVideos(e.target.value)}
                                    className="bg-white border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            )}
                            
                            {/* 平台对比选择 */}
                            <div className="bg-gray-100 p-1 rounded-lg inline-flex text-xs">
                                <button onClick={() => setShowPlatformComparison(!showPlatformComparison)} className={cn("px-3 py-1 rounded-md transition-all", showPlatformComparison ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500')}>平台对比</button>
                            </div>
                            {showPlatformComparison && (
                                <div className="bg-gray-100 p-1 rounded-lg inline-flex text-xs">
                                    {platformData.douyin?.length > 0 && (
                                        <button 
                                            onClick={() => setComparePlatform('douyin')}
                                            className={cn("px-3 py-1 rounded-md transition-all", comparePlatform === 'douyin' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500')}
                                        >
                                            抖音
                                        </button>
                                    )}
                                    {platformData.kuaishou?.length > 0 && (
                                        <button 
                                            onClick={() => setComparePlatform('kuaishou')}
                                            className={cn("px-3 py-1 rounded-md transition-all", comparePlatform === 'kuaishou' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500')}
                                        >
                                            快手
                                        </button>
                                    )}
                                    {platformData.wechat?.length > 0 && (
                                        <button 
                                            onClick={() => setComparePlatform('wechat')}
                                            className={cn("px-3 py-1 rounded-md transition-all", comparePlatform === 'wechat' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500')}
                                        >
                                            视频号
                                        </button>
                                    )}
                                </div>
                            )}
                            
                            {/* 平台搜索框 */}
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: selectedPlatform === 'douyin' ? '#ff0000' : selectedPlatform === 'kuaishou' ? '#fe2c55' : '#07C160' }} />
                                <input
                                    type="text"
                                    placeholder={`${selectedPlatform === 'douyin' ? '抖音' : selectedPlatform === 'kuaishou' ? '快手' : '视频号'}搜索视频...`}
                                    className="w-full pl-10 pr-24 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl text-sm focus:ring-2 outline-none transition-all"
                                    style={{ boxShadow: selectedPlatform === 'douyin' ? '0 0 0 2px rgba(255, 0, 0, 0.2)' : selectedPlatform === 'kuaishou' ? '0 0 0 2px rgba(254, 44, 85, 0.2)' : '0 0 0 2px rgba(7, 193, 96, 0.2)' }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const query = (e.target as HTMLInputElement).value;
                                            if (query) {
                                                let searchUrl = '';
                                                switch (selectedPlatform) {
                                                    case 'douyin':
                                                        searchUrl = `https://www.douyin.com/search/${encodeURIComponent(query)}`;
                                                        break;
                                                    case 'kuaishou':
                                                        searchUrl = `https://www.kuaishou.com/search/video?keyword=${encodeURIComponent(query)}`;
                                                        break;
                                                    case 'wechat':
                                                        searchUrl = `https://channels.weixin.qq.com/search?query=${encodeURIComponent(query)}`;
                                                        break;
                                                }
                                                window.open(searchUrl, '_blank');
                                            }
                                        }
                                    }}
                                />
                                <button
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-white text-xs font-bold transition-colors"
                                    style={{ backgroundColor: selectedPlatform === 'douyin' ? '#ff0000' : selectedPlatform === 'kuaishou' ? '#fe2c55' : '#07C160' }}
                                    onClick={(e) => {
                                        const input = (e.currentTarget.previousSibling as HTMLInputElement);
                                        const query = input.value;
                                        if (query) {
                                            let searchUrl = '';
                                            switch (selectedPlatform) {
                                                case 'douyin':
                                                    searchUrl = `https://www.douyin.com/search/${encodeURIComponent(query)}`;
                                                    break;
                                                case 'kuaishou':
                                                    searchUrl = `https://www.kuaishou.com/search/video?keyword=${encodeURIComponent(query)}`;
                                                    break;
                                                case 'wechat':
                                                    searchUrl = `https://channels.weixin.qq.com/search?query=${encodeURIComponent(query)}`;
                                                    break;
                                            }
                                            window.open(searchUrl, '_blank');
                                        }
                                    }}
                                >
                                    搜索
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4">排名</th>
                                    <th className="px-6 py-4">日期</th>
                                    <th className="px-6 py-4">标题</th>
                                    <th className="px-6 py-4">播放量</th>
                                    <th className="px-6 py-4">点赞</th>
                                    <th className="px-6 py-4">互动率</th>
                                    <th className="px-6 py-4">评论</th>
                                    {hasFavorites ? <th className="px-6 py-4">收藏</th> : hasRecommendations ? <th className="px-6 py-4">推荐</th> : null}
                                    <th className="px-6 py-4">转发</th>
                                    <th className="px-6 py-4">完播率</th>
                                    {showPlatformComparison && (
                                        <>
                                            <th className="px-6 py-4">{comparePlatform === 'douyin' ? '抖音' : comparePlatform === 'kuaishou' ? '快手' : '视频号'}播放量</th>
                                            <th className="px-6 py-4">{comparePlatform === 'douyin' ? '抖音' : comparePlatform === 'kuaishou' ? '快手' : '视频号'}点赞</th>
                                            <th className="px-6 py-4">{comparePlatform === 'douyin' ? '抖音' : comparePlatform === 'kuaishou' ? '快手' : '视频号'}互动率</th>
                                            <th className="px-6 py-4">播放量差异</th>
                                            <th className="px-6 py-4">点赞差异</th>
                                            <th className="px-6 py-4">互动率差异</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {(topVideosMode === 'range' ? top10ExplosiveVideos : monthlyTop10Videos).map((item, index) => {
                                    // 获取对比平台的对应排名视频
                                    const compareVideos = topVideosMode === 'range' ? compareTop10ExplosiveVideos : compareMonthlyTop10Videos;
                                    const compareItem = compareVideos[index];
                                    
                                    // 计算差异
                                    const viewsDiff = compareItem ? item.views - compareItem.views : null;
                                    const likesDiff = compareItem ? item.likes - compareItem.likes : null;
                                    const interactionRateDiff = compareItem ? item.interactionRate - compareItem.interactionRate : null;
                                    
                                    return (
                                        <motion.tr 
                                            key={index} 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="bg-white border-b hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-gray-200 text-gray-700'}`}>
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{item.date}</td>
                                            <td className="px-6 py-4 max-w-xs truncate" title={item.title}>
                                                <div className="font-medium text-gray-800 hover:text-blue-600 transition-colors">{item.title}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-blue-600">{item.views.toLocaleString()}</td>
                                            <td className="px-6 py-4">{item.likes.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-purple-600 font-medium">{item.interactionRate.toFixed(2)}%</span>
                                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-purple-500 rounded-full" 
                                                            style={{ width: `${Math.min(item.interactionRate * 2, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{item.comments}</td>
                                            {hasFavorites ? <td className="px-6 py-4">{item.favorites}</td> : hasRecommendations ? <td className="px-6 py-4">{item.recommendationsCount}</td> : null}
                                            <td className="px-6 py-4">{item.shares}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-green-600 font-medium">{item.completionRate}</span>
                                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-green-500 rounded-full" 
                                                            style={{ width: `${parseFloat(item.completionRate) || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            {showPlatformComparison && (
                                                <>
                                                    <td className="px-6 py-4">{compareItem ? compareItem.views.toLocaleString() : '-'}</td>
                                                    <td className="px-6 py-4">{compareItem ? compareItem.likes.toLocaleString() : '-'}</td>
                                                    <td className="px-6 py-4">{compareItem ? compareItem.interactionRate.toFixed(2) + '%' : '-'}</td>
                                                    <td className="px-6 py-4">
                                                        {viewsDiff !== null ? (
                                                            <span className={`font-medium ${viewsDiff > 0 ? 'text-green-600' : viewsDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                                                {viewsDiff > 0 ? '+' : ''}{viewsDiff.toLocaleString()}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {likesDiff !== null ? (
                                                            <span className={`font-medium ${likesDiff > 0 ? 'text-green-600' : likesDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                                                {likesDiff > 0 ? '+' : ''}{likesDiff.toLocaleString()}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {interactionRateDiff !== null ? (
                                                            <span className={`font-medium ${interactionRateDiff > 0 ? 'text-green-600' : interactionRateDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                                                {interactionRateDiff > 0 ? '+' : ''}{interactionRateDiff.toFixed(2)}%
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                </>
                                            )}
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {(topVideosMode === 'range' ? top10ExplosiveVideos.length === 0 : monthlyTop10Videos.length === 0) && (
                        <div className="p-8 text-center text-gray-400">当前所选日期范围内无数据</div>
                    )}
                </motion.div>

                {/* 标题词云图 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-white/50 overflow-hidden"
                >
                    <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="text-purple-500">💬</span> 
                            标题关键词词云
                        </h3>
                        <p className="text-sm text-gray-500">
                            显示{topVideosMode === 'range' ? '分析周期内' : `2025年${selectedMonthForVideos.split('-')[1]}月`}爆款视频标题中出现频率最高的关键词
                        </p>
                    </div>
                    <div className="p-6">
                        <div className="h-80">
                            {wordcloudData.length > 0 ? (
                                <ReactWordcloud
                                    options={wordcloudOptions}
                                    words={wordcloudData}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    无足够数据生成词云
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}

        {/* Daily Viral Videos Monitor */}
        {activeTab === 'viral' && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.1 }}
                className=""
            >
              <Suspense fallback={<div className="flex justify-center items-center h-64">加载中...</div>}>
                <ViralVideosSection />
              </Suspense>
            </motion.div>
        )}

        {/* 平台数据对比 */}
        {activeTab === 'platform' && showAnalysis && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
            >
                {platformComparisonData.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                    >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-500" />
                                平台数据对比概览
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">对比模式：</span>
                                <div className="bg-gray-100 p-1 rounded-lg inline-flex text-xs">
                                    <button 
                                        onClick={() => setPlatformCompareMode('overall')}
                                        className={`px-3 py-1 rounded-md transition-all ${platformCompareMode === 'overall' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        整体数据
                                    </button>
                                    <button 
                                        onClick={() => setPlatformCompareMode('monthly')}
                                        className={`px-3 py-1 rounded-md transition-all ${platformCompareMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        月度对比
                                    </button>
                                </div>
                                {platformCompareMode === 'monthly' && (
                                    <select
                                        value={selectedCompareMonth}
                                        onChange={(e) => setSelectedCompareMonth(e.target.value)}
                                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        {availableMonths.map(month => (
                                            <option key={month} value={month}>
                                                {month}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                        
                        {/* 平台卡片 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {(platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData).length > 0 ? (
                                (platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData).map((item) => (
                                    <motion.div
                                        key={item!.platform}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.15 }}
                                        className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-bold text-lg" style={{ color: item!.platform === 'douyin' ? '#ff0000' : item!.platform === 'kuaishou' ? '#fe2c55' : '#07C160' }}>
                                                {item!.platform === 'douyin' ? '抖音' : item!.platform === 'kuaishou' ? '快手' : '视频号'}
                                            </h4>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                {item!.videoCount} 个视频
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">{platformCompareMode === 'overall' ? '总播放量' : '月播放量'}</span>
                                                <span className="font-medium text-blue-600">{item!.totalViews.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">{platformCompareMode === 'overall' ? '总点赞量' : '月点赞量'}</span>
                                                <span className="font-medium text-red-500">{item!.totalLikes.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">{platformCompareMode === 'overall' ? '总评论量' : '月评论量'}</span>
                                                <span className="font-medium text-purple-500">{item!.totalComments.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">{platformCompareMode === 'overall' ? '总转发量' : '月转发量'}</span>
                                                <span className="font-medium text-green-500">{item!.totalShares.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">平均互动率</span>
                                                <span className="font-medium text-orange-500">{item!.avgInteractionRate.toFixed(2)}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">平均完播率</span>
                                                <span className="font-medium text-teal-500">{item!.avgCompletionRate.toFixed(2)}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">最新粉丝数</span>
                                                <span className="font-medium text-pink-500">{item!.latestFans.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center p-12 bg-gray-50 rounded-xl">
                                    <Activity className="w-12 h-12 text-gray-400 mb-4" />
                                    <h4 className="font-medium text-gray-700 mb-2">暂无数据</h4>
                                    <p className="text-gray-500 text-center">{platformCompareMode === 'overall' ? '请先上传各平台的数据' : '请选择有数据的月份'}</p>
                                </div>
                            )}
                        </div>

                        {/* 数据对比表格 */}
                        <h4 className="font-bold text-gray-700 mb-4">详细数据对比</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4">平台</th>
                                        <th className="px-6 py-4">视频数</th>
                                        <th className="px-6 py-4">{platformCompareMode === 'overall' ? '总播放量' : '月播放量'}</th>
                                        <th className="px-6 py-4">{platformCompareMode === 'overall' ? '总点赞' : '月点赞'}</th>
                                        <th className="px-6 py-4">{platformCompareMode === 'overall' ? '总评论' : '月评论'}</th>
                                        <th className="px-6 py-4">{platformCompareMode === 'overall' ? '总转发' : '月转发'}</th>
                                        <th className="px-6 py-4">平均播放量</th>
                                        <th className="px-6 py-4">平均点赞</th>
                                        <th className="px-6 py-4">互动率</th>
                                        <th className="px-6 py-4">完播率</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData).length > 0 ? (
                                        (platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData).map((item) => (
                                            <motion.tr
                                                key={item!.platform}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.15 }}
                                                className="bg-white border-b hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    <span style={{ color: item!.platform === 'douyin' ? '#ff0000' : item!.platform === 'kuaishou' ? '#fe2c55' : '#07C160' }}>
                                                        {item!.platform === 'douyin' ? '抖音' : item!.platform === 'kuaishou' ? '快手' : '视频号'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">{item!.videoCount}</td>
                                                <td className="px-6 py-4 font-medium text-blue-600">{item!.totalViews.toLocaleString()}</td>
                                                <td className="px-6 py-4">{item!.totalLikes.toLocaleString()}</td>
                                                <td className="px-6 py-4">{item!.totalComments.toLocaleString()}</td>
                                                <td className="px-6 py-4">{item!.totalShares.toLocaleString()}</td>
                                                <td className="px-6 py-4">{item!.avgViews.toLocaleString()}</td>
                                                <td className="px-6 py-4">{item!.avgLikes.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-purple-600 font-medium">{item!.avgInteractionRate.toFixed(2)}%</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-green-600 font-medium">{item!.avgCompletionRate.toFixed(2)}%</span>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr className="bg-white border-b">
                                            <td colSpan={10} className="px-6 py-12 text-center">
                                                <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                <p className="text-gray-500">{platformCompareMode === 'overall' ? '暂无平台数据' : '该月份暂无数据'}</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 平台对比图表 */}
                        <h4 className="font-bold text-gray-700 mb-4 mt-8">可视化对比</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 播放量对比 */}
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h5 className="font-medium text-gray-700 mb-4 text-center">各平台{platformCompareMode === 'overall' ? '总播放量' : '月播放量'}对比</h5>
                                <div className="space-y-3">
                                    {(platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData).length > 0 ? (
                                        (platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData).map((item) => {
                                            const currentData = platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData;
                                            const maxViews = Math.max(...currentData.map(p => p!.totalViews));
                                            const percentage = (item!.totalViews / maxViews) * 100;
                                            return (
                                                <div key={item!.platform} className="flex items-center gap-3">
                                                    <span className="w-16 text-sm font-medium" style={{ color: item!.platform === 'douyin' ? '#ff0000' : item!.platform === 'kuaishou' ? '#fe2c55' : '#07C160' }}>
                                                        {item!.platform === 'douyin' ? '抖音' : item!.platform === 'kuaishou' ? '快手' : '视频号'}
                                                    </span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
                                                            style={{ 
                                                                width: `${percentage}%`,
                                                                backgroundColor: item!.platform === 'douyin' ? '#ff0000' : item!.platform === 'kuaishou' ? '#fe2c55' : '#07C160'
                                                            }}
                                                        >
                                                            {item!.totalViews.toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <Activity className="w-8 h-8 text-gray-400 mb-2" />
                                            <p className="text-gray-500">{platformCompareMode === 'overall' ? '暂无平台数据' : '该月份暂无数据'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 互动率对比 */}
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h5 className="font-medium text-gray-700 mb-4 text-center">各平台平均互动率对比</h5>
                                <div className="space-y-3">
                                    {(platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData).length > 0 ? (
                                        (platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData).map((item) => {
                                            const currentData = platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData;
                                            const maxInteraction = Math.max(...currentData.map(p => p!.avgInteractionRate));
                                            const percentage = (item!.avgInteractionRate / maxInteraction) * 100;
                                            return (
                                                <div key={item!.platform} className="flex items-center gap-3">
                                                    <span className="w-16 text-sm font-medium" style={{ color: item!.platform === 'douyin' ? '#ff0000' : item!.platform === 'kuaishou' ? '#fe2c55' : '#07C160' }}>
                                                        {item!.platform === 'douyin' ? '抖音' : item!.platform === 'kuaishou' ? '快手' : '视频号'}
                                                    </span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
                                                            style={{ 
                                                                width: `${percentage}%`,
                                                                backgroundColor: item!.platform === 'douyin' ? '#ff0000' : item!.platform === 'kuaishou' ? '#fe2c55' : '#07C160'
                                                            }}
                                                        >
                                                            {item!.avgInteractionRate.toFixed(2)}%
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <Activity className="w-8 h-8 text-gray-400 mb-2" />
                                            <p className="text-gray-500">{platformCompareMode === 'overall' ? '暂无平台数据' : '该月份暂无数据'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 综合评分雷达图 */}
                            <div className="bg-gray-50 p-4 rounded-xl lg:col-span-2">
                                <h5 className="font-medium text-gray-700 mb-4 text-center">各平台综合评分雷达图</h5>
                                {(platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData).length > 0 ? (
                                    <div className="h-96">
                                        <Suspense fallback={
  <div className="flex justify-center items-center h-96">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
}>
  <PlatformChartsWrapper
    platformData={(platformCompareMode === 'overall' ? platformComparisonData : monthlyPlatformComparisonData).filter(Boolean) as any}
    platformCompareMode={platformCompareMode}
  />
</Suspense>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <Activity className="w-8 h-8 text-gray-400 mb-2" />
                                        <p className="text-gray-500">{platformCompareMode === 'overall' ? '暂无平台数据' : '该月份暂无数据'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="bg-white/80 backdrop-blur-md p-12 rounded-xl shadow-lg border border-white/50 flex flex-col items-center justify-center">
                        <Activity className="w-16 h-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-bold text-gray-700 mb-2">暂无平台数据</h3>
                        <p className="text-gray-500 text-center mb-6">请先上传Excel文件数据，然后再查看平台数据对比</p>
                        <button
                            onClick={() => document.getElementById('fileInput')?.click()}
                            className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
                        >
                            上传数据
                        </button>
                    </div>
                )}
            </motion.div>
        )}

        </div>
      </div>
    </div>
  );
}
