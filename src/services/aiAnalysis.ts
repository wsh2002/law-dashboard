import { DataItem } from '../App';

export interface AIAnalysisConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const DEFAULT_CONFIG: AIAnalysisConfig = {
  apiKey: 'sk-be6a2391b68e4bddade06a308adbe6b1',
  baseUrl: 'https://api.deepseek.com', // Updated to official DeepSeek API endpoint
  model: 'deepseek-chat',
};

export const generateAnalysisPrompt = (data: DataItem[]): string => {
  // Sort data
  const sortedData = [...data].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  
  // Calculate basic stats
  const totalViews = sortedData.reduce((acc, item) => acc + item.views, 0);
  const totalNetFans = sortedData.reduce((acc, item) => acc + item.netFans, 0);
  const totalLikes = sortedData.reduce((acc, item) => acc + item.likes, 0);
  const totalComments = sortedData.reduce((acc, item) => acc + item.comments, 0);
  const totalShares = sortedData.reduce((acc, item) => acc + item.shares, 0);
  const totalFavorites = sortedData.reduce((acc, item) => acc + item.favorites, 0);
  const totalRecommendations = sortedData.reduce((acc, item) => acc + (item.recommendationsCount || 0), 0);

  const avgInteractionRate = (sortedData.reduce((acc, item) => acc + item.interactionRate, 0) / sortedData.length).toFixed(2);
  const avgCompletionRate = (sortedData.reduce((acc, item) => acc + parseFloat(String(item.completionRate).replace('%', '') || '0'), 0) / sortedData.length).toFixed(2);
  
  // AARRR Funnel Calculation
  const acquisition = totalViews;
  const activation = totalLikes + totalComments;
  const retention = totalNetFans;
  
  // Adaptive Revenue Stage
  const useRecommendations = totalFavorites === 0 && totalRecommendations > 0;
  const revenue = useRecommendations ? totalRecommendations : totalFavorites;
  const revenueLabel = useRecommendations ? '系统推荐 (Recommendation)' : '变现潜力 (Revenue - 收藏)';
  
  const referral = totalShares;

  const rateViewToAct = acquisition > 0 ? ((activation / acquisition) * 100).toFixed(2) : '0';
  const rateActToRet = activation > 0 ? ((retention / activation) * 100).toFixed(2) : '0';
  const rateRetToRev = retention > 0 ? ((revenue / retention) * 100).toFixed(2) : '0';
  const rateRevToRef = revenue > 0 ? ((referral / revenue) * 100).toFixed(2) : '0';

  // Top 3 Videos
  const topVideos = [...sortedData]
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
    .map(v => `- [${v.date}] "${v.title}": 播放${v.views}, 互动率${v.interactionRate}%, 完播${v.completionRate}`)
    .join('\n');

  return `
你是一位专业的短视频运营专家。请根据以下律所账号的近期数据，进行深入的运营诊断分析。
请不要使用套话，要根据具体数据给出犀利的洞察。

【数据概览】
- 统计周期: ${sortedData[0].date} 至 ${sortedData[sortedData.length-1].date}
- 总播放量 (Acquisition): ${totalViews}
- 粉丝净增 (Retention): ${totalNetFans}
- 互动总量 (Activation - 赞+评): ${totalLikes + totalComments}
- ${revenueLabel}: ${revenue}
- 自传播力 (Referral - 转发): ${totalShares}
- 平均互动率: ${avgInteractionRate}% (行业参考: >3%优秀)
- 平均完播率: ${avgCompletionRate}% (行业参考: >15%优秀)

【AARRR 漏斗各环节转化率】
1. 获取 -> 活跃 (Views -> Activation): ${rateViewToAct}% (用户看了视频后进行点赞/评论的比例)
2. 活跃 -> 留存 (Activation -> Retention): ${rateActToRet}% (互动用户中转化为粉丝的比例)
3. 留存 -> ${useRecommendations ? '推荐' : '变现'} (Retention -> ${useRecommendations ? 'Recommendation' : 'Revenue'}): ${rateRetToRev}% (${useRecommendations ? '粉丝中被系统/用户推荐的比例' : '粉丝中产生收藏/高意向行为的比例'})
4. ${useRecommendations ? '推荐' : '变现'} -> 传播 (${useRecommendations ? 'Recommendation' : 'Revenue'} -> Referral): ${rateRevToRef}% (${useRecommendations ? '被推荐用户中愿意转发的比例' : '高意向用户中愿意转发推荐的比例'})

【头部视频表现】
${topVideos}

【分析要求】
请输出一份简短精炼的诊断报告，包含以下三个部分（请使用 Markdown 格式）：

1. **📊 AARRR 漏斗深度诊断**
   - 重点分析上述【AARRR 漏斗各环节转化率】。
   - 找出转化率最低或异常的环节（"断点"）。
   - 针对该断点，给出具体的优化建议（例如：如果是“活跃->留存”低，建议如何加强人设引导关注）。

2. **⚠️ 风险与问题诊断**
   - 结合完播率和互动率，指出当前内容的主要短板。
   - 如果数据表现好，请指出潜在的增长瓶颈。

3. **💡 机会点与行动建议**
   - 基于头部视频的特征，分析用户偏好。
   - 给出下一阶段具体的选题方向或制作建议。

请保持语气专业、客观、且具有指导意义。字数控制在 500 字以内。
`;
};

export const fetchAIAnalysis = async (config: AIAnalysisConfig, prompt: string) => {
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: 'You are a helpful and professional data analyst specialized in social media.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI Analysis failed:', error);
    throw error;
  }
};

/**
 * Generate analysis prompt for a single viral video
 */
export const generateVideoAnalysisPrompt = (video: any): string => {
  return `
你是一位顶级短视频内容专家，擅长法律行业的爆款拆解。
请根据以下视频的【视觉文案】、【全文台词】和【互动数据】进行深度拆解。

【视频基本信息】
- 标题/文案: ${video.title}
- 全文内容/台词: ${video.content || '暂无详细台词，请根据标题分析'}
- 作者: ${video.author}
- 点赞数: ${video.likes.toLocaleString()}

【深度拆解要求】
请特别关注视频中可能出现的“关键法条文字特效突出显示”等视觉策略，并输出以下报告：

1. **⚖️ 法律核心拆解**
   - 识别视频中提到的具体法律条文或法律概念。
   - 分析作者是如何将枯燥的法条转化为用户听得懂的语言的。

2. **🎬 视觉与文案策略**
   - **文字特效分析**: 分析视频中为何要将某些文字（如法条、关键词）进行突出显示？这种视觉刺激对留存率有何贡献？
   - **黄金3秒**: 拆解视频第一句话是如何钩住用户的。

3. **🧠 用户心理博弈**
   - 识别视频利用了用户哪种心理（如：对村委会的恐惧、对补偿款的期待、对法律盲区的担忧）。

4. **🚀 爆款复刻指南**
   - 总结该视频最值得模仿的 3 个点（文案钩子、视觉呈现、法条解读方式）。

5. **🛠️ 针对性优化建议**
   - 基于现有台词，给出 1 条能显著提升转化率（私信/咨询）的改写建议。

请输出专业、犀利、干货满满的 Markdown 报告。
`;
};

export const fetchVideoAnalysis = async (config: AIAnalysisConfig, video: any) => {
  const prompt = generateVideoAnalysisPrompt(video);
  return fetchAIAnalysis(config, prompt);
};
