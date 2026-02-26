import { DataItem } from '../App';

export interface AIAnalysisConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const DEFAULT_CONFIG: AIAnalysisConfig = {
  apiKey: 'sk-be6a2391b68e4bddade06a308adbe6b1',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
};

// 官方路径模型映射逻辑
export const getProviderModels = () => {
  return {
    R1: 'deepseek-reasoning',
    V3: 'deepseek-chat'
  };
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
  const isReasoning = config.model.includes('reasoning') || config.model.includes('r1');
  
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: isReasoning 
          ? [ { role: 'user', content: prompt } ] // Reasoning models (R1) sometimes perform better or only support user messages
          : [
            { role: 'system', content: 'You are a helpful and professional data analyst specialized in social media.' },
            { role: 'user', content: prompt }
          ],
        // R1 model (reasoning) usually ignores temperature or requires it to be 1.0 or undefined
        temperature: isReasoning ? 1.0 : 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: { message: `HTTP Error ${response.status}: ${errorText}` } };
      }
      
      const errorMsg = errorData.error?.message || `API Error: ${response.status}`;
      const debugInfo = ` (URL: ${config.baseUrl}, Model: ${config.model})`;
      console.error('DeepSeek API Error details:', errorData);
      throw new Error(`${errorMsg}${debugInfo}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('AI Analysis fetch failed:', error);
    throw error;
  }
};

/**
 * Generate analysis prompt for a single viral video
 */
/**
 * Step 1: Convert raw ASR text to structured Legal Document using DeepSeek-R1 (Reasoning)
 */
export const convertToDocument = async (config: AIAnalysisConfig, video: any) => {
  const models = getProviderModels();
  const prompt = `
你是一位专业的法律速记员和文档整理专家。
请将以下这段视频的原始台词整理成一份正式的【法律咨询案例/科普文档】。

【原始台词/信息】:
${video.content || video.title}

【要求】:
1. 修正台词中的错别字（尤其是法律术语）。
2. 按照“案情简介”、“核心法条”、“处理建议”的结构进行排版。
3. 保持内容原意，但语言要更书面化。
4. 使用 Markdown 格式输出。
`;
  
  // 使用 R1 模型进行逻辑整理
  return fetchAIAnalysis({ ...config, model: models.R1 }, prompt);
};

/**
 * Step 2: Deep Analysis using DeepSeek-V3.2 (DeepSeek-Chat) based on converted document
 */
export const analyzeDocument = async (config: AIAnalysisConfig, document: string, video: any) => {
  const models = getProviderModels();
  const prompt = `
你是一位顶级的法律内容运营专家。请根据以下由 DeepSeek-R1 整理好的【法律文档】进行深度拆解分析。

【文档内容】:
${document}

【互动数据】:
点赞: ${video.likes}, 评论: ${video.comments}

【深度拆解要求】:
1. **⚖️ 法律核心拆解**: 识别视频中提到的具体法律条文，分析作者是如何将法条“人话化”的。
2. **🎬 视觉与文案策略**: 分析视频中的文字特效（如关键法条突出）对留存的贡献。
3. **🧠 用户心理博弈**: 识别视频利用了用户哪种心理。
4. **🚀 爆款复刻指南**: 总结 3 个最值得模仿的爆款因子。
5. **🛠️ 针对性优化建议**: 给出提升转化率的建议。

请输出专业、犀利的 Markdown 报告。
`;

  // 使用 V3 模型进行快速深度分析
  return fetchAIAnalysis({ ...config, model: models.V3 }, prompt);
};
