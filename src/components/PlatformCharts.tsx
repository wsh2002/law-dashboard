import { motion } from 'framer-motion';
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
      <div className="col-span-full flex items-center justify-center p-12 bg-gray-50 rounded-xl">
        <div className="text-center">
          <div className="text-gray-400 mb-2">暂无数据</div>
          <p className="text-gray-500 text-sm">请先上传各平台的数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 综合表现雷达图 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
      >
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <RadarIcon className="w-5 h-5 text-orange-500" />
          综合表现雷达图
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart outerRadius="65%" data={[
              {
                subject: '播放量',
                抖音: (platformData.find(p => p?.platform === 'douyin')?.totalViews || 0) / 10000,
                快手: (platformData.find(p => p?.platform === 'kuaishou')?.totalViews || 0) / 10000,
                视频号: (platformData.find(p => p?.platform === 'wechat')?.totalViews || 0) / 10000,
              },
              {
                subject: '互动率',
                抖音: (platformData.find(p => p?.platform === 'douyin')?.avgInteractionRate || 0) * 10,
                快手: (platformData.find(p => p?.platform === 'kuaishou')?.avgInteractionRate || 0) * 10,
                视频号: (platformData.find(p => p?.platform === 'wechat')?.avgInteractionRate || 0) * 10,
              },
              {
                subject: '完播率',
                抖音: platformData.find(p => p?.platform === 'douyin')?.avgCompletionRate || 0,
                快手: platformData.find(p => p?.platform === 'kuaishou')?.avgCompletionRate || 0,
                视频号: platformData.find(p => p?.platform === 'wechat')?.avgCompletionRate || 0,
              },
              {
                subject: '内容量',
                抖音: Math.min((platformData.find(p => p?.platform === 'douyin')?.videoCount || 0) / 2, 100),
                快手: Math.min((platformData.find(p => p?.platform === 'kuaishou')?.videoCount || 0) / 2, 100),
                视频号: Math.min((platformData.find(p => p?.platform === 'wechat')?.videoCount || 0) / 2, 100),
              },
              {
                subject: '粉丝数',
                抖音: (platformData.find(p => p?.platform === 'douyin')?.latestFans || 0) / 10000,
                快手: (platformData.find(p => p?.platform === 'kuaishou')?.latestFans || 0) / 10000,
                视频号: (platformData.find(p => p?.platform === 'wechat')?.latestFans || 0) / 10000,
              },
            ]}>
              <PolarGrid stroke="#e0e0e0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 14 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#999', fontSize: 12 }} />

              <Radar
                name="抖音"
                dataKey="抖音"
                stroke="#ff0000"
                fill="#ff0000"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Radar
                name="快手"
                dataKey="快手"
                stroke="#fe2c55"
                fill="#fe2c55"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Radar
                name="视频号"
                dataKey="视频号"
                stroke="#07C160"
                fill="#07C160"
                fillOpacity={0.2}
                strokeWidth={2}
              />

              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '20px',
                  fontSize: '14px'
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e0e0e0',
                  fontSize: '14px'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}

export default PlatformChartsComponent;