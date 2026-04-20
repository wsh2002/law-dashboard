import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Radar as RadarIcon } from 'lucide-react';

interface PlatformData {
  platform: string;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgInteractionRate: number;
  avgCompletionRate: number;
  latestFans: number;
  videoCount: number;
  overallScore?: number;
}

interface PlatformChartsProps {
  platformData: PlatformData[];
  platformCompareMode: 'overall' | 'monthly';
}

const PlatformChartsComponent = ({ platformData }: PlatformChartsProps) => {
  if (platformData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: 360 }}>
        <p className="text-gray-400 text-sm">暂无平台数据</p>
      </div>
    );
  }

  const get = (platform: string) => platformData.find(p => p?.platform === platform);

  // Normalize each metric relative to the max across all platforms → [0, 100]
  const norm = (values: number[]) => {
    const max = Math.max(...values, 1);
    return values.map(v => Math.round((v / max) * 100));
  };

  const [dy, ks, wx] = [get('douyin'), get('kuaishou'), get('wechat')];

  const views   = norm([dy?.totalViews || 0,   ks?.totalViews || 0,   wx?.totalViews || 0]);
  const inter   = norm([dy?.avgInteractionRate || 0, ks?.avgInteractionRate || 0, wx?.avgInteractionRate || 0]);
  const compl   = norm([dy?.avgCompletionRate || 0,  ks?.avgCompletionRate || 0,  wx?.avgCompletionRate || 0]);
  const content = norm([dy?.videoCount || 0,   ks?.videoCount || 0,   wx?.videoCount || 0]);
  const fans    = norm([dy?.latestFans || 0,   ks?.latestFans || 0,   wx?.latestFans || 0]);

  const radarData = [
    { subject: '播放量', 抖音: views[0],   快手: views[1],   视频号: views[2] },
    { subject: '互动率', 抖音: inter[0],   快手: inter[1],   视频号: inter[2] },
    { subject: '完播率', 抖音: compl[0],   快手: compl[1],   视频号: compl[2] },
    { subject: '内容量', 抖音: content[0], 快手: content[1], 视频号: content[2] },
    { subject: '粉丝数', 抖音: fans[0],    快手: fans[1],    视频号: fans[2] },
  ];

  return (
    <div style={{ width: '100%' }}>
      <div className="flex items-center gap-2 mb-2 px-2">
        <RadarIcon className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-bold text-gray-700">综合表现雷达图（相对评分）</span>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <RadarChart outerRadius={110} data={radarData}>
          <PolarGrid stroke="#e0e0e0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#555', fontSize: 13 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          {ks && (
            <Radar name="快手" dataKey="快手" stroke="#f97316" fill="#f97316" fillOpacity={0.5} strokeWidth={2.5} dot={{ r: 5, fill: '#f97316', strokeWidth: 0 }} isAnimationActive={false} />
          )}
          {dy && (
            <Radar name="抖音" dataKey="抖音" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.45} strokeWidth={2.5} dot={{ r: 5, fill: '#3b82f6', strokeWidth: 0 }} isAnimationActive={false} />
          )}
          {wx && (
            <Radar name="视频号" dataKey="视频号" stroke="#07C160" fill="#07C160" fillOpacity={0.45} strokeWidth={2.5} dot={{ r: 5, fill: '#07C160', strokeWidth: 0 }} isAnimationActive={false} />
          )}
          <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '13px' }} />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0} 分`, name ?? '']}
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '13px', border: '1px solid #e0e0e0' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PlatformChartsComponent;
