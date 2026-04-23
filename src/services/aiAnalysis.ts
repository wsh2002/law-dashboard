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

export const getProviderModels = () => {
  return {
    R1: 'deepseek-reasoning',
    V3: 'deepseek-chat'
  };
};

/** 漏斗文字进度条：与 benchmark 对比，8 格填充 */
export function getBarText(value: string | number, benchmark: number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  const safeN = Number.isFinite(n) ? n : 0;
  const b = benchmark > 0 ? benchmark : 1;
  const ratio = Math.min(safeN / b, 1);
  const filled = Math.round(ratio * 8);
  const empty = 8 - filled;
  const bar = '▓'.repeat(filled) + '░'.repeat(empty);
  const position = ratio >= 1 ? '✅ 达标' : ratio >= 0.5 ? '⚠️ 偏低' : '🔴 危险';
  return `[${bar}] ${position}（基准: ${b}%）`;
}

export const generateAnalysisPrompt = (data: DataItem[]): string => {
  const sortedData = [...data].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

  const totalViews = sortedData.reduce((acc, item) => acc + item.views, 0);
  const totalNetFans = sortedData.reduce((acc, item) => acc + item.netFans, 0);
  const totalLikes = sortedData.reduce((acc, item) => acc + item.likes, 0);
  const totalComments = sortedData.reduce((acc, item) => acc + item.comments, 0);
  const totalShares = sortedData.reduce((acc, item) => acc + item.shares, 0);
  const totalFavorites = sortedData.reduce((acc, item) => acc + item.favorites, 0);
  const totalRecommendations = sortedData.reduce((acc, item) => acc + (item.recommendationsCount || 0), 0);

  const avgInteractionRate = (sortedData.reduce((acc, item) => acc + item.interactionRate, 0) / sortedData.length).toFixed(2);
  const avgCompletionRate = (sortedData.reduce((acc, item) => acc + parseFloat(String(item.completionRate).replace('%', '') || '0'), 0) / sortedData.length).toFixed(2);

  const acquisition = totalViews;
  const activation = totalLikes + totalComments;
  const retention = totalNetFans;

  const hasFavorites = totalFavorites > 0;
  const hasRecommendations = totalRecommendations > 0;

  let revenue, revenueLabel;
  if (hasFavorites) {
      revenue = totalFavorites;
      revenueLabel = '变现潜力 (Revenue - 收藏)';
  } else if (hasRecommendations) {
      revenue = totalRecommendations;
      revenueLabel = '系统推荐 (Recommendation)';
  } else {
      revenue = 0;
      revenueLabel = '变现意向 (Revenue - 暂无收藏数据)';
  }

  const referral = totalShares;

  const rateViewToAct = acquisition > 0 ? ((activation / acquisition) * 100).toFixed(2) : '0';
  const rateActToRet = activation > 0 ? ((retention / activation) * 100).toFixed(2) : '0';
  const rateRetToRev = retention > 0 ? ((revenue / retention) * 100).toFixed(2) : '0';
  const rateRevToRef = revenue > 0 ? ((referral / revenue) * 100).toFixed(2) : '0';

  const sortedByViews = [...sortedData].sort((a, b) => b.views - a.views);
  const topVideos = sortedByViews
    .slice(0, 3)
    .map(v => `- [${v.date}] "${v.title}": 播放${v.views.toLocaleString()}, 互动率${v.interactionRate.toFixed(1)}%, 完播${v.completionRate}, 评论${v.comments}`)
    .join('\n');
  const bottomVideos = sortedByViews
    .slice(-3)
    .reverse()
    .map(v => `- [${v.date}] "${v.title}": 播放${v.views.toLocaleString()}, 互动率${v.interactionRate.toFixed(1)}%, 完播${v.completionRate}, 评论${v.comments}`)
    .join('\n');

  const midIdx = Math.floor(sortedData.length / 2);
  const firstHalf = sortedData.slice(0, midIdx);
  const secondHalf = sortedData.slice(midIdx);
  const calcAvg = (arr: typeof sortedData, key: 'views' | 'netFans' | 'interactionRate') =>
    arr.length > 0 ? arr.reduce((s, d) => s + d[key], 0) / arr.length : 0;
  const trendViews = [calcAvg(firstHalf, 'views'), calcAvg(secondHalf, 'views')];
  const trendFans = [calcAvg(firstHalf, 'netFans'), calcAvg(secondHalf, 'netFans')];
  const trendInteraction = [calcAvg(firstHalf, 'interactionRate'), calcAvg(secondHalf, 'interactionRate')];
  const trendDir = (a: number, b: number) => b > a * 1.05 ? '↑上升' : b < a * 0.95 ? '↓下降' : '→持平';

  const highInteractionVideo = [...sortedData].sort((a, b) => b.interactionRate - a.interactionRate)[0];

  const revenueStage = hasFavorites ? '变现' : hasRecommendations ? '推荐' : '咨询';

  return `你是一位深耕法律行业短视频赛道的运营操盘手，同时精通数据分析。你服务的是一个律所/法律IP账号。
你的读者是每天要发视频、写脚本、盯数据的一线运营人员——他们需要的不是教科书，而是"今天/这周我该做什么"。

## 硬性约束
- 禁止复述原始数据（读者已经看到了仪表盘上的数字）。
- 每条建议必须具体到可执行动作（反例："提高内容质量"；正例："下一条视频前3秒用'你知道XX情况可以索赔吗？'式提问开头"）。
- 引用数据时只引关键对比数字，不要罗列。
- 如果某项数据表现已经很好，直接说"维持即可"，不要硬找问题。
- 语气：像一个靠谱的运营搭档在群里给你发消息，专业但不端着。

---

【数据概览 · ${sortedData.length}天】
- 周期: ${sortedData[0].date} → ${sortedData[sortedData.length - 1].date}
- 总播放: ${totalViews.toLocaleString()} | 粉丝净增: ${totalNetFans > 0 ? '+' : ''}${totalNetFans.toLocaleString()} | 互动(赞+评): ${(totalLikes + totalComments).toLocaleString()}
- ${revenueLabel}: ${revenue.toLocaleString()} | 转发: ${totalShares.toLocaleString()}
- 均互动率: ${avgInteractionRate}% (法律赛道参考: >3%优秀 / 1~3%正常 / <1%危险)
- 均完播率: ${avgCompletionRate}% (短视频参考: >15%优秀 / 8~15%正常 / <8%需优化)

【趋势 · 前半段 vs 后半段】
- 日均播放: ${Math.round(trendViews[0]).toLocaleString()} → ${Math.round(trendViews[1]).toLocaleString()} ${trendDir(trendViews[0], trendViews[1])}
- 日均涨粉: ${trendFans[0].toFixed(0)} → ${trendFans[1].toFixed(0)} ${trendDir(trendFans[0], trendFans[1])}
- 日均互动率: ${trendInteraction[0].toFixed(2)}% → ${trendInteraction[1].toFixed(2)}% ${trendDir(trendInteraction[0], trendInteraction[1])}

【AARRR 漏斗转化率】
1. 获取→活跃 (曝光→点赞评论): ${rateViewToAct}% ${getBarText(rateViewToAct, 3)}
2. 活跃→留存 (互动→关注): ${rateActToRet}% ${getBarText(rateActToRet, 10)}
3. 留存→${revenueStage}: ${rateRetToRev}% ${getBarText(rateRetToRev, 5)}
4. ${revenueStage}→传播 (转发裂变): ${rateRevToRef}% ${getBarText(rateRevToRef, 8)}

【爆款 TOP3 · 可复制特征】
${topVideos}
（请为每条爆款视频分析：① 钩子类型 ② 内容框架 ③ 下一条可复制的具体动作）

【低迷 BOTTOM3】
${bottomVideos}
（请为每条低迷视频简要指出最可能的失败原因，一句话即可）

【互动率最高】
- [${highInteractionVideo.date}] "${highInteractionVideo.title}": 互动率${highInteractionVideo.interactionRate.toFixed(1)}%, 播放${highInteractionVideo.views.toLocaleString()}, 评论${highInteractionVideo.comments}

---

## 输出格式（严格按以下结构，使用 Markdown）

### 💬 开场（1~2句话）
根据本期整体数据走势，用一句接地气的话描述当前账号状态。
如果涨势好：肯定 + 立刻指出最需要抓的机会。
如果数据差：不要说废话，直接说"我帮你找到原因了"。

### 🔍 一句话核心诊断
> 用一句话概括当前账号最大的问题或最值得抓住的机会（必须包含具体数字）。

### 🔬 爆款 vs 低迷对比拆解
用表格对比爆款和低迷视频的共性特征：
| 维度 | 爆款共性 | 低迷共性 |
|------|----------|----------|
| 开头钩子 | ? | ? |
| 选题角度 | ? | ? |
| 标题关键词 | ? | ? |
| 内容结构 | ? | ? |
每条爆款补充：可复制的 1 个具体动作。每条低迷补充：最可能的失败原因（一句话）。

### 📈 趋势判断
- 判断账号处于「起量期 / 平台期 / 衰退期」，并说明判断依据。
- 如果下降：指出最可能的 1 个原因 + 1 个止血动作。
- 如果上升：指出能加速的 1 个杠杆点。

### ⚠️ 风险与问题诊断
- 结合完播率、互动率、趋势走向，指出当前内容的 1~2 个核心短板。
- 如果数据表现好，指出潜在的增长瓶颈（别硬找问题，瓶颈也是价值）。
- 对最关键的 1 个风险：如果 **7天内不处理**，会发生什么（尽量给出数字预测）？给出止损动作。

### 💡 机会点与行动建议
- 基于爆款视频特征和互动率最高视频的用户反馈，分析用户真正偏好什么。
- 给出下一阶段 **3 条行动建议**（按优先级排序）：
  1. 【最高优先】做什么 → 为什么 → 预期效果
  2. 【推荐】做什么 → 为什么 → 预期效果
  3. 【可选】做什么 → 为什么 → 预期效果
> 每条必须参考爆款/低迷视频的对比特征给出，不能泛泛而谈。

### 📅 本周选题排期（3~5条）
用表格给出具体排期：
| 建议发布日 | 选题方向 | 标题模板 | 选题理由 |
|------------|----------|----------|----------|
| 周X | ? | "…" | 延续爆款/蹭热点/补短板 |
标题模板要直接能用，不要给空泛的方向。

### 💬 评论区运营策略
- **置顶评论模板**：本期最适合用什么话引导互动（给出具体文案）。
- **高频问题回复话术**：从爆款评论区推测用户最关心的 1~2 个问题，给出回复模板。
- **争议引导**：给出 1 个适合抛到评论区的争议性提问，用来拉评论量。

### 🎬 下一条视频脚本大纲（30秒骨架）
> **开头(0-3s)** 钩子：[具体话术]
> **冲突(3-10s)** 痛点展开：[一句话描述]
> **转折(10-20s)** 干货/法条人话化：[核心内容]
> **结尾(20-30s)** CTA：[引导关注/评论的具体话术]

### 🏷️ 标题与话题标签优化
- 本期最有效的 3 个标题关键词（从爆款中提取）。
- 推荐话题标签组合（3~5个，可直接复制使用）。
- 应该避免的标题写法（从低迷视频中总结）。

### 📌 今日执行卡
> 直接可以截图发群的一句话：
> **今天发** → [选题方向一句话] | **开头3秒** → [具体话术] | **评论区第一条** → [引导语]

字数 1200~1600 字（不含表格和今日执行卡）。
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
          ? [ { role: 'user', content: prompt } ]
          : [
            { role: 'system', content: '你是一位深耕法律行业的短视频运营操盘手，擅长用数据驱动决策。回答要犀利、具体、可执行，拒绝套话。' },
            { role: 'user', content: prompt }
          ],
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

export const convertToDocument = async (config: AIAnalysisConfig, video: any) => {
  const models = getProviderModels();
  const prompt = `
你是一位专业的法律速记员和文档整理专家。
请将以下这段视频的原始台词整理成一份正式的【法律咨询案例/科普文档】。

【原始台词/信息】:
${video.content || video.title}

【要求】:
1. 修正台词中的错别字（尤其是法律术语）。
2. 按照"案情简介"、"核心法条"、"处理建议"的结构进行排版。
3. 保持内容原意，但语言要更书面化。
4. 使用 Markdown 格式输出。
`;

  return fetchAIAnalysis({ ...config, model: models.R1 }, prompt);
};

export const analyzeDocument = async (config: AIAnalysisConfig, document: string, video: any) => {
  const models = getProviderModels();
  const prompt = `
你是一位顶级的法律内容运营专家。请根据以下由 DeepSeek-R1 整理好的【法律文档】进行深度拆解分析。

【文档内容】:
${document}

【互动数据】:
点赞: ${video.likes}, 评论: ${video.comments}

【深度拆解要求】:
1. **⚖️ 法律核心拆解**: 识别视频中提到的具体法律条文，分析作者是如何将法条"人话化"的。
2. **🎬 视觉与文案策略**: 分析视频中的文字特效（如关键法条突出）对留存的贡献。
3. **🧠 用户心理博弈**: 识别视频利用了用户哪种心理。
4. **🚀 爆款复刻指南**: 总结 3 个最值得模仿的爆款因子。
5. **🛠️ 针对性优化建议**: 给出提升转化率的建议。

请输出专业、犀利的 Markdown 报告。
`;

  return fetchAIAnalysis({ ...config, model: models.V3 }, prompt);
};
