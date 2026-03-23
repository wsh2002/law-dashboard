import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, Settings, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { DataItem } from '../App';
import { AIAnalysisConfig, DEFAULT_CONFIG, generateAnalysisPrompt, fetchAIAnalysis } from '../services/aiAnalysis';

interface AIAnalysisCardProps {
  data: DataItem[];
  title?: string;
  mode?: 'all' | 'aarrr-only' | 'general-only';
  platform?: string;
}

const AIAnalysisCard = ({ data, title, mode = 'all', platform = 'default' }: AIAnalysisCardProps) => {
  const [showConfig, setShowConfig] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(() => {
    const saved = localStorage.getItem(`ai_result_${platform}`);
    return saved ? saved : null;
  });
  const [config, setConfig] = useState<AIAnalysisConfig>(() => {
    const saved = localStorage.getItem('ai_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Auto-fill if saved config has empty key but we have a default one (e.g. from code update)
      if (!parsed.apiKey && DEFAULT_CONFIG.apiKey) {
        return { 
          ...parsed, 
          apiKey: DEFAULT_CONFIG.apiKey,
          baseUrl: DEFAULT_CONFIG.baseUrl || parsed.baseUrl 
        };
      }
      return parsed;
    }
    return DEFAULT_CONFIG;
  });

  // Update AI result when platform changes
  useEffect(() => {
    const saved = localStorage.getItem(`ai_result_${platform}`);
    setAiResult(saved ? saved : null);
  }, [platform]);

  const handleSaveConfig = () => {
    localStorage.setItem('ai_config', JSON.stringify(config));
    setShowConfig(false);
  };

  const handleAnalyze = async () => {
    if (!config.apiKey) {
      setShowConfig(true);
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const prompt = generateAnalysisPrompt(data, platform);
      const result = await fetchAIAnalysis(config, prompt);
      setAiResult(result);
      localStorage.setItem(`ai_result_${platform}`, result);
    } catch (error) {
      alert('AI 分析失败，请检查 API Key 或网络设置。\n' + (error as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analysis = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Sort by date just in case
    const sortedData = [...data].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    
    // 1. Fan Growth
    const startItem = sortedData[0];
    const endItem = sortedData[sortedData.length - 1];
    
    // Calculate total net fans from the sum of daily net increases (more accurate for range)
    const totalNetFans = sortedData.reduce((acc, item) => acc + item.netFans, 0);
    const startFans = startItem.fans;
    // End fans should ideally be startFans + totalNetFans, or just take the last record's fans
    // We'll use the recorded fans from the last item for consistency with the chart
    const endFans = endItem.fans; 
    
    const growthRate = startFans > 0 ? ((totalNetFans / startFans) * 100).toFixed(1) : '0';
    const days = sortedData.length;
    const dailyAvgFans = days > 0 ? Math.round(totalNetFans / days) : 0;
    
    // Find peak fan growth day
    const peakFanDay = sortedData.reduce((prev, current) => (prev.netFans > current.netFans) ? prev : current, sortedData[0]);

    // 2. Content Performance
    const totalViews = sortedData.reduce((acc, item) => acc + item.views, 0);
    const avgViews = days > 0 ? Math.round(totalViews / days) : 0;
    
    // Calculate averages for rates
    let sumCompletion = 0;
    let sumInteraction = 0;
    
    sortedData.forEach(item => {
        sumCompletion += parseFloat(String(item.completionRate).replace('%', '')) || 0;
        sumInteraction += item.interactionRate;
    });
    
    const avgCompletion = days > 0 ? (sumCompletion / days).toFixed(2) : '0';
    const avgInteraction = days > 0 ? (sumInteraction / days).toFixed(2) : '0';

    // Top View Video
    const topViewVideo = sortedData.reduce((prev, current) => (prev.views > current.views) ? prev : current, sortedData[0]);

    // 3. Risk & Opportunity Analysis (Fallback Rule-based)
    const risks: { title: string; detail: string; suggestions: string[] }[] = [];
    const opportunities: { title: string; detail: string; video?: DataItem; suggestions: string[] }[] = [];

    // --- Risk Analysis ---
    const avgCompletionNum = parseFloat(avgCompletion);
    const avgInteractionNum = parseFloat(avgInteraction);

    if (avgCompletionNum < 15) {
        risks.push({
            title: `完播率偏低 (${avgCompletionNum}%)`,
            detail: "用户在视频前几秒流失严重，未能抓住注意力。",
            suggestions: [
                "检查视频前3秒“黄金开场” (提问/冲突/悬念)",
                "视频节奏过慢，建议加快剪辑或缩短时长",
                "添加关键帧字幕，提升信息获取效率"
            ]
        });
    }

    if (avgInteractionNum < 2.0) {
        risks.push({
            title: `互动率不足 (${avgInteractionNum}%)`,
            detail: "用户看完视频后缺乏点赞或评论的动力。",
            suggestions: [
                "在视频结尾增加明确的行动号召 (CTA)",
                "尝试抛出争议性话题或提问引发评论区讨论",
                "优化文案，增加情感共鸣点"
            ]
        });
    }

    if (parseFloat(growthRate) < 0.5) {
         risks.push({
            title: "粉丝增长停滞",
            detail: `周期内粉丝增长仅为 ${growthRate}%，需警惕。`,
            suggestions: [
                "分析近期掉粉视频，避免踩雷",
                "增加直播频次，提升粉丝粘性",
                "尝试新的选题方向或拍摄风格"
            ]
        });
    }
    
    // --- Opportunity Analysis ---
    // 1. High Interaction Video
    const highInteractionVideo = sortedData.reduce((prev, current) => (prev.interactionRate > current.interactionRate) ? prev : current, sortedData[0]);
    if (highInteractionVideo.interactionRate > 3.0 || highInteractionVideo.interactionRate > avgInteractionNum * 1.5) {
        opportunities.push({
            title: "高互动潜力内容",
            detail: `${format(highInteractionVideo.parsedDate, 'MM-dd')} 发布的内容互动率高达 ${highInteractionVideo.interactionRate.toFixed(1)}%。`,
            video: highInteractionVideo,
            suggestions: [
                "该选题引发了用户强烈共鸣，建议制作续集或系列",
                "复盘该视频的评论区，提取用户关心的问题作为新选题"
            ]
        });
    }

    // 2. High Completion Video
    const highCompletionVideo = sortedData.reduce((prev, current) => {
        const prevRate = parseFloat(String(prev.completionRate).replace('%', ''));
        const currRate = parseFloat(String(current.completionRate).replace('%', ''));
        return (prevRate > currRate) ? prev : current;
    }, sortedData[0]);
    
    const highCompletionRate = parseFloat(String(highCompletionVideo.completionRate).replace('%', ''));
    if (highCompletionRate > 20 || highCompletionRate > avgCompletionNum * 1.5) {
         opportunities.push({
            title: "高完播优质脚本",
            detail: `${format(highCompletionVideo.parsedDate, 'MM-dd')} 发布的视频完播率达到 ${highCompletionVideo.completionRate}。`,
            video: highCompletionVideo,
            suggestions: [
                "该视频结构非常成功，建议提炼为标准脚本模板",
                "分析该视频的开头钩子和中间转折点"
            ]
        });
    }

    // 3. Peak Growth Day
    if (peakFanDay.netFans > dailyAvgFans * 2 && peakFanDay.netFans > 10) {
        opportunities.push({
            title: "爆发式涨粉日",
            detail: `${format(peakFanDay.parsedDate, 'MM-dd')} 单日涨粉 ${peakFanDay.netFans}，远超平均水平。`,
            video: sortedData.find(d => d.date === peakFanDay.date), // Assuming the video that day contributed
            suggestions: [
                "检查当日是否有行业表款视频或直播，总结成功经验",
                "利用热度持续更新相关话题"
            ]
        });
    }

    // --- AARRR Heuristic Analysis ---
    const aarrrAnalysis = {
        acquisition: { score: 0, status: '', desc: '' },
        activation: { score: 0, status: '', desc: '' },
        retention: { score: 0, status: '', desc: '' },
        revenue: { score: 0, status: '', desc: '' },
        referral: { score: 0, status: '', desc: '' }
    };

    // Simple heuristics
    const totalLikes = sortedData.reduce((acc, item) => acc + item.likes, 0);
    const totalComments = sortedData.reduce((acc, item) => acc + item.comments, 0);
    const totalFavorites = sortedData.reduce((acc, item) => acc + item.favorites, 0);

    // Activation Rate (Interactions / Views)
    const activationRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
    if (activationRate > 3) {
        aarrrAnalysis.activation = { score: 5, status: '优秀', desc: '用户互动意愿极高，内容共鸣感强' };
    } else if (activationRate > 1) {
        aarrrAnalysis.activation = { score: 3, status: '良好', desc: '互动表现尚可，仍有提升空间' };
    } else {
        aarrrAnalysis.activation = { score: 1, status: '需优化', desc: '用户互动冷淡，需加强引导' };
    }

    // Retention Rate (Net Fans / Views - Proxy)
    const retentionRate = totalViews > 0 ? (totalNetFans / totalViews) * 1000 : 0; // Per 1000 views
    if (retentionRate > 2) {
        aarrrAnalysis.retention = { score: 5, status: '强劲', desc: '转粉效率极高，账号人设吸引力强' };
    } else if (retentionRate > 0.5) {
        aarrrAnalysis.retention = { score: 3, status: '稳定', desc: '粉丝沉淀稳定，可强化关注引导' };
    } else {
        aarrrAnalysis.retention = { score: 1, status: '流失', desc: '转粉率低，需明确账号价值定位' };
    }

    // Revenue Potential (Favorites / Views)
    const revenueRate = totalViews > 0 ? (totalFavorites / totalViews) * 100 : 0;
    if (revenueRate > 0.5) {
        aarrrAnalysis.revenue = { score: 5, status: '高潜', desc: '收藏比高，用户有强烈的咨询/回看需求' };
    } else {
        aarrrAnalysis.revenue = { score: 3, status: '一般', desc: '收藏意愿一般，需增加干货价值' };
    }

    return {
        dateRange: {
            start: format(startItem.parsedDate, 'MM-dd'),
            end: format(endItem.parsedDate, 'MM-dd')
        },
        growth: {
            rate: growthRate,
            netFans: totalNetFans,
            dailyAvg: dailyAvgFans,
            peakDay: peakFanDay,
            startFans,
            endFans
        },
        content: {
            totalViews,
            avgViews,
            avgCompletion,
            avgInteraction,
            topVideo: topViewVideo
        },
        aarrr: aarrrAnalysis,
        risks: risks.slice(0, 2), // Show top 2 risks
        opportunities: opportunities.slice(0, 2) // Show top 2 opportunities
    };
  }, [data]);

  const { dateRange, growth, content, aarrr, risks, opportunities } = analysis || {};

  if (!analysis) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 }}
      className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-white/50 p-6 mb-8 relative group"
    >
      {/* Settings Button */}
      <button 
        onClick={() => setShowConfig(!showConfig)}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-white/50"
        title="配置 AI 模型"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Configuration Modal/Panel */}
      {showConfig && (
        <div className="absolute top-14 right-4 z-20 bg-white p-4 rounded-lg shadow-xl border border-gray-200 w-80 animate-in fade-in slide-in-from-top-2">
            <h4 className="font-bold text-gray-800 mb-3 text-sm">配置大模型 API (AI Config)</h4>
            <div className="space-y-3">
                <div>
                    <label className="block text-xs text-gray-600 mb-1">API Endpoint (Base URL)</label>
                    <input 
                        type="text" 
                        value={config.baseUrl}
                        onChange={e => setConfig({...config, baseUrl: e.target.value})}
                        className="w-full text-xs border rounded px-2 py-1.5 bg-gray-50"
                        placeholder="https://api.deepseek.com/v1"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1">API Key</label>
                    <input 
                        type="password" 
                        value={config.apiKey}
                        onChange={e => setConfig({...config, apiKey: e.target.value})}
                        className="w-full text-xs border rounded px-2 py-1.5 bg-gray-50"
                        placeholder="sk-..."
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Model Name</label>
                    <input 
                        type="text" 
                        value={config.model}
                        onChange={e => setConfig({...config, model: e.target.value})}
                        className="w-full text-xs border rounded px-2 py-1.5 bg-gray-50"
                        placeholder="deepseek-chat"
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <button onClick={handleSaveConfig} className="flex-1 bg-indigo-600 text-white text-xs py-1.5 rounded hover:bg-indigo-700">保存配置</button>
                    <button onClick={() => setShowConfig(false)} className="flex-1 bg-gray-100 text-gray-600 text-xs py-1.5 rounded hover:bg-gray-200">取消</button>
                </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
                * 推荐使用 DeepSeek、Moonshot (Kimi) 或 ChatGPT。API Key 仅存储在本地浏览器。
            </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            {title || 'AI 智能运营诊断 (Intelligent Advisor)'}
        </h3>
        
        {/* Generate AI Analysis Button */}
        {!aiResult && (
            <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="mr-8 flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI 思考中...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4" />
                        生成 AI 深度分析
                    </>
                )}
            </button>
        )}
      </div>
      
      <div className={`grid grid-cols-1 ${mode === 'aarrr-only' ? '' : 'md:grid-cols-2'} gap-6`}>
        {/* Left Column: Stats */}
        <div className="space-y-4">
            {/* Fan Growth Section */}
            {mode !== 'aarrr-only' && (
            <div className="bg-white/60 p-4 rounded-lg border border-indigo-50/50">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    【粉丝增长】
                </h4>
                <div className="space-y-2 text-sm text-gray-700">
                    <p className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        <span>
                            {dateRange!.start} : <span className="font-mono font-bold">{growth!.startFans.toLocaleString()}</span> 
                            {' '}→{' '} 
                            {dateRange!.end} : <span className="font-mono font-bold">{growth!.endFans.toLocaleString()}</span>
                        </span>
                    </p>
                    <p className="pl-3.5 text-gray-600">
                        净增: <span className="font-bold text-green-600">+{growth!.netFans.toLocaleString()}</span> 
                        <span className="text-xs ml-1 bg-green-100 text-green-700 px-1.5 py-0.5 rounded">+{growth!.rate}%</span>
                    </p>
                    <div className="flex items-center gap-4 pl-3.5 pt-1">
                        <div>
                            <span className="text-gray-500 text-xs">日均增粉</span>
                            <p className="font-bold">{growth!.dailyAvg}</p>
                        </div>
                        <div className="h-6 w-px bg-gray-200"></div>
                        <div>
                            <span className="text-gray-500 text-xs">峰值日 ({format(growth!.peakDay.parsedDate, 'MM-dd')})</span>
                            <p className="font-bold text-blue-600">+{growth!.peakDay.netFans}</p>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* AARRR Diagnosis Section (NEW) */}
            {mode !== 'general-only' && (
            <div className="bg-white/60 p-4 rounded-lg border border-indigo-50/50">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                    <Settings className="w-4 h-4 text-blue-500" />
                    【AARRR 模型诊断】
                </h4>
                <div className="space-y-3 text-sm">
                     {/* Activation */}
                     <div className="flex items-center justify-between">
                        <span className="text-gray-600">活跃 (Activation)</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${aarrr!.activation.score >= 3 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {aarrr!.activation.status}
                        </span>
                     </div>
                     <p className="text-xs text-gray-500 mb-2">{aarrr!.activation.desc}</p>
                     
                     {/* Retention */}
                     <div className="flex items-center justify-between">
                        <span className="text-gray-600">留存 (Retention)</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${aarrr!.retention.score >= 3 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {aarrr!.retention.status}
                        </span>
                     </div>
                     <p className="text-xs text-gray-500 mb-2">{aarrr!.retention.desc}</p>

                     {/* Revenue */}
                     <div className="flex items-center justify-between">
                        <span className="text-gray-600">变现 (Revenue)</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${aarrr!.revenue.score >= 5 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            {aarrr!.revenue.status}
                        </span>
                     </div>
                     <p className="text-xs text-gray-500">{aarrr!.revenue.desc}</p>
                </div>
            </div>
            )}

            {/* Content Performance Section */}
            {mode !== 'aarrr-only' && (
            <div className="bg-white/60 p-4 rounded-lg border border-indigo-50/50">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-purple-500" />
                    【内容表现】
                </h4>
                <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-2 rounded border border-gray-100">
                            <span className="text-xs text-gray-500 block">平均播放量</span>
                            <span className="font-bold text-gray-800">{content!.avgViews.toLocaleString()}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-100">
                            <span className="text-xs text-gray-500 block">完播率均值</span>
                            <span className="font-bold text-gray-800">{content!.avgCompletion}%</span>
                        </div>
                    </div>
                    
                    <p className="text-gray-700">
                        <span className="font-medium">互动率均值: {content!.avgInteraction}%</span>
                        <span className="text-xs text-gray-400 ml-2">| 健康阈值参考：&gt;3%为优</span>
                    </p>
                    
                    <div className="mt-2 pt-2 border-t border-gray-200/50">
                        <p className="text-xs text-red-500 font-bold mb-1">🔥 播放冠军：{format(content!.topVideo.parsedDate, 'MM-dd')}</p>
                        <p className="text-xs text-gray-800 truncate font-medium mb-1" title={content!.topVideo.title}>
                            {content!.topVideo.title}
                        </p>
                        <p className="text-xs text-gray-500 flex gap-3">
                            <span>播放 {content!.topVideo.views.toLocaleString()}</span>
                            <span>互动率 {content!.topVideo.interactionRate.toFixed(1)}%</span>
                        </p>
                    </div>
                </div>
            </div>
            )}
        </div>

        {/* Right Column: Insights (Switchable between Local Rule-based and AI) */}
        {mode !== 'aarrr-only' && (
        <div className="space-y-4">
             {aiResult ? (
                 <div className="h-full bg-white/80 p-4 rounded-lg border border-indigo-100 shadow-inner overflow-y-auto max-h-[400px]">
                     <div className="prose prose-sm prose-indigo max-w-none">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded">✨ AI 深度分析报告</span>
                            <button onClick={() => {
                              setAiResult(null);
                              localStorage.removeItem(`ai_result_${platform}`);
                            }} className="text-xs text-gray-400 hover:text-gray-600">清除</button>
                        </div>
                        <ReactMarkdown>{aiResult}</ReactMarkdown>
                     </div>
                 </div>
             ) : (
                <>
                    {/* Risk Warning (Local Rule-based) */}
                    {risks && risks.length > 0 && (
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 h-full max-h-[180px] overflow-y-auto">
                            <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2 text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                风险提示：{risks[0].title}
                            </h4>
                            <div className="text-sm text-orange-900/80 space-y-2">
                                <p>{risks[0].detail}</p>
                                <div className="bg-white/50 p-3 rounded text-xs leading-relaxed">
                                    <p className="font-bold mb-1">💡 优化建议：</p>
                                    <ul className="list-disc list-inside space-y-1 text-orange-800">
                                        {risks[0].suggestions.map((suggestion, idx) => (
                                            <li key={idx}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Opportunity (Local Rule-based) */}
                    {opportunities && opportunities.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 h-full max-h-[180px] overflow-y-auto">
                            <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-sm">
                                <Lightbulb className="w-4 h-4" />
                                机会点：{opportunities[0].title}
                            </h4>
                            <div className="text-sm text-blue-900/80">
                                <p className="mb-2">{opportunities[0].detail}</p>
                                {opportunities[0].video && (
                                    <div className="bg-white/60 p-3 rounded border border-blue-200/50 mb-2">
                                        <p className="text-xs text-gray-500 mb-1">关联视频</p>
                                        <p className="font-medium text-gray-800 line-clamp-2" title={opportunities[0].video.title}>
                                            {opportunities[0].video.title}
                                        </p>
                                    </div>
                                )}
                                <div className="bg-white/50 p-3 rounded text-xs leading-relaxed">
                                    <p className="font-bold mb-1 text-blue-800">🚀 建议动作：</p>
                                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                                        {opportunities[0].suggestions.map((suggestion, idx) => (
                                            <li key={idx}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </>
             )}
        </div>
        )}
      </div>
    </motion.div>
  );
};

export default AIAnalysisCard;
