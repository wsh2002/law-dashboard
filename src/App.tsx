import React, { useState, useMemo, useEffect, ChangeEvent, lazy, Suspense } from 'react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
// import { MOCK_DATA } from './data/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ComposedChart, ScatterChart, Scatter, ZAxis, ReferenceLine
} from 'recharts';
import { Upload, Calendar, ArrowUp, ArrowDown, FileSpreadsheet, TrendingUp, Activity, Heart, GitMerge, Sparkles, Play, MessageCircle, Share2, Users, Star, ThumbsUp, Search } from 'lucide-react';
import { format, parse, addDays, isValid, startOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { cn } from './lib/utils';

// 懒加载组件
const ViralVideosSection = lazy(() => import('./components/ViralVideosSection'));
const AARRRAnalysis = lazy(() => import('./components/AARRRAnalysis'));
const AIAnalysisCard = lazy(() => import('./components/AIAnalysisCard'));
const AnimatedBackground = lazy(() => import('./components/AnimatedBackground'));
const Login = lazy(() => import('./components/Login'));

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

// 文案历史和用户反馈类型
export type CopywritingHistory = {
  id: string;
  input: string;
  output: string;
  style: string;
  platform: string;
  createdAt: string;
  rating?: number; // 1-5星
  feedback?: string;
  modifiedContent?: string;
  isAdopted?: boolean; // 是否被采用
  performance?: {
    views?: number;
    likes?: number;
    comments?: number;
    completionRate?: number;
    shareRate?: number;
    publishDate?: string;
  };
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

const KPICard = ({ title, value, compareValue, unit = '', icon: Icon }: { title: string, value: number, compareValue?: number, unit?: string, icon?: any }) => {
  const delta = compareValue !== undefined ? value - compareValue : 0;
  const percent = compareValue ? ((delta / compareValue) * 100).toFixed(1) : 0;
  const isPositive = delta >= 0;

  return (
    <motion.div 
      whileHover={{ scale: 1.05, translateY: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-gray-400" />}
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-gray-900">
          {value.toLocaleString()} <span className="text-sm font-normal text-gray-400">{unit}</span>
        </div>
        {compareValue !== undefined && (
          <div className={cn("flex items-center text-sm font-medium", isPositive ? "text-red-600" : "text-green-600")}>
            {isPositive ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
            {Math.abs(Number(percent))}%
          </div>
        )}
      </div>
      {compareValue !== undefined && (
        <div className="text-xs text-gray-400 mt-2">
          对比: {compareValue.toLocaleString()}
        </div>
      )}
    </motion.div>
  );
};



export default function App() {
  // 从 localStorage 加载状态，如果没有则使用默认值
  const loadState = () => {
    try {
      const savedState = localStorage.getItem('lawDashboardState');
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
      localStorage.setItem('lawDashboardState', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state to localStorage:', error);
    }
  };

  // 加载保存的状态或使用默认值
  const savedState = loadState();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [data, setData] = useState<DataItem[]>([]);
  const [platformData, setPlatformData] = useState<Record<string, DataItem[]>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<'douyin' | 'kuaishou' | 'wechat'>('douyin');
  // 月份筛选状态
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [tabPlatforms, setTabPlatforms] = useState<Record<string, 'douyin' | 'kuaishou' | 'wechat'>>({
    overview: 'douyin',
    monthly: 'douyin',
    range: 'douyin',
    personal: 'douyin',
    viral: 'douyin',
    rewrite: 'douyin'
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'range' | 'personal' | 'viral' | 'rewrite'>('overview');
  // 文案创作相关状态
  const [copywritingInput, setCopywritingInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  // 文案版本管理
  const [copywritingVersions, setCopywritingVersions] = useState<{id: number, content: string}[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(0);
  // 文案历史和反馈状态
  const [copywritingHistory, setCopywritingHistory] = useState<CopywritingHistory[]>(savedState?.copywritingHistory || []);
  const [currentCopywritingId, setCurrentCopywritingId] = useState<string | null>(null);
  // 爆款文案库状态
  const [viralCopywritingLibrary, setViralCopywritingLibrary] = useState<CopywritingHistory[]>([]);
  // 上传文案库状态
  const [uploadedCopywritingLibrary, setUploadedCopywritingLibrary] = useState<CopywritingHistory[]>(savedState?.uploadedCopywritingLibrary || []);
  // 文案库模态框状态
  const [showCopywritingLibrary, setShowCopywritingLibrary] = useState<boolean>(false);
  
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
  const currentTimeRanges = platformTimeRanges[selectedPlatform];
  const { trendRange, trendMode, viewsTrendRange, viewsTrendMode, aiDateRange, monthA, monthB, selectedMonthForVideos, dateRange, compareRange } = currentTimeRanges;

  // 当状态变化时保存到 localStorage
  useEffect(() => {
    saveState({
      dataDateRange,
      showAnalysis,
      platformTimeRanges,
      tabPlatforms,
      copywritingHistory,
      uploadedCopywritingLibrary
    });
  }, [dataDateRange, showAnalysis, platformTimeRanges, tabPlatforms, copywritingHistory, uploadedCopywritingLibrary]);

  // 当切换标签页时，更新 selectedPlatform 为该标签页的平台选择
  useEffect(() => {
    setSelectedPlatform(tabPlatforms[activeTab]);
  }, [activeTab, tabPlatforms]);

  // 平台选择处理函数
  const handlePlatformSelect = async (platform: 'douyin' | 'kuaishou' | 'wechat') => {
    setTabPlatforms(prev => ({
      ...prev,
      [activeTab]: platform
    }));
    
    // 直接更新selectedPlatform，确保立即生效
    setSelectedPlatform(platform);
    
    // 移除自动生成文案的逻辑，让用户点击开始文案创作按钮才生成
  };

  // 用户反馈处理函数
  const handleRating = (id: string, rating: number) => {
    setCopywritingHistory(prev => 
      prev.map(item => 
        item.id === id ? { ...item, rating } : item
      )
    );
  };

  const handleFeedback = (id: string, feedback: string) => {
    setCopywritingHistory(prev => 
      prev.map(item => 
        item.id === id ? { ...item, feedback } : item
      )
    );
  };

  const handleModifiedContent = (id: string, modifiedContent: string) => {
    setCopywritingHistory(prev => 
      prev.map(item => 
        item.id === id ? { ...item, modifiedContent } : item
      )
    );
  };

  const handleAdopted = (id: string, isAdopted: boolean) => {
    setCopywritingHistory(prev => 
      prev.map(item => 
        item.id === id ? { ...item, isAdopted } : item
      )
    );
  };

  const handlePerformance = (id: string, performance: CopywritingHistory['performance']) => {
    setCopywritingHistory(prev => 
      prev.map(item => 
        item.id === id ? { ...item, performance } : item
      )
    );
  };

  // 持续学习逻辑：根据用户反馈和效果数据优化提示词
  const getOptimizedPrompt = () => {
    // 分析历史数据，提取成功模式
    const highRatingCopies = copywritingHistory.filter(item => item.rating && item.rating >= 4);
    const highPerformanceCopies = copywritingHistory.filter(item => item.performance?.views && item.performance.views > 10000);
    
    // 提取成功的风格和平台组合
    const successfulStyles = highRatingCopies.map(item => item.style);
    const successfulPlatforms = highRatingCopies.map(item => item.platform);
    
    // 统计最成功的风格
    const styleCounts: Record<string, number> = {};
    successfulStyles.forEach(style => {
      styleCounts[style] = (styleCounts[style] || 0) + 1;
    });
    const mostSuccessfulStyle = Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'professional';
    
    // 统计最成功的平台
    const platformCounts: Record<string, number> = {};
    successfulPlatforms.forEach(platform => {
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });
    const mostSuccessfulPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || selectedPlatform;
    
    // 生成优化后的提示词
    const optimizedPrompt = `
你是法律爆款文案专家，已学习 1000+ 条高播放量视频。

## 爆款开头（3秒黄金法则）
- 悬念式: "你知道吗？90%的人都不知道..."
- 案例式: "小王被辞退，却拿到30万赔偿..."
- 提问式: "遇到这种情况，你会怎么办？"
- 冲突式: "公司说不给加班费？那是他们不懂法！"

## 内容结构
1. 开头: 3秒抓住注意力
2. 中间: 讲清法律知识（简单易懂），包含具体案例
3. 结尾: 自然引导互动，鼓励点赞评论

## 语言要求
- 口语化，像朋友聊天
- 专业但不生硬
- 制造情绪共鸣
- 金句要有记忆点

## 生成要求
- 每次生成 3-5 个版本
- 明确标注[开头]、[中间]、[结尾]部分
- 给出推荐理由
- 语言要清晰易懂，让运营人员能快速理解
- 为每个版本提供详细的运营建议，包括以下几个方面：
  1. **视频呈现**：详细说明背景音乐选择、视觉元素设计、画面布局等
  2. **发布文案**：详细说明发布文案的结构、关键词、话题标签等
  3. **互动引导**：详细说明如何引导用户互动、如何回复评论等
  4. **风格统一**：详细说明主播形象、语速、语调等
  5. **平台特点**：根据所选平台的特点，提供针对性的运营建议
- 请严格按照以下格式生成多个版本：
  
  ## 版本1:
  [开头]
  开头内容
  [中间]
  中间内容
  [结尾]
  结尾内容
  [推荐理由]
  推荐理由
  [运营建议]
  运营建议
  
  ## 版本2:
  [开头]
  开头内容
  [中间]
  中间内容
  [结尾]
  结尾内容
  [推荐理由]
  推荐理由
  [运营建议]
  运营建议
  
  ## 版本3:
  [开头]
  开头内容
  [中间]
  中间内容
  [结尾]
  结尾内容
  [推荐理由]
  推荐理由
  [运营建议]
  运营建议

## 历史成功经验
${highRatingCopies.length > 0 ? `
- 最成功的风格: ${mostSuccessfulStyle === 'professional' ? '专业法律' : mostSuccessfulStyle === 'conversational' ? '口语化' : mostSuccessfulStyle === 'storytelling' ? '故事化' : '专业法律'}
- 最成功的平台: ${mostSuccessfulPlatform === 'douyin' ? '抖音' : mostSuccessfulPlatform === 'kuaishou' ? '快手' : '视频号'}
- 成功案例数: ${highRatingCopies.length}
- 高播放量案例数: ${highPerformanceCopies.length}
` : ''}

[主题]: ${copywritingInput}

[风格要求]: 专业法律

[平台要求]: ${selectedPlatform === 'douyin' ? '抖音' : selectedPlatform === 'kuaishou' ? '快手' : '视频号'}

请根据以上要求，生成高转化率的法律短视频文案，确保结构清晰，运营人员能一目了然。
    `;
    
    return optimizedPrompt;
  };

  // 更新爆款文案库
  const updateViralLibrary = () => {
    // 筛选高评分、高播放量的文案
    const viralCopies = copywritingHistory
      .filter(item => 
        (item.rating && item.rating >= 4) || 
        (item.performance?.views && item.performance.views > 10000) ||
        item.isAdopted
      )
      .sort((a, b) => {
        // 按评分和播放量排序
        const scoreA = (a.rating || 0) + (a.performance?.views || 0) / 10000;
        const scoreB = (b.rating || 0) + (b.performance?.views || 0) / 10000;
        return scoreB - scoreA;
      })
      .slice(0, 20); // 只保留前20个
    
    setViralCopywritingLibrary(viralCopies);
  };

  // 当文案历史更新时，自动更新爆款文案库
  useEffect(() => {
    updateViralLibrary();
  }, [copywritingHistory]);

  // 文案创作相关处理函数
  const handleCopywritingInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCopywritingInput(e.target.value);
  };

  // 当用户手动输入或复制粘贴文案时，保存到文案库
  const handleCopywritingInputBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    if (content.trim()) {
      // 检查是否已经存在相同的文案
      const exists = uploadedCopywritingLibrary.some(item => item.input === content);
      if (!exists) {
        // 保存到上传文案库
        const newUploadedCopywriting: CopywritingHistory = {
          id: Date.now().toString(),
          input: content,
          output: '',
          style: 'professional',
          platform: selectedPlatform,
          createdAt: new Date().toISOString(),
          isAdopted: false
        };
        
        setUploadedCopywritingLibrary(prev => [newUploadedCopywriting, ...prev]);
      }
    }
  };

  const handleStartCopywriting = async () => {
    if (!copywritingInput.trim()) {
      alert('请输入文案主题或关键词');
      return;
    }

    setIsGenerating(true);
    try {
      // 导入 AI 分析服务
      const { DEFAULT_CONFIG, fetchAIAnalysis } = await import('./services/aiAnalysis');
      
      // 使用优化后的提示词生成文案
      const prompt = getOptimizedPrompt();
      
      // 使用 deepseek-chat 模型生成文案
      const output = await fetchAIAnalysis(DEFAULT_CONFIG, prompt);
      
      // 解析文案版本
      const versions = parseCopywritingVersions(output);
      setCopywritingVersions(versions);
      setCurrentVersionIndex(0);
      
      // 保存每个版本到文案历史
      const versionHistories: CopywritingHistory[] = versions.map((version, index) => ({
        id: `${Date.now()}-v${index + 1}`,
        input: copywritingInput,
        output: version.content,
        style: 'professional',
        platform: selectedPlatform,
        createdAt: new Date().toISOString(),
        isAdopted: false
      }));
      
      // 去重：过滤掉与现有历史记录中内容相同的版本
      const uniqueVersionHistories = versionHistories.filter(newVersion => {
        return !copywritingHistory.some(existingVersion => 
          existingVersion.output === newVersion.output && 
          existingVersion.platform === newVersion.platform
        );
      });
      
      // 保存所有版本到历史记录
      // 只保留每个输入和平台的最新5个版本
      setCopywritingHistory(prev => {
        // 过滤掉与当前输入和平台相同的旧版本
        const filteredHistory = prev.filter(item => 
          !(item.input === copywritingInput && item.platform === selectedPlatform)
        );
        // 添加新生成的版本，并限制每个输入和平台最多5个版本
        return [...uniqueVersionHistories, ...filteredHistory];
      });
      // 设置当前文案ID为第一个版本
      if (uniqueVersionHistories.length > 0) {
        setCurrentCopywritingId(uniqueVersionHistories[0].id);
      }
    } catch (error) {
      console.error('生成文案失败:', error);
      alert('生成文案失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 解析文案版本
  const parseCopywritingVersions = (output: string): {id: number, content: string}[] => {
    // 尝试多种格式解析版本
    
    // 格式1: ## 版本1: 内容
    const versionRegex1 = /## 版本\s*[\d一二三四五]+[:：]/g;
    const versions1 = output.split(versionRegex1);
    const parsedVersions1 = versions1
      .filter((version, index) => index > 0 && version.trim())
      .map((version, index) => ({
        id: index + 1,
        content: version.trim()
      }));
    
    if (parsedVersions1.length > 0) {
      return parsedVersions1.slice(0, 5); // 限制最多5个版本
    }
    
    // 格式2: 版本1: 内容
    const versionRegex2 = /版本\s*[\d一二三四五]+[:：]/g;
    const versions2 = output.split(versionRegex2);
    const parsedVersions2 = versions2
      .filter((version, index) => index > 0 && version.trim())
      .map((version, index) => ({
        id: index + 1,
        content: version.trim()
      }));
    
    if (parsedVersions2.length > 0) {
      return parsedVersions2.slice(0, 5); // 限制最多5个版本
    }
    
    // 格式3: # 版本1 内容
    const versionRegex3 = /# 版本\s*[\d一二三四五]+/g;
    const versions3 = output.split(versionRegex3);
    const parsedVersions3 = versions3
      .filter((version, index) => index > 0 && version.trim())
      .map((version, index) => ({
        id: index + 1,
        content: version.trim()
      }));
    
    if (parsedVersions3.length > 0) {
      return parsedVersions3.slice(0, 5); // 限制最多5个版本
    }
    
    // 如果没有解析到版本，使用原始文案作为一个版本
    return [{
      id: 1,
      content: output.trim()
    }];
  };

  // 切换文案版本
  const handleVersionChange = (index: number) => {
    setCurrentVersionIndex(index);
  };

  // 上传文案处理函数
  const handleUploadCopywriting = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCopywritingInput(content);
        
        // 保存到上传文案库
        const newUploadedCopywriting: CopywritingHistory = {
          id: Date.now().toString(),
          input: content,
          output: '',
          style: 'professional',
          platform: selectedPlatform,
          createdAt: new Date().toISOString(),
          isAdopted: false
        };
        
        setUploadedCopywritingLibrary(prev => [newUploadedCopywriting, ...prev]);
        alert('文案上传成功！已保存到文案库');
      }
    };
    reader.readAsText(file);
  };

  // 查看文案库处理函数
  const handleViewCopywritingLibrary = () => {
    setShowCopywritingLibrary(true);
  };

  // 关闭文案库模态框
  const handleCloseCopywritingLibrary = () => {
    setShowCopywritingLibrary(false);
  };

  // 从文案库选择文案
  const handleSelectFromLibrary = (copywriting: CopywritingHistory) => {
    setCopywritingInput(copywriting.input);
    setSelectedPlatform(copywriting.platform as 'douyin' | 'kuaishou' | 'wechat');
    setShowCopywritingLibrary(false);
    alert('已选择文案，可进行二创');
  };

  // Platform-specific setters
  const setPlatformTrendRange = (range: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => {
    setPlatformTimeRanges(prev => {
      const newRange = typeof range === 'function' ? range(prev[selectedPlatform].trendRange) : range;
      return {
        ...prev,
        [selectedPlatform]: {
          ...prev[selectedPlatform],
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
    setPlatformTimeRanges(prev => ({
      ...prev,
      [selectedPlatform]: {
        ...prev[selectedPlatform],
        trendMode: mode
      }
    }));
  };

  const setPlatformViewsTrendRange = (range: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => {
    setPlatformTimeRanges(prev => {
      const newRange = typeof range === 'function' ? range(prev[selectedPlatform].viewsTrendRange) : range;
      return {
        ...prev,
        [selectedPlatform]: {
          ...prev[selectedPlatform],
          viewsTrendRange: newRange
        }
      };
    });
  };

  const setPlatformViewsTrendMode = (mode: 'daily' | 'weekly' | 'monthly' | 'quarterly') => {
    setPlatformTimeRanges(prev => ({
      ...prev,
      [selectedPlatform]: {
        ...prev[selectedPlatform],
        viewsTrendMode: mode
      }
    }));
  };

  const setPlatformAiDateRange = (range: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => {
    setPlatformTimeRanges(prev => {
      const newRange = typeof range === 'function' ? range(prev[selectedPlatform].aiDateRange) : range;
      return {
        ...prev,
        [selectedPlatform]: {
          ...prev[selectedPlatform],
          aiDateRange: newRange
        }
      };
    });
  };

  // Month comparison setters
  const setPlatformMonthA = (month: string) => {
    setPlatformTimeRanges(prev => ({
      ...prev,
      [selectedPlatform]: {
        ...prev[selectedPlatform],
        monthA: month
      }
    }));
  };

  const setPlatformMonthB = (month: string) => {
    setPlatformTimeRanges(prev => ({
      ...prev,
      [selectedPlatform]: {
        ...prev[selectedPlatform],
        monthB: month
      }
    }));
  };

  const setPlatformSelectedMonthForVideos = (month: string) => {
    setPlatformTimeRanges(prev => ({
      ...prev,
      [selectedPlatform]: {
        ...prev[selectedPlatform],
        selectedMonthForVideos: month
      }
    }));
  };

  // Date range setters
  const setPlatformDateRange = (range: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => {
    setPlatformTimeRanges(prev => {
      const newRange = typeof range === 'function' ? range(prev[selectedPlatform].dateRange) : range;
      return {
        ...prev,
        [selectedPlatform]: {
          ...prev[selectedPlatform],
          dateRange: newRange
        }
      };
    });
  };

  const setPlatformCompareRange = (range: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => {
    setPlatformTimeRanges(prev => {
      const newRange = typeof range === 'function' ? range(prev[selectedPlatform].compareRange) : range;
      return {
        ...prev,
        [selectedPlatform]: {
          ...prev[selectedPlatform],
          compareRange: newRange
        }
      };
    });
  };

  const [topVideosMode, setTopVideosMode] = useState<'range' | 'month'>('range');

  const [detailTrendMode, setDetailTrendMode] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily');

  // User Name extracted from file
  const [userNames, setUserNames] = useState<Record<string, string>>({});



  // File Upload Handler
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process each file
    Array.from(files).forEach((file: File) => {
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
            setUserNames(prev => ({
                ...prev,
                [platform]: name
            }));
        }
        
        // Set the first extracted platform as the current selected platform
        if (platform && files[0] === file) {
            handlePlatformSelect(platform);
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rawData = XLSX.utils.sheet_to_json(ws);
          const parsedData = parseData(rawData, platform);
          
          if (parsedData.length > 0) {
              // 合并新数据到现有数据中，而不是替换
              setData(prevData => {
                  // 合并数据
                  const mergedData = [...prevData, ...parsedData];
                  
                  // 按平台分组数据
                  const groupedData: Record<string, DataItem[]> = {
                      douyin: [],
                      kuaishou: [],
                      wechat: []
                  };
                  
                  mergedData.forEach(item => {
                      if (item.platform) {
                          groupedData[item.platform].push(item);
                      }
                  });
                  
                  // 更新platformData
                  setPlatformData(groupedData);
                  
                  // 自动调整日期范围 - 只针对当前上传的平台
              if (platform) {
                  // 过滤出当前平台的数据
                  const platformData = groupedData[platform];
                  if (platformData.length > 0) {
                      const dates = platformData.map(d => d.parsedDate.getTime()).sort((a, b) => a - b);
                      const minDate = new Date(dates[0]);
                      const maxDate = new Date(dates[dates.length - 1]);
                      const midDate = new Date(dates[Math.floor(dates.length / 2)]);
                      
                      const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
                      
                      // 更新日期范围
                      setPlatformAiDateRange({ start: fmt(minDate), end: fmt(maxDate) });
                      setPlatformTrendRange({ start: fmt(minDate), end: fmt(maxDate) });
                      setPlatformViewsTrendRange({ start: fmt(minDate), end: fmt(maxDate) });

                      // 更新月度比较默认值
                      const months = Array.from(new Set(platformData.map(d => format(d.parsedDate, 'yyyy-MM')))).sort();
                      if (months.length > 0) {
                          setPlatformMonthA(months[0]);
                          setPlatformMonthB(months.length > 1 ? months[months.length - 1] : months[0]);
                          setPlatformSelectedMonthForVideos(months[0]);
                      }

                      // 设置默认日期范围
                      setPlatformDateRange({ start: fmt(minDate), end: fmt(midDate) });
                      setPlatformCompareRange({ start: fmt(addDays(midDate, 1)), end: fmt(maxDate) });
                  }
              }
              
              // 更新整体数据日期范围
              const allDates = mergedData.map(d => d.parsedDate.getTime()).sort((a, b) => a - b);
              const allMinDate = new Date(allDates[0]);
              const allMaxDate = new Date(allDates[allDates.length - 1]);
              setDataDateRange({ start: format(allMinDate, 'yyyy-MM-dd'), end: format(allMaxDate, 'yyyy-MM-dd') });
              
              // 上传数据后自动显示分析内容
              setShowAnalysis(true);
              
              return mergedData;
          });
      }
    };
    reader.readAsBinaryString(file as Blob);
    });
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
    
    // 限制数据点数量，提高图表渲染性能
    if (result.length > 30) {
        const step = Math.ceil(result.length / 30);
        result = result.filter((_, index) => index % step === 0);
    }
    
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
    
    // 限制数据点数量，提高图表渲染性能
    if (result.length > 30) {
        const step = Math.ceil(result.length / 30);
        result = result.filter((_, index) => index % step === 0);
    }
    
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

    return platformItems
      .filter(item => format(item.parsedDate, 'yyyy-MM') === selectedMonth) // 筛选选中月份的数据
      .map(item => {
        let category = ''; // No default category
        if (item.views > 500000 && item.views > totalFans * 5) {
          category = '大爆款';
        } else if (item.views > 150000 && item.views > totalFans * 1.5) {
          category = '中爆款';
        } else if (item.views > 50000 && item.views > totalFans * 0.5) {
          category = '小爆款';
        } else if (item.views >= 3000 && item.views <= 10000) {
          category = '正常播放';
        }

        return { ...item, category };
      }).filter(item => item.category); // Only include items that have a category
  }, [platformData, selectedPlatform, selectedMonth]);

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

  if (!isLoggedIn) {
      return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen">加载中...</div>}>
          <Login onLogin={() => setIsLoggedIn(true)} />
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
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4}/>
          </linearGradient>
          <linearGradient id="colorBViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.4}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis fontSize={12} stroke="#94a3b8" domain={[0, 'dataMax * 1.2']} />
        <Tooltip 
          cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} 
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
        <Bar dataKey="A" name={`月份 A (${monthA})`} fill="url(#colorAViews)" radius={[8, 8, 0, 0]} animationDuration={1000} />
        <Bar dataKey="B" name={`月份 B (${monthB})`} fill="url(#colorBViews)" radius={[8, 8, 0, 0]} animationDuration={1000} />
      </BarChart>
    </ResponsiveContainer>
  ));

  const MonthlyOtherKPIsChart = React.memo(() => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthComparisonChartData} barSize={60} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorAKPIs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4}/>
          </linearGradient>
          <linearGradient id="colorBKPIs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.4}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis fontSize={12} stroke="#94a3b8" domain={[0, 'dataMax * 1.2']} />
        <Tooltip 
          cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} 
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
        <Bar dataKey="A" name={`月份 A (${monthA})`} fill="url(#colorAKPIs)" radius={[8, 8, 0, 0]} animationDuration={1000} />
        <Bar dataKey="B" name={`月份 B (${monthB})`} fill="url(#colorBKPIs)" radius={[8, 8, 0, 0]} animationDuration={1000} />
      </BarChart>
    </ResponsiveContainer>
  ));

  const MonthlyCommentChart = React.memo(() => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthCommentComparisonData} barSize={60} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorAComment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eab308" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#eab308" stopOpacity={0.4}/>
          </linearGradient>
          <linearGradient id="colorBComment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.4}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis fontSize={12} stroke="#94a3b8" domain={[0, 'dataMax * 1.2']} />
        <Tooltip 
          cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} 
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
        <Bar dataKey="A" name={`月份 A (${monthA})`} fill="url(#colorAComment)" radius={[8, 8, 0, 0]} animationDuration={1000} />
        <Bar dataKey="B" name={`月份 B (${monthB})`} fill="url(#colorBComment)" radius={[8, 8, 0, 0]} animationDuration={1000} />
      </BarChart>
    </ResponsiveContainer>
  ));

  const MonthlyRateChart = React.memo(() => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthRateComparisonData} barSize={60} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorARate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4}/>
          </linearGradient>
          <linearGradient id="colorBRate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.4}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis fontSize={12} stroke="#94a3b8" domain={[0, 'dataMax * 1.2']} />
        <Tooltip 
          cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} 
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
        <Bar dataKey="A" name={`月份 A (${monthA})`} fill="url(#colorARate)" radius={[8, 8, 0, 0]} animationDuration={1000} />
        <Bar dataKey="B" name={`月份 B (${monthB})`} fill="url(#colorBRate)" radius={[8, 8, 0, 0]} animationDuration={1000} />
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
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="month" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis yAxisId="left" fontSize={12} stroke="#3b82f6" label={{ value: '月播放量', angle: -90, position: 'insideLeft' }} domain={[0, 'dataMax * 1.2']} />
        <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#f43f5e" label={{ value: '月点赞量', angle: 90, position: 'insideRight' }} domain={[0, 'dataMax * 1.2']} />
        <Tooltip 
          cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} 
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
        <Bar yAxisId="left" dataKey="views" name="月播放量" fill="url(#colorViews)" radius={[8, 8, 0, 0]} animationDuration={1000} />
        <Line yAxisId="right" type="monotone" dataKey="likes" name="月点赞量" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} animationDuration={1000} />
      </ComposedChart>
    </ResponsiveContainer>
  ));

  const MonthlyNetFansChart = React.memo(() => (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={monthlyData}>
        <defs>
          <linearGradient id="colorNetFans" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.4}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="month" fontSize={12} tickMargin={10} stroke="#94a3b8" />
        <YAxis fontSize={12} stroke="#10b981" label={{ value: '月净增粉', angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
        <Tooltip 
          cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} 
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
        <Line type="monotone" dataKey="netFans" name="月净增粉" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} animationDuration={1000} />
        <Bar dataKey="netFans" name="月净增粉" fill="url(#colorNetFans)" radius={[8, 8, 0, 0]} animationDuration={1000} />
      </ComposedChart>
    </ResponsiveContainer>
  ));

  return (
    <div className="min-h-screen relative font-sans text-slate-800 overflow-x-hidden">
      <Suspense fallback={<div className="flex justify-center items-center h-screen">加载中...</div>}>
        <AnimatedBackground />
      </Suspense>
      <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-white/50"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              多平台运营诊断
            </h1>
            <p className="text-slate-500 mt-2">支持 CSV/Excel 导入 · 自动识别日期范围</p>
            {data.length > 0 && dataDateRange && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-sm font-medium"
              >
                <Calendar className="w-4 h-4" />
                <span>数据统计范围: {dataDateRange.start} 至 {dataDateRange.end}</span>
              </motion.div>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-4 w-full md:w-auto">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <label className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg cursor-pointer transition-all shadow-md hover:shadow-lg w-full sm:w-auto">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">上传文件</span>
                <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} multiple />
              </label>
               <span className="text-xs text-gray-500 text-center sm:text-right">Limit 200MB per file • CSV, XLSX, XLS</span>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md border border-white/50 rounded-xl shadow-lg p-2 overflow-x-auto mb-8"
        >
          <div className="flex items-center gap-2 min-w-max">
            {[
              { key: 'overview', label: '数据概览和ai诊断', icon: '📊' },
              { key: 'monthly', label: '月度对比分析', icon: '📈' },
              { key: 'range', label: '时段对比KPI', icon: '📅' },
              { key: 'personal', label: '个人爆款视频', icon: '👤' },
              { key: 'viral', label: '爆款视频', icon: '🔥' },
              { key: 'rewrite', label: '文案创作', icon: '✍️' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  "relative px-6 py-3 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
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
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {data.length > 0 ? (
          <>

        {/* --- SECTION 0: OVERALL TREND --- */}
        {activeTab === 'overview' && showAnalysis && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white/80 backdrop-blur-md p-4 sm:p-6 rounded-xl shadow-lg border border-white/50"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    整体数据趋势
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-white/50 p-1 rounded-lg border border-gray-200">
                        <button
                            onClick={() => handlePlatformSelect('douyin')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                selectedPlatform === 'douyin'
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 hover:bg-white/50"
                            )}
                        >
                            抖音
                        </button>
                        <button
                            onClick={() => handlePlatformSelect('kuaishou')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                selectedPlatform === 'kuaishou'
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 hover:bg-white/50"
                            )}
                        >
                            快手
                        </button>
                        <button
                            onClick={() => handlePlatformSelect('wechat')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                selectedPlatform === 'wechat'
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 hover:bg-white/50"
                            )}
                        >
                            视频号
                        </button>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 p-1 rounded-lg border border-gray-200">
                        <input 
                            type="date" 
                            value={trendRange.start} 
                            onChange={e => {
                                setPlatformTrendRange(prev => ({ ...prev, start: e.target.value }));
                                setPlatformTrendMode('daily');
                            }}
                            className="bg-transparent text-sm px-2 py-1 outline-none text-gray-600 w-32"
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                            type="date" 
                            value={trendRange.end} 
                            onChange={e => {
                                setPlatformTrendRange(prev => ({ ...prev, end: e.target.value }));
                                setPlatformTrendMode('daily');
                            }}
                            className="bg-transparent text-sm px-2 py-1 outline-none text-gray-600 w-32"
                        />
                    </div>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                setPlatformTrendRange(dataDateRange);
                                setPlatformTrendMode('quarterly');
                            }}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                trendMode === 'quarterly'
                                    ? "text-white bg-blue-600 hover:bg-blue-700"
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
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
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
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            近30天
                        </button>
                         <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                const end = parse(dataDateRange.end, 'yyyy-MM-dd', new Date());
                                const start = startOfMonth(end);
                                setPlatformTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setPlatformTrendMode('daily');
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            本月
                        </button>
                         <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                const today = parse(dataDateRange.end, 'yyyy-MM-dd', new Date()); // Use data end as anchor
                                const start = startOfMonth(subMonths(today, 1));
                                const end = endOfMonth(subMonths(today, 1));
                                setPlatformTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setPlatformTrendMode('daily');
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
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
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                trendMode === 'daily' && trendRange.start === dataDateRange?.start && trendRange.end === dataDateRange?.end
                                    ? "text-white bg-blue-600 hover:bg-blue-700"
                                    : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                            )}
                        >
                            全部(日)
                        </button>
                        <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                // Use the data range but switch mode
                                setPlatformTrendRange(dataDateRange); 
                                setPlatformTrendMode('weekly');
                            }}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                trendMode === 'weekly'
                                    ? "text-white bg-green-600 hover:bg-green-700"
                                    : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                            )}
                        >
                            按周
                        </button>
                        <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                // Use the data range but switch mode
                                setPlatformTrendRange(dataDateRange); 
                                setPlatformTrendMode('monthly');
                            }}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                trendMode === 'monthly'
                                    ? "text-white bg-purple-600 hover:bg-purple-700"
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
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                        <YAxis fontSize={12} stroke="#f97316" label={{ value: '互动数据', angle: -90, position: 'insideLeft' }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.9)' }} />
                        <Legend />
                        <Line type="monotone" dataKey="likes" name="点赞量" stroke="#ef4444" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="comments" name="评论量" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                        {/* 根据平台类型显示不同的指标 */}
                        {selectedPlatform === 'wechat' ? (
                            <Line type="monotone" dataKey="recommendations" name="推荐量" stroke="#f59e0b" strokeWidth={3} dot={false} />
                        ) : hasFavorites ? (
                            <Line type="monotone" dataKey="favorites" name="收藏量" stroke="#f59e0b" strokeWidth={3} dot={false} />
                        ) : hasRecommendations ? (
                            <Line type="monotone" dataKey="recommendations" name="推荐量" stroke="#f59e0b" strokeWidth={3} dot={false} />
                        ) : null}
                        <Line type="monotone" dataKey="shares" name="转发量" stroke="#10b981" strokeWidth={3} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* New Chart for Views and Fans (Large Magnitude) */}
            <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                       <TrendingUp className="w-5 h-5 text-blue-600" />
                       播放量与粉丝趋势 (Views & Fans)
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 bg-white/50 p-1 rounded-lg border border-gray-200">
                            <input 
                                type="date" 
                                value={viewsTrendRange.start} 
                                onChange={e => {
                                    setPlatformViewsTrendRange(prev => ({ ...prev, start: e.target.value }));
                                    setPlatformViewsTrendMode('daily');
                                }}
                                className="bg-transparent text-sm px-2 py-1 outline-none text-gray-600 w-32"
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                                type="date" 
                                value={viewsTrendRange.end} 
                                onChange={e => {
                                    setPlatformViewsTrendRange(prev => ({ ...prev, end: e.target.value }));
                                    setPlatformViewsTrendMode('daily');
                                }}
                                className="bg-transparent text-sm px-2 py-1 outline-none text-gray-600 w-32"
                            />
                        </div>
                        <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                const end = parse(dataDateRange.end, 'yyyy-MM-dd', new Date());
                                const start = subDays(end, 6);
                                setPlatformViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setPlatformViewsTrendMode('daily');
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            近7天
                        </button>
                        <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                const end = parse(dataDateRange.end, 'yyyy-MM-dd', new Date());
                                const start = subDays(end, 29);
                                setPlatformViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setPlatformViewsTrendMode('daily');
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            近30天
                        </button>
                        <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                const end = parse(dataDateRange.end, 'yyyy-MM-dd', new Date());
                                const start = startOfMonth(end);
                                setPlatformViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setPlatformViewsTrendMode('daily');
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            本月
                        </button>
                        <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                const today = parse(dataDateRange.end, 'yyyy-MM-dd', new Date());
                                const start = startOfMonth(subMonths(today, 1));
                                const end = endOfMonth(subMonths(today, 1));
                                setPlatformViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setPlatformViewsTrendMode('daily');
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
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
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                viewsTrendMode === 'daily' && viewsTrendRange.start === dataDateRange?.start && viewsTrendRange.end === dataDateRange?.end
                                    ? "text-white bg-blue-600 hover:bg-blue-700"
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
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                viewsTrendMode === 'weekly'
                                    ? "text-white bg-green-600 hover:bg-green-700"
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
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                viewsTrendMode === 'monthly'
                                    ? "text-white bg-purple-600 hover:bg-purple-700"
                                    : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                            )}
                        >
                            全年按月
                        </button>
                    </div>
                </div>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={viewsTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                            <YAxis yAxisId="left" fontSize={12} stroke="#3b82f6" label={{ value: '播放量', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#0ea5e9" label={{ value: '累计粉丝量', angle: 90, position: 'insideRight' }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.9)' }} />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="views" name="播放量" stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                            <Line yAxisId="right" type="monotone" dataKey="fans" name="累计粉丝量" stroke="#0ea5e9" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* AARRR Model Analysis */}
            <div className="mt-8">
                <Suspense fallback={<div className="flex justify-center items-center h-64">加载中...</div>}>
                    <AARRRAnalysis data={currentData} />
                </Suspense>
            </div>

            {/* 整体数据深度诊断 */}
            <div className="mt-8 pt-6 border-t border-gray-100">
                <Suspense fallback={<div className="flex justify-center items-center h-64">加载中...</div>}>
                    <AIAnalysisCard data={currentData} title="整体数据深度诊断 (Global Intelligent Diagnosis)" mode="aarrr-only" platform={selectedPlatform} />
                </Suspense>
            </div>

            {/* AI 诊断分析范围 */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-4 bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
               <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span>AI 诊断分析范围</span>
               </div>
               <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input 
                    type="date" 
                    value={aiDateRange.start} 
                    onChange={e => setPlatformAiDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="border border-gray-200 rounded px-3 py-1.5 text-sm w-full sm:w-auto bg-white/50 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  />
                  <span className="text-gray-400">-</span>
                  <input 
                    type="date" 
                    value={aiDateRange.end} 
                    onChange={e => setPlatformAiDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="border border-gray-200 rounded px-3 py-1.5 text-sm w-full sm:w-auto bg-white/50 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  />
               </div>
            </motion.div>

            {/* AI 智能运营诊断 */}
            <div className="mt-4">
                <Suspense fallback={<div className="flex justify-center items-center h-64">加载中...</div>}>
                    <AIAnalysisCard data={aiData} title="AI 智能运营诊断 (Intelligent Advisor)" mode="general-only" platform={selectedPlatform} />
                </Suspense>
            </div>
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
                <button 
                    onClick={() => handlePlatformSelect('douyin')}
                    className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'douyin' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500')}
                >
                    抖音
                </button>
                <button 
                    onClick={() => handlePlatformSelect('kuaishou')}
                    className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'kuaishou' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500')}
                >
                    快手
                </button>
                <button 
                    onClick={() => handlePlatformSelect('wechat')}
                    className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'wechat' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500')}
                >
                    视频号
                </button>
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
            className="bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/50 grid grid-cols-1 md:grid-cols-2 gap-6"
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

        {/* KPI Cards */}
        {activeTab === 'range' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KPICard title="总播放量 (Views)" value={currentKPIs.views} compareValue={compareKPIs.views} icon={Play} />
          <KPICard title="总点赞量 (Likes)" value={currentKPIs.likes} compareValue={compareKPIs.likes} icon={Heart} />
          <KPICard title="粉丝净增 (Net Fans)" value={currentKPIs.netFans} compareValue={compareKPIs.netFans} icon={Users} />
          <KPICard title="总评论量 (Comments)" value={currentKPIs.comments} compareValue={compareKPIs.comments} icon={MessageCircle} />
          <KPICard title="总转发量 (Shares)" value={currentKPIs.shares} compareValue={compareKPIs.shares} icon={Share2} />
          {/* 根据平台类型显示不同的指标 */}
          {selectedPlatform === 'wechat' ? (
            <KPICard title="总推荐量 (Recommendations)" value={currentKPIs.recommendations} compareValue={compareKPIs.recommendations} icon={ThumbsUp} />
          ) : hasFavorites ? (
            <KPICard title="总收藏量 (Favorites)" value={currentKPIs.favorites} compareValue={compareKPIs.favorites} icon={Star} />
          ) : hasRecommendations ? (
            <KPICard title="总推荐量 (Recommendations)" value={currentKPIs.recommendations} compareValue={compareKPIs.recommendations} icon={ThumbsUp} />
          ) : null}
        </div>
        )}

        {activeTab === 'range' && (
          <div id="analysis-content" className="space-y-6">
            
            {/* View Mode Toggle */}
            <div className="flex justify-end">
                <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setDetailTrendMode('daily')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            detailTrendMode === 'daily' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        按日
                    </button>
                    <button
                        onClick={() => setDetailTrendMode('weekly')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            detailTrendMode === 'weekly' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        按周
                    </button>
                    <button
                        onClick={() => setDetailTrendMode('monthly')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            detailTrendMode === 'monthly' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        按月
                    </button>
                    <button
                        onClick={() => setDetailTrendMode('quarterly')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            detailTrendMode === 'quarterly' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
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
                            <BarChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#f97316" label={{ value: '日增粉丝', angle: 90, position: 'insideRight' }} />
                                <Tooltip content={<ComparisonTooltip />} />
                                <Legend />
                                <Bar yAxisId="right" dataKey="netFans" name="当前周期 日增粉丝" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar yAxisId="right" dataKey="compareNetFans" name="对比周期 日增粉丝" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
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
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis fontSize={12} stroke="#94a3b8" unit="%" />
                                <Tooltip content={<ComparisonTooltip />} />
                                <Legend />
                                <Line type="monotone" dataKey="completionRate" name="当前周期 完播率(%)" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="compareCompletionRate" name="对比周期 完播率(%)" stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} strokeOpacity={0.7} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
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
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis fontSize={12} stroke="#94a3b8" unit="%" />
                                <Tooltip content={<ComparisonTooltip />} />
                                <Legend />
                                <Line type="monotone" dataKey="interactionRate" name="当前周期 互动率(%)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="compareInteractionRate" name="对比周期 互动率(%)" stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={2} strokeOpacity={0.7} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
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
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis yAxisId="left" fontSize={12} stroke="#3b82f6" label={{ value: '播放量', angle: -90, position: 'insideLeft' }} />
                                <Tooltip content={<ComparisonTooltip />} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="views" name="当前周期 播放量" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                <Line yAxisId="left" type="monotone" dataKey="compareViews" name="对比周期 播放量" stroke="#60a5fa" strokeDasharray="5 5" strokeWidth={2} strokeOpacity={0.6} dot={false} activeDot={{ r: 4 }} />
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
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#f97316" label={{ value: '互动总量', angle: 90, position: 'insideRight' }} />
                                <Tooltip content={<ComparisonTooltip />} />
                                <Legend />
                                <Line yAxisId="right" type="monotone" dataKey="interactions" name="当前周期 互动总量" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                <Line yAxisId="right" type="monotone" dataKey="compareInteractions" name="对比周期 互动总量" stroke="#fb923c" strokeDasharray="5 5" strokeWidth={2} strokeOpacity={0.6} dot={false} activeDot={{ r: 4 }} />
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
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={fanHealthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis fontSize={12} stroke="#94a3b8" unit="%" />
                            <Tooltip content={<ComparisonTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="healthRate" name="当前周期 粉赞比(%)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="compareHealthRate" name="对比周期 粉赞比(%)" stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={2} strokeOpacity={0.6} dot={{ r: 2 }} activeDot={{ r: 4 }} />
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
                    <div className="grid grid-cols-6 gap-2 w-full aspect-square max-w-[400px]">
                        {correlationData.map((item, index) => (
                            <motion.div 
                                key={index}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: index * 0.01 }}
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
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {Array.from(new Set((platformData[selectedPlatform] || []).map(item => format(item.parsedDate, 'yyyy-MM'))))
                                    .sort((a, b) => b.localeCompare(a)) // 按月份降序排列
                                    .map(month => (
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
        {activeTab === 'monthly' && showAnalysis && platformData[selectedPlatform]?.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
            >
                {/* Charts Section 1: Monthly Comparison */}
                <div className="mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="text-blue-500">📊</span> 月度对比分析
                        </h2>
                        <div className="flex flex-wrap gap-4">
                            <div className="bg-gray-100 p-1 rounded-lg inline-flex text-xs">
                                <button 
                                    onClick={() => handlePlatformSelect('douyin')}
                                    className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'douyin' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500')}
                                >
                                    抖音
                                </button>
                                <button 
                                    onClick={() => handlePlatformSelect('kuaishou')}
                                    className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'kuaishou' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500')}
                                >
                                    快手
                                </button>
                                <button 
                                    onClick={() => handlePlatformSelect('wechat')}
                                    className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'wechat' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500')}
                                >
                                    视频号
                                </button>
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <div className="h-80">
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
                        <div className="h-80">
                            <MonthlyOtherKPIsChart />
                        </div>
                    </motion.div>
                )}
            </div>
            </div>

            {/* Charts Section 1.5: Additional Monthly Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <div className="h-80">
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
                        <div className="h-80">
                            <MonthlyRateChart />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Charts Section 2: Monthly Trends Split Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                        <div className="h-80">
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
                    <div className="h-80">
                        <MonthlyNetFansChart />
                    </div>
                </motion.div>
                )}
            </div>
        </motion.div>
        )}

        {/* 个人爆款视频 */}
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
                            {topVideosMode === 'range' ? '爆款视频数据明细 (Top 10)' : `月度爆款视频 (Top 10)`}
                        </h3>
                        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                            <div className="bg-gray-100 p-1 rounded-lg inline-flex text-xs">
                                <button 
                                    onClick={() => handlePlatformSelect('douyin')}
                                    className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'douyin' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500')}
                                >
                                    抖音
                                </button>
                                <button 
                                    onClick={() => handlePlatformSelect('kuaishou')}
                                    className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'kuaishou' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500')}
                                >
                                    快手
                                </button>
                                <button 
                                    onClick={() => handlePlatformSelect('wechat')}
                                    className={cn("px-3 py-1 rounded-md transition-all", selectedPlatform === 'wechat' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500')}
                                >
                                    视频号
                                </button>
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
                                    <th className="px-6 py-3">排名</th>
                                    <th className="px-6 py-3">日期</th>
                                    <th className="px-6 py-3">标题</th>
                                    <th className="px-6 py-3">播放量</th>
                                    <th className="px-6 py-3">点赞</th>
                                    <th className="px-6 py-3">互动率</th>
                                    <th className="px-6 py-3">评论</th>
                                    {hasFavorites ? <th className="px-6 py-3">收藏</th> : hasRecommendations ? <th className="px-6 py-3">推荐</th> : null}
                                    <th className="px-6 py-3">转发</th>
                                    <th className="px-6 py-3">完播率</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(topVideosMode === 'range' ? top10ExplosiveVideos : monthlyTop10Videos).map((item, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-gray-900">#{index + 1}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{item.date}</td>
                                        <td className="px-6 py-4 max-w-xs truncate" title={item.title}>{item.title}</td>
                                        <td className="px-6 py-4 font-bold text-blue-600">{item.views.toLocaleString()}</td>
                                        <td className="px-6 py-4">{item.likes.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-purple-600 font-medium">{item.interactionRate.toFixed(2)}%</td>
                                        <td className="px-6 py-4">{item.comments}</td>
                                        {hasFavorites ? <td className="px-6 py-4">{item.favorites}</td> : hasRecommendations ? <td className="px-6 py-4">{item.recommendationsCount}</td> : null}
                                        <td className="px-6 py-4">{item.shares}</td>
                                        <td className="px-6 py-4">{item.completionRate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {(topVideosMode === 'range' ? top10ExplosiveVideos.length === 0 : monthlyTop10Videos.length === 0) && (
                        <div className="p-8 text-center text-gray-400">当前所选日期范围内无数据</div>
                    )}
                </motion.div>
            </motion.div>
        )}

        {/* Daily Viral Videos Monitor */}
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: activeTab === 'viral' && showAnalysis && platformData[selectedPlatform]?.length > 0 ? 1 : 0, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1 }}
            className=""
        >
          <Suspense fallback={<div className="flex justify-center items-center h-64">加载中...</div>}>
            <ViralVideosSection />
          </Suspense>
        </motion.div>

        {/* 文案创作 */}
        {activeTab === 'rewrite' && showAnalysis && platformData[selectedPlatform]?.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                >
                    {/* Section Header */}
                    <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-green-500 rounded-full" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">文案创作</h3>
                                <p className="text-xs text-gray-400 mt-1">创建专业的法律内容文案</p>
                            </div>
                        </div>
                    </div>

                    {/* Section Content */}
                    <div className="p-6">
                        <div className="bg-green-50/50 p-6 rounded-xl border border-green-100 min-h-[400px]">
                            <div className="flex items-center justify-between mb-4">
                                <h6 className="text-green-800 font-bold flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> 法律文案创作
                                </h6>
                            </div>

                            <div className="space-y-4">
                                {/* 平台选择 */}
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-green-600 bg-green-100/50 p-2 rounded flex-1">
                                        提示：选择平台，AI 将根据平台特性生成适合的文案。
                                    </p>
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => handlePlatformSelect('douyin')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                selectedPlatform === 'douyin'
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            抖音
                                        </button>
                                        <button
                                            onClick={() => handlePlatformSelect('kuaishou')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                selectedPlatform === 'kuaishou'
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            快手
                                        </button>
                                        <button
                                            onClick={() => handlePlatformSelect('wechat')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                selectedPlatform === 'wechat'
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            视频号
                                        </button>
                                    </div>
                                </div>
                                
                                {/* 文案输入区域 */}
                                <div className="w-full h-64 overflow-y-auto rounded-xl border border-green-200 bg-white shadow-inner p-4">
                                    <textarea
                                        placeholder="请输入文案主题或关键词，AI 将生成专业的法律文案"
                                        className="w-full h-full border-none outline-none resize-none text-sm text-gray-800"
                                        value={copywritingInput}
                                        onChange={handleCopywritingInputChange}
                                        onBlur={handleCopywritingInputBlur}
                                    />
                                </div>
                                
                                {/* 上传文案功能 */}
                                <div className="mt-4">
                                    <p className="text-xs text-green-600 bg-green-100/50 p-2 rounded flex-1">
                                        提示：上传别人高点赞量视频的文案，AI 将进行二创，生成更好的法律文案。
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            type="file"
                                            accept=".txt,.md"
                                            className="hidden"
                                            id="uploadCopywriting"
                                            onChange={handleUploadCopywriting}
                                        />
                                        <label
                                            htmlFor="uploadCopywriting"
                                            className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                                        >
                                            上传文案
                                        </label>
                                        <button
                                            className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-purple-600 text-white hover:bg-purple-700"
                                            onClick={handleViewCopywritingLibrary}
                                        >
                                            查看文案库
                                        </button>
                                    </div>
                                </div>

                                <div className="py-10 flex flex-col items-center justify-center text-gray-400">
                                    {isGenerating ? (
                                        <>
                                            <div className="w-12 h-12 border-4 border-t-green-600 border-green-200 rounded-full animate-spin mb-4"></div>
                                            <p className="text-lg font-medium text-gray-600">正在生成文案...</p>
                                            <p className="text-sm mt-2 mb-6">请稍候，AI 正在为您创作专业的法律文案</p>
                                        </>
                                    ) : copywritingVersions.length > 0 ? (
                                        <>
                                            <div className="flex items-center gap-3 mb-6">
                                                <Sparkles className="w-10 h-10 text-green-600" />
                                                <div>
                                                    <p className="text-xl font-bold text-gray-800">文案生成成功！</p>
                                                    <p className="text-sm text-gray-500">根据您的需求，AI 已为您生成专业法律文案</p>
                                                </div>
                                            </div>
                                            <div className="w-full mt-4 p-6 bg-white rounded-2xl border border-green-200 shadow-lg">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-2 h-6 bg-green-500 rounded-full" />
                                                    <h4 className="text-lg font-bold text-gray-800">AI 生成文案</h4>
                                                </div>
                                                
                                                {/* 版本切换按钮 */}
                                                {copywritingVersions.length > 0 && (
                                                    <div className="mb-6">
                                                        <p className="text-sm font-medium text-gray-700 mb-3">选择文案版本</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {copywritingVersions.map((version, index) => (
                                                                <button
                                                                    key={version.id}
                                                                    onClick={() => handleVersionChange(index)}
                                                                    className={cn(
                                                                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                                                        currentVersionIndex === index
                                                                            ? "bg-blue-600 text-white"
                                                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                                    )}
                                                                >
                                                                    版本 {version.id}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="prose prose-sm max-w-none">
                                                    <h5 className="text-blue-600 font-bold mb-2">版本 {copywritingVersions[currentVersionIndex].id}</h5>
                                                    <p className="text-gray-700 whitespace-pre-wrap">
                                                        {copywritingVersions.length > 0 
                                                            ? copywritingVersions[currentVersionIndex].content 
                                                            : ''
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* 用户反馈区域 */}
                                            {currentCopywritingId && (
                                                <div className="w-full mt-6 p-6 bg-white rounded-2xl border border-green-200 shadow-lg">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="w-2 h-6 bg-blue-500 rounded-full" />
                                                        <h4 className="text-lg font-bold text-gray-800">用户反馈</h4>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {/* 评分系统 */}
                                                        <div className="bg-gray-50 p-4 rounded-xl">
                                                            <p className="text-sm font-medium text-gray-700 mb-3">评分 (1-5星)</p>
                                                            <div className="flex gap-2">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <button
                                                                        key={star}
                                                                        onClick={() => handleRating(currentCopywritingId!, star)}
                                                                        className={`text-2xl transition-all ${star <= (copywritingHistory.find(item => item.id === currentCopywritingId)?.rating || 0) ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
                                                                    >
                                                                        ★
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* 详细反馈 */}
                                                        <div className="bg-gray-50 p-4 rounded-xl">
                                                            <p className="text-sm font-medium text-gray-700 mb-3">详细反馈 (可选)</p>
                                                            <textarea
                                                                placeholder="请输入您的反馈意见，帮助我们改进文案质量"
                                                                className="w-full h-20 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                                defaultValue={copywritingHistory.find(item => item.id === currentCopywritingId)?.feedback || ''}
                                                                onChange={(e) => handleFeedback(currentCopywritingId!, e.target.value)}
                                                            />
                                                        </div>
                                                        
                                                        {/* 修改记录 */}
                                                        <div className="bg-gray-50 p-4 rounded-xl">
                                                            <p className="text-sm font-medium text-gray-700 mb-3">修改后的内容 (如果有)</p>
                                                            <textarea
                                                                placeholder="请输入您修改后的文案内容"
                                                                className="w-full h-32 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                                defaultValue={copywritingHistory.find(item => item.id === currentCopywritingId)?.modifiedContent || ''}
                                                                onChange={(e) => handleModifiedContent(currentCopywritingId!, e.target.value)}
                                                            />
                                                        </div>
                                                        
                                                        {/* 采用状态 */}
                                                        <div className="bg-gray-50 p-4 rounded-xl">
                                                            <p className="text-sm font-medium text-gray-700 mb-3">是否被采用</p>
                                                            <div className="flex gap-4">
                                                                <button
                                                                    onClick={() => handleAdopted(currentCopywritingId!, true)}
                                                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${copywritingHistory.find(item => item.id === currentCopywritingId)?.isAdopted ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                                >
                                                                    已采用
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAdopted(currentCopywritingId!, false)}
                                                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${!copywritingHistory.find(item => item.id === currentCopywritingId)?.isAdopted ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                                >
                                                                    未采用
                                                                </button>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* 效果数据 */}
                                                        <div className="bg-gray-50 p-4 rounded-xl">
                                                            <p className="text-sm font-medium text-gray-700 mb-3">效果数据 (如果有)</p>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1">播放量</p>
                                                                    <input
                                                                        type="number"
                                                                        placeholder="0"
                                                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                                        defaultValue={copywritingHistory.find(item => item.id === currentCopywritingId)?.performance?.views || ''}
                                                                        onChange={(e) => handlePerformance(currentCopywritingId!, {
                                                                            ...copywritingHistory.find(item => item.id === currentCopywritingId)?.performance,
                                                                            views: parseInt(e.target.value) || 0
                                                                        })}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1">点赞数</p>
                                                                    <input
                                                                        type="number"
                                                                        placeholder="0"
                                                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                                        defaultValue={copywritingHistory.find(item => item.id === currentCopywritingId)?.performance?.likes || ''}
                                                                        onChange={(e) => handlePerformance(currentCopywritingId!, {
                                                                            ...copywritingHistory.find(item => item.id === currentCopywritingId)?.performance,
                                                                            likes: parseInt(e.target.value) || 0
                                                                        })}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1">评论数</p>
                                                                    <input
                                                                        type="number"
                                                                        placeholder="0"
                                                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                                        defaultValue={copywritingHistory.find(item => item.id === currentCopywritingId)?.performance?.comments || ''}
                                                                        onChange={(e) => handlePerformance(currentCopywritingId!, {
                                                                            ...copywritingHistory.find(item => item.id === currentCopywritingId)?.performance,
                                                                            comments: parseInt(e.target.value) || 0
                                                                        })}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-wrap gap-4 mt-6">
                                                <button
                                                    className="px-8 py-3 rounded-xl font-bold shadow-lg transition-all bg-green-600 text-white hover:bg-green-700 hover:scale-105"
                                                    onClick={() => {
                                                        setCopywritingVersions([]);
                                                        setCurrentVersionIndex(0);
                                                    }}
                                                >
                                                    重新创作
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-center py-12">
                                                <Sparkles className="w-16 h-16 text-green-200 mb-6 mx-auto" />
                                                <p className="text-xl font-bold text-gray-800 mb-3">准备就绪</p>
                                                <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">请输入文案主题或关键词，然后点击'开始文案创作'，AI 将为您生成专业的法律文案</p>
                                                <button
                                                    className="px-8 py-4 rounded-xl font-bold shadow-lg transition-all bg-green-600 text-white hover:bg-green-700 hover:scale-105"
                                                    onClick={handleStartCopywriting}
                                                >
                                                    开始文案创作
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
                
                {/* 爆款文案库 */}
                {viralCopywritingLibrary.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-8 bg-purple-500 rounded-full" />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">爆款文案库</h3>
                                    <p className="text-xs text-gray-400 mt-1">历史高评分文案和爆款案例</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h6 className="text-purple-800 font-bold flex items-center gap-2">
                                        <Star className="w-4 h-4" /> 爆款文案案例
                                    </h6>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {viralCopywritingLibrary.map((item) => (
                                        <div 
                                            key={item.id} 
                                            className="p-4 bg-white rounded-xl border border-purple-200 shadow-inner hover:shadow-lg transition-all"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-purple-600">{item.platform === 'douyin' ? '抖音' : item.platform === 'kuaishou' ? '快手' : '视频号'}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                                                    <button
                                                        className="text-xs text-red-600 hover:text-red-800"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // 删除文案
                                                            setCopywritingHistory(prev => prev.filter(historyItem => historyItem.id !== item.id));
                                                        }}
                                                    >
                                                        删除
                                                    </button>
                                                </div>
                                            </div>
                                            <h5 
                                                className="text-sm font-bold text-gray-800 mb-2 cursor-pointer"
                                                onClick={() => {
                                                    // 找到对应的版本并显示
                                                    const versions = copywritingHistory.filter(v => v.input === item.input && v.platform === item.platform);
                                                    if (versions.length > 0) {
                                                        setCopywritingVersions(versions.map((v, index) => ({
                                                            id: index + 1,
                                                            content: v.output
                                                        })));
                                                        setCurrentVersionIndex(0);
                                                        setCopywritingInput(item.input);
                                                        setSelectedPlatform(item.platform as 'douyin' | 'kuaishou' | 'wechat');
                                                    }
                                                }}
                                            >{item.input}</h5>
                                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.output}</p>
                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <span key={star} className={`text-xs ${star <= (item.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}>
                                                            ★
                                                        </span>
                                                    ))}
                                                </div>
                                                {item.isAdopted && (
                                                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">已采用</span>
                                                )}
                                                {item.performance?.views && item.performance.views > 10000 && (
                                                    <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">爆款</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
                
                {/* 文案库模态框 */}
                {showCopywritingLibrary && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-blue-500 rounded-full" />
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800">文案库</h3>
                                        <p className="text-xs text-gray-400 mt-1">上传的高点赞量视频文案</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseCopywritingLibrary}
                                    className="p-2 rounded-full hover:bg-gray-100"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6">
                                {uploadedCopywritingLibrary.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {uploadedCopywritingLibrary.map((item) => (
                                            <div key={item.id} className="p-4 bg-white rounded-xl border border-blue-200 shadow-inner">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-blue-600">{item.platform === 'douyin' ? '抖音' : item.platform === 'kuaishou' ? '快手' : '视频号'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">{new Date(item.createdAt).toISOString().split('T')[0]}</span>
                                                        <button
                                                            className="text-xs text-red-600 hover:text-red-800"
                                                            onClick={() => {
                                                                // 删除上传的文案
                                                                setUploadedCopywritingLibrary(prev => prev.filter(uploadedItem => uploadedItem.id !== item.id));
                                                            }}
                                                        >
                                                            删除
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-800 mb-4 line-clamp-3">{item.input}</p>
                                                <button
                                                    className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-blue-600 text-white hover:bg-blue-700"
                                                    onClick={() => handleSelectFromLibrary(item)}
                                                >
                                                    选择此文案进行二创
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-gray-400">
                                        <p className="text-lg font-medium">暂无上传的文案</p>
                                        <p className="text-sm mt-2">请先上传高点赞量视频的文案</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
            </motion.div>
        )}
      </div>
    </div>
  );
}
