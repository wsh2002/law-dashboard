import { useState, useMemo, ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
// import { MOCK_DATA } from './data/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ComposedChart, ScatterChart, Scatter, ZAxis, ReferenceLine
} from 'recharts';
import { Upload, Calendar, ArrowUp, ArrowDown, FileSpreadsheet, TrendingUp, Activity, MousePointerClick, Heart, GitMerge, Sparkles, Play, MessageCircle, Share2, Users, Star } from 'lucide-react';
import { format, parse, addDays, isValid, startOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { cn } from './lib/utils';
import { ViralVideosSection } from './components/ViralVideosSection';
import { AARRRAnalysis } from './components/AARRRAnalysis';
import { AIAnalysisCard } from './components/AIAnalysisCard';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Login } from './components/Login';

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
};

// Helper to parse raw data
const parseData = (raw: any[]): DataItem[] => {
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
      fanLikeRatio: formatPercentage(item['粉赞比'] || item['Fan/Like Ratio']),
      completionRate: formatPercentage(item['视频完播率'] || item['Completion Rate']),
      interactionRate,
      parsedDate
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [data, setData] = useState<DataItem[]>([]);
  
  // Dynamic today reference for initial states
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const lastWeekStr = format(subDays(today, 7), 'yyyy-MM-dd');
  const thisMonthStr = format(today, 'yyyy-MM');
  const lastMonthStr = format(subMonths(today, 1), 'yyyy-MM');

  // Range Comparison State
  const [dateRange, setDateRange] = useState({ start: lastWeekStr, end: todayStr });
  const [compareRange, setCompareRange] = useState({ start: format(subDays(today, 14), 'yyyy-MM-dd'), end: format(subDays(today, 8), 'yyyy-MM-dd') }); 

  // Month Comparison State
  const [monthA, setMonthA] = useState(lastMonthStr);
  const [monthB, setMonthB] = useState(thisMonthStr);
  const [selectedMonthForVideos, setSelectedMonthForVideos] = useState(thisMonthStr); 
  
  // Data Date Range State
  const [dataDateRange, setDataDateRange] = useState<{ start: string, end: string } | null>(null);

  // Analysis Visibility State
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showViralMonitor, setShowViralMonitor] = useState(false);

  // Overall Trend Filter State
  const [trendRange, setTrendRange] = useState({ start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr });
  const [trendMode, setTrendMode] = useState<'daily' | 'monthly' | 'quarterly'>('daily');
  
  // Views Trend Filter State (Independent)
  const [viewsTrendRange, setViewsTrendRange] = useState({ start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr });
  const [viewsTrendMode, setViewsTrendMode] = useState<'daily' | 'monthly' | 'quarterly'>('daily');

  const [detailTrendMode, setDetailTrendMode] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily');

  // AI Analysis Independent Date Range
  const [aiDateRange, setAiDateRange] = useState({ start: format(startOfMonth(today), 'yyyy-MM-dd'), end: todayStr });

  // User Name extracted from file
  const [userName, setUserName] = useState<string>('');

  // File Upload Handler
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Extract name from filename
    // Logic: Take part before "的", or filename without extension if "的" not present
    const filename = file.name;
    let name = filename.substring(0, filename.lastIndexOf('.')); // Remove extension
    if (name.includes('的')) {
        name = name.split('的')[0];
    }
    setUserName(name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json(ws);
      const parsedData = parseData(rawData);
      
      if (parsedData.length > 0) {
          setData(parsedData);
          
          // Auto-adjust dates based on new data
          const dates = parsedData.map(d => d.parsedDate.getTime()).sort((a, b) => a - b);
          const minDate = new Date(dates[0]);
          const maxDate = new Date(dates[dates.length - 1]);
          const midDate = new Date(dates[Math.floor(dates.length / 2)]);
          
          const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
          
          // Set data date range
          setDataDateRange({ start: fmt(minDate), end: fmt(maxDate) });
          
          // Set default AI date range (same as full range initially)
          setAiDateRange({ start: fmt(minDate), end: fmt(maxDate) });

          // Set default Trend date range
          setTrendRange({ start: fmt(minDate), end: fmt(maxDate) });
          setViewsTrendRange({ start: fmt(minDate), end: fmt(maxDate) });

          // Auto-set monthly comparison defaults based on data
          const months = Array.from(new Set(parsedData.map(d => format(d.parsedDate, 'yyyy-MM')))).sort();
          if (months.length > 0) {
              setMonthA(months[0]);
              setMonthB(months.length > 1 ? months[months.length - 1] : months[0]);
              setSelectedMonthForVideos(months[0]);
          }

          // Set sensible defaults for the new data
          setDateRange({ start: fmt(minDate), end: fmt(midDate) });
          setCompareRange({ start: fmt(addDays(midDate, 1)), end: fmt(maxDate) });
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- Range Analysis Logic ---
  // Filter Data
  const currentData = useMemo(() => {
    const start = parse(dateRange.start, 'yyyy-MM-dd', new Date());
    const end = parse(dateRange.end, 'yyyy-MM-dd', new Date());
    // Include end date fully
    end.setHours(23, 59, 59, 999);
    return data.filter(d => d.parsedDate >= start && d.parsedDate <= end);
  }, [data, dateRange]);

  const compareData = useMemo(() => {
    const start = parse(compareRange.start, 'yyyy-MM-dd', new Date());
    const end = parse(compareRange.end, 'yyyy-MM-dd', new Date());
    end.setHours(23, 59, 59, 999);
    return data.filter(d => d.parsedDate >= start && d.parsedDate <= end);
  }, [data, compareRange]);

  // AI Analysis Data Filtering
  const aiData = useMemo(() => {
    const start = parse(aiDateRange.start, 'yyyy-MM-dd', new Date());
    const end = parse(aiDateRange.end, 'yyyy-MM-dd', new Date());
    end.setHours(23, 59, 59, 999);
    return data.filter(d => d.parsedDate >= start && d.parsedDate <= end);
  }, [data, aiDateRange]);

  // Helper for trend aggregation
  const getTrendData = (targetRange: {start: string, end: string}, targetMode: 'daily' | 'monthly' | 'quarterly') => {
    const start = parse(targetRange.start, 'yyyy-MM-dd', new Date());
    const end = parse(targetRange.end, 'yyyy-MM-dd', new Date());
    end.setHours(23, 59, 59, 999);
    
    // Filter raw data
    const filtered = data.filter(d => d.parsedDate >= start && d.parsedDate <= end);
    
    // Aggregate data
    const grouped: Record<string, any> = {};
    filtered.forEach(item => {
        let d = '';
        if (targetMode === 'daily') {
             d = format(item.parsedDate, 'yyyy-MM-dd');
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
                fans: item.fans, // Snapshot for daily, but for monthly we need logic
                netFans: 0
            };
        }
        grouped[d].views += item.views;
        grouped[d].likes += item.likes;
        grouped[d].comments += item.comments;
        grouped[d].shares += item.shares;
        grouped[d].favorites += item.favorites;
        grouped[d].netFans += item.netFans;
        
        // For 'fans' (cumulative), we usually want the value at the end of the period.
        grouped[d].fans = Math.max(grouped[d].fans, item.fans); 
    });

    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  };

  // Trend Chart Data (Filtered by trendRange)
  const trendData = useMemo(() => getTrendData(trendRange, trendMode), [data, trendRange, trendMode]);
  
  // Views Trend Chart Data (Independent)
  const viewsTrendData = useMemo(() => getTrendData(viewsTrendRange, viewsTrendMode), [data, viewsTrendRange, viewsTrendMode]);

  const toggleAnalysis = () => {
      setShowAnalysis(true);
      // Optional: Scroll to the next section
      setTimeout(() => {
          const element = document.getElementById('analysis-content');
          if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
          }
      }, 100);
  };

  // Aggregations
  const getKPIs = (dataset: DataItem[]) => {
    return {
      views: dataset.reduce((acc, cur) => acc + cur.views, 0),
      likes: dataset.reduce((acc, cur) => acc + cur.likes, 0),
      comments: dataset.reduce((acc, cur) => acc + cur.comments, 0),
      shares: dataset.reduce((acc, cur) => acc + cur.shares, 0),
      netFans: dataset.reduce((acc, cur) => acc + cur.netFans, 0),
      favorites: dataset.reduce((acc, cur) => acc + cur.favorites, 0),
    };
  };

  const currentKPIs = getKPIs(currentData);
  const compareKPIs = getKPIs(compareData);

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
    
    return Object.values(grouped).map((g: any) => ({
        ...g,
        completionRate: g.count ? (g.completionRate / g.count).toFixed(2) : 0,
        interactionRate: g.count ? (g.interactionRate / g.count).toFixed(2) : 0,
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));
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
  }, [currentData, compareData, dateRange, compareRange]);

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
  }, [currentData, compareData]);

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
  }, [currentData, compareData]);

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
  }, [currentData, compareData, dateRange, compareRange]);

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
    return [...currentData].sort((a, b) => b.views - a.views).slice(0, 10);
  }, [currentData]);

  // Comparison Chart Data
  const comparisonChartData = [
    { name: '播放量', current: currentKPIs.views, compare: compareKPIs.views },
    { name: '点赞量', current: currentKPIs.likes, compare: compareKPIs.likes },
    { name: '净增粉', current: currentKPIs.netFans, compare: compareKPIs.netFans },
    { name: '评论量', current: currentKPIs.comments, compare: compareKPIs.comments },
    { name: '转发量', current: currentKPIs.shares, compare: compareKPIs.shares },
  ];

  // Monthly Aggregation
  const monthlyData = useMemo(() => {
    const grouped: Record<string, any> = {};
    data.forEach(item => {
        const m = format(item.parsedDate, 'yyyy-MM');
        if (!grouped[m]) grouped[m] = { month: m, views: 0, likes: 0, netFans: 0 };
        grouped[m].views += item.views;
        grouped[m].likes += item.likes;
        grouped[m].netFans += item.netFans;
    });
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  // Unique Months for Dropdowns
  const uniqueMonths = useMemo(() => {
      return monthlyData.map(m => m.month);
  }, [monthlyData]);

  // Month Comparison Logic
  const monthDataA = useMemo(() => monthlyData.find(m => m.month === monthA) || { views: 0, likes: 0, netFans: 0 }, [monthlyData, monthA]);
  const monthDataB = useMemo(() => monthlyData.find(m => m.month === monthB) || { views: 0, likes: 0, netFans: 0 }, [monthlyData, monthB]);

  const monthComparisonChartData = [
      { name: '月播放量', A: monthDataA.views, B: monthDataB.views },
      { name: '月点赞量', A: monthDataA.likes, B: monthDataB.likes },
      { name: '月净增粉', A: monthDataA.netFans, B: monthDataB.netFans },
  ];

  // Monthly Top Videos Logic
  const monthlyTopVideos = useMemo(() => {
      return data
          .filter(d => format(d.parsedDate, 'yyyy-MM') === selectedMonthForVideos)
          .sort((a, b) => b.views - a.views)
          .slice(0, 5); // Top 5
  }, [data, selectedMonthForVideos]);

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
      return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen relative font-sans text-slate-800 overflow-x-hidden">
      <AnimatedBackground />
      <div className="max-w-7xl mx-auto space-y-8 p-8 relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              多平台运营诊断 · 时间对比分析
            </h1>
            <p className="text-slate-500 mt-2">支持 CSV/Excel 导入 · 自动识别日期范围</p>
            {dataDateRange && (
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
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-white/50 hover:bg-white/90 text-gray-700 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md">
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">Drag and drop file here</span>
              <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
            </label>
             <span className="text-xs text-gray-500">Limit 200MB per file • CSV, XLSX, XLS</span>
          </div>
        </motion.div>





        {data.length > 0 ? (
          <>

        {/* --- SECTION 0: OVERALL TREND --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50 mb-8"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    整体数据趋势
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-white/50 p-1 rounded-lg border border-gray-200">
                        <input 
                            type="date" 
                            value={trendRange.start} 
                            onChange={e => {
                                setTrendRange(prev => ({ ...prev, start: e.target.value }));
                                setTrendMode('daily');
                            }}
                            className="bg-transparent text-sm px-2 py-1 outline-none text-gray-600 w-32"
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                            type="date" 
                            value={trendRange.end} 
                            onChange={e => {
                                setTrendRange(prev => ({ ...prev, end: e.target.value }));
                                setTrendMode('daily');
                            }}
                            className="bg-transparent text-sm px-2 py-1 outline-none text-gray-600 w-32"
                        />
                    </div>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                setTrendRange(dataDateRange);
                                setTrendMode('quarterly');
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
                                setTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setTrendMode('daily');
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
                                setTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setTrendMode('daily');
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
                                setTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setTrendMode('daily');
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
                                setTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setTrendMode('daily');
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            上月
                        </button>
                        <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                setTrendRange(dataDateRange);
                                setTrendMode('daily');
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
                                setTrendRange(dataDateRange); 
                                setTrendMode('monthly');
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
                        <Line type="monotone" dataKey="favorites" name="收藏量" stroke="#f59e0b" strokeWidth={3} dot={false} />
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
                                    setViewsTrendRange(prev => ({ ...prev, start: e.target.value }));
                                    setViewsTrendMode('daily');
                                }}
                                className="bg-transparent text-sm px-2 py-1 outline-none text-gray-600 w-32"
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                                type="date" 
                                value={viewsTrendRange.end} 
                                onChange={e => {
                                    setViewsTrendRange(prev => ({ ...prev, end: e.target.value }));
                                    setViewsTrendMode('daily');
                                }}
                                className="bg-transparent text-sm px-2 py-1 outline-none text-gray-600 w-32"
                            />
                        </div>
                        <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                const end = parse(dataDateRange.end, 'yyyy-MM-dd', new Date());
                                const start = subDays(end, 6);
                                setViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setViewsTrendMode('daily');
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
                                setViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setViewsTrendMode('daily');
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
                                setViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setViewsTrendMode('daily');
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
                                setViewsTrendRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                                setViewsTrendMode('daily');
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            上月
                        </button>
                        <button 
                            onClick={() => {
                                if (!dataDateRange) return;
                                setViewsTrendRange(dataDateRange);
                                setViewsTrendMode('daily');
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
                                setViewsTrendRange(dataDateRange); 
                                setViewsTrendMode('monthly');
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
                <AARRRAnalysis data={data} />
            </div>
        </motion.div>

        {/* --- GLOBAL AI DIAGNOSIS --- */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
        >
             <AIAnalysisCard data={data} title="整体数据深度诊断 (Global Intelligent Diagnosis)" mode="aarrr-only" />
        </motion.div>




        {/* --- SECTION 2: RANGE ANALYSIS --- */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-2 mb-4"
        >
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="text-red-500">📌</span> 时间段对比 KPI
            </h2>
        </motion.div>

        {/* Date Filters */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
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
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-1.5 text-sm w-full bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <span className="text-gray-400">-</span>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
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
                                onChange={e => setCompareRange(prev => ({ ...prev, start: e.target.value }))}
                                className="border border-gray-200 rounded px-3 py-1.5 text-sm w-full bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                                type="date" 
                                value={compareRange.end} 
                                onChange={e => setCompareRange(prev => ({ ...prev, end: e.target.value }))}
                                className="border border-gray-200 rounded px-3 py-1.5 text-sm w-full bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={toggleAnalysis}
                        className="h-[34px] px-6 bg-blue-600 text-white text-sm font-medium rounded shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Activity className="w-4 h-4" />
                        开始分析
                    </button>
                </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KPICard title="总播放量 (Views)" value={currentKPIs.views} compareValue={compareKPIs.views} icon={Play} />
          <KPICard title="总点赞量 (Likes)" value={currentKPIs.likes} compareValue={compareKPIs.likes} icon={Heart} />
          <KPICard title="粉丝净增 (Net Fans)" value={currentKPIs.netFans} compareValue={compareKPIs.netFans} icon={Users} />
          <KPICard title="总评论量 (Comments)" value={currentKPIs.comments} compareValue={compareKPIs.comments} icon={MessageCircle} />
          <KPICard title="总转发量 (Shares)" value={currentKPIs.shares} compareValue={compareKPIs.shares} icon={Share2} />
          <KPICard title="总收藏量 (Favorites)" value={currentKPIs.favorites} compareValue={compareKPIs.favorites} icon={Star} />
        </div>

        {showAnalysis && (
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
                            <ComposedChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis yAxisId="left" fontSize={12} stroke="#3b82f6" label={{ value: '累计粉丝', angle: -90, position: 'insideLeft' }} />
                                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#f97316" label={{ value: '日增粉丝', angle: 90, position: 'insideRight' }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.9)' }} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="fans" name="累计粉丝" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />
                                <Line yAxisId="left" type="monotone" dataKey="compareFans" name={`对比 (${compareRange.start}至${compareRange.end}) 累计粉丝`} stroke="#334155" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                                <Bar yAxisId="right" dataKey="netFans" name="日增粉丝" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar yAxisId="right" dataKey="compareNetFans" name={`对比 (${compareRange.start}至${compareRange.end}) 日增粉丝`} fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* User Stickiness (Quality Metrics) */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-500" />
                        用户粘性指标 (完播 vs 互动)
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis fontSize={12} stroke="#94a3b8" unit="%" />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.9)' }} />
                                <Legend />
                                <Line type="monotone" dataKey="completionRate" name="平均完播率(%)" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="compareCompletionRate" name={`对比 (${compareRange.start}至${compareRange.end}) 完播率(%)`} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} strokeOpacity={0.7} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="interactionRate" name="互动率(%)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="compareInteractionRate" name={`对比 (${compareRange.start}至${compareRange.end}) 互动率(%)`} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={2} strokeOpacity={0.7} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                                <ReferenceLine y={avgInteractionRate} stroke="#64748b" strokeDasharray="4 4" label={{ value: `均值: ${avgInteractionRate.toFixed(2)}%`, position: 'right', fill: '#64748b' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Content Heat Trend */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                        内容热度趋势 (播放量 vs 互动总量)
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={finalDetailTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                                <YAxis yAxisId="left" fontSize={12} stroke="#3b82f6" label={{ value: '播放量', angle: -90, position: 'insideLeft' }} />
                                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#f97316" label={{ value: '互动总量', angle: 90, position: 'insideRight' }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.9)' }} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="views" name="播放量" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                <Line yAxisId="left" type="monotone" dataKey="compareViews" name={`对比 (${compareRange.start}至${compareRange.end}) 播放量`} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} strokeOpacity={0.6} dot={false} activeDot={{ r: 4 }} />
                                <Line yAxisId="right" type="monotone" dataKey="interactions" name="互动总量" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                <Line yAxisId="right" type="monotone" dataKey="compareInteractions" name={`对比 (${compareRange.start}至${compareRange.end}) 互动总量`} stroke="#6366f1" strokeDasharray="5 5" strokeWidth={2} strokeOpacity={0.6} dot={false} activeDot={{ r: 4 }} />
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
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.9)' }} />
                            <Legend />
                            <Line type="monotone" dataKey="healthRate" name="粉赞比(%)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="compareHealthRate" name={`对比 (${compareRange.start}至${compareRange.end}) 粉赞比(%)`} stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={2} strokeOpacity={0.6} dot={{ r: 2 }} activeDot={{ r: 4 }} />
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

            {/* High View Count Positioning (Scatter) */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
            >
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <MousePointerClick className="w-5 h-5 text-red-500" />
                    播放量高光视频定位 (Top Videos)
                </h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" type="category" name="日期" allowDuplicatedCategory={false} />
                            <YAxis dataKey="views" type="number" name="播放量" unit="次" />
                            <ZAxis dataKey="title" type="category" name="标题" />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg max-w-xs">
                                            <p className="font-bold text-sm mb-1">{data.date}</p>
                                            <p className="text-xs text-gray-600 mb-2">{data.title}</p>
                                            <p className="text-blue-600 font-bold">播放量: {data.views.toLocaleString()}</p>
                                            <p className="text-gray-500 text-xs">点赞: {data.likes}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }} />
                            <Legend />
                            <Scatter name="所有视频" data={currentData} fill="#8884d8" shape="circle" />
                            <Scatter name="爆款视频 (Top 10)" data={explosiveVideos} fill="#ef4444" shape="star" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>

        {/* Data Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-white/50 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="text-red-500">🔥</span> 爆款视频数据明细 (Top 10)
            </h3>
            <span className="text-sm text-gray-500">已按播放量从高到低排序</span>
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
                  <th className="px-6 py-3">收藏</th>
                  <th className="px-6 py-3">转发</th>
                  <th className="px-6 py-3">完播率</th>
                </tr>
              </thead>
              <tbody>
                {explosiveVideos.map((item, index) => (
                  <tr key={index} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-900">#{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{item.date}</td>
                    <td className="px-6 py-4 max-w-xs truncate" title={item.title}>{item.title}</td>
                    <td className="px-6 py-4 font-bold text-blue-600">{item.views.toLocaleString()}</td>
                    <td className="px-6 py-4">{item.likes.toLocaleString()}</td>
                    <td className="px-6 py-4 text-purple-600 font-medium">{item.interactionRate.toFixed(2)}%</td>
                    <td className="px-6 py-4">{item.comments}</td>
                    <td className="px-6 py-4">{item.favorites}</td>
                    <td className="px-6 py-4">{item.shares}</td>
                    <td className="px-6 py-4">{item.completionRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {explosiveVideos.length === 0 && (
             <div className="p-8 text-center text-gray-400">当前所选日期范围内无数据</div>
          )}
        </motion.div>

        {/* Charts Section 1: Trends & Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Range Comparison */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-green-500">📊</span> 时间段 KPI 基础对比图 (Range A vs Range B)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChartData} barSize={60} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                  <YAxis fontSize={12} stroke="#94a3b8" scale="sqrt" domain={['auto', 'dataMax * 2']} />
                  <Tooltip cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.9)' }} />
                  <Legend />
                  <Bar dataKey="current" name={`当前周期 (${dateRange.start}至${dateRange.end})`} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="compare" name={`对比周期 (${compareRange.start}至${compareRange.end})`} fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

        {/* Month vs Month Comparison */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
        >
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-purple-500">📅</span> 月度对比分析 (Month A vs Month B)
                </h3>
                <div className="flex gap-4">
                    <select 
                        value={monthA}
                        onChange={(e) => setMonthA(e.target.value)}
                        className="bg-white/50 border border-gray-200 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <span className="text-gray-400 self-center">VS</span>
                    <select 
                        value={monthB}
                        onChange={(e) => setMonthB(e.target.value)}
                        className="bg-white/50 border border-gray-200 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthComparisonChartData} barSize={60} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                        <YAxis fontSize={12} stroke="#94a3b8" scale="sqrt" domain={['auto', 'dataMax * 2']} />
                        <Tooltip cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.9)' }} />
                        <Legend />
                        <Bar dataKey="A" name={`月份 A (${monthA})`} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="B" name={`月份 B (${monthB})`} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
        </div>
        
        {/* Monthly Trends Split Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Chart 1: Views & Likes */}
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
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="month" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                            <YAxis yAxisId="left" fontSize={12} stroke="#3b82f6" label={{ value: '月播放量', angle: -90, position: 'insideLeft' }} domain={[0, 'dataMax * 1.2']} />
                            <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#f43f5e" label={{ value: '月点赞量', angle: 90, position: 'insideRight' }} domain={[0, 'dataMax * 1.2']} />
                            <Tooltip cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.9)' }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="views" name="月播放量" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="likes" name="月点赞量" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Chart 2: Net Fans */}
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
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="month" fontSize={12} tickMargin={10} stroke="#94a3b8" />
                            <YAxis fontSize={12} stroke="#10b981" label={{ value: '月净增粉', angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
                            <Tooltip cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.9)' }} />
                            <Legend />
                            <Line type="monotone" dataKey="netFans" name="月净增粉" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>

        {/* Monthly Top Videos Filter */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50 mb-6"
        >
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-bold text-gray-700 flex items-center gap-2">
                    <span className="text-red-500">🏆</span> {userName ? `${userName}月度爆款视频 (Top 5)` : '月度爆款视频 (Top 5)'}
                </h4>
                <select  
                    value={selectedMonthForVideos}
                    onChange={(e) => setSelectedMonthForVideos(e.target.value)}
                    className="bg-white border border-gray-200 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                     {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
            <div className="space-y-3">
                {monthlyTopVideos.length > 0 ? (
                    monthlyTopVideos.map((video, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white/50 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-gray-100">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {idx + 1}
                                </span>
                                <div className="truncate">
                                    <p className="text-sm font-medium text-gray-800 truncate max-w-[200px] md:max-w-[300px]" title={video.title}>{video.title}</p>
                                    <p className="text-xs text-gray-500">{video.date}</p>
                                </div>
                            </div>
                            <div className="text-right whitespace-nowrap ml-4">
                                <p className="text-sm font-bold text-blue-600">{video.views.toLocaleString()} <span className="text-xs font-normal text-gray-400">播放</span></p>
                                <p className="text-xs text-gray-500">{video.likes.toLocaleString()} 点赞</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">该月份无数据</div>
                )}
            </div>
        </motion.div>



        {/* AI Analysis Card */}
        <div className="lg:col-span-2 space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
               <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span>AI 诊断分析范围</span>
               </div>
               <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input 
                    type="date" 
                    value={aiDateRange.start} 
                    onChange={e => setAiDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="border border-gray-200 rounded px-3 py-1.5 text-sm w-full sm:w-auto bg-white/50 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  />
                  <span className="text-gray-400">-</span>
                  <input 
                    type="date" 
                    value={aiDateRange.end} 
                    onChange={e => setAiDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="border border-gray-200 rounded px-3 py-1.5 text-sm w-full sm:w-auto bg-white/50 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  />
               </div>
            </motion.div>

            <AIAnalysisCard data={aiData} title="AI 智能运营诊断 (Intelligent Advisor)" mode="general-only" />
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

        {/* Toggle Button for Viral Videos Monitor - Always Visible */}
        <div className="flex justify-center py-6">
            <button 
                onClick={() => setShowViralMonitor(!showViralMonitor)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
            >
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                {showViralMonitor 
                    ? '收起全网律师爆款视频监控' 
                    : (data.length > 0 ? '查看全网律师爆款视频监控' : '暂无数据？先看看全网律师爆款视频')
                }
            </button>
        </div>

        {/* Daily Viral Videos Monitor */}
        {showViralMonitor && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
            >
              <ViralVideosSection />
            </motion.div>
        )}
      </div>
    </div>
  );
}
