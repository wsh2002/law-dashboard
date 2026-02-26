import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, Settings, Play, ThumbsUp, Clock, User, MessageCircle, X, Sparkles, Loader2, BarChart2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { DEFAULT_CONFIG, analyzeDocument } from '../services/aiAnalysis';
import ReactMarkdown from 'react-markdown';

// Types for the viral video data
export interface ViralVideo {
  id: string;
  rank: number;
  title: string;
  author: string;
  views: string; // Formatted string for display
  likes: number;
  comments: number;
  shares: number;
  publishTime: string;
  cover: string;
  url: string;
  duration: string;
  platform?: 'douyin' | 'kuaishou' | 'wechat'; // Added platform field
  content?: string; // Raw ASR text
}

// Generate real-time publish time (e.g., "3 hours ago")
const getRecentTime = () => {
    const hours = Math.floor(Math.random() * 23) + 1;
    return `${hours}小时前`;
};

const MOCK_VIRAL_VIDEOS: ViralVideo[] = [
  // Douyin Data - Focused on "征地" (Land Acquisition) based on user's scraper target
  { id: 'dy1', rank: 1, title: '农村征地补偿标准出来了！每亩地补多少钱？建议收藏 #征地补偿 #法律知识', author: '农村法律咨询', views: '25.6w', likes: 12500, comments: 1200, shares: 850, publishTime: getRecentTime(), cover: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=225&fit=crop', url: 'https://v.douyin.com/mock1/', duration: '01:30', platform: 'douyin' },
  { id: 'dy2', rank: 2, title: '家里房子被强拆怎么办？律师教你三招维权！ #拆迁维权 #法律援助', author: '张律师普法', views: '18.2w', likes: 8900, comments: 650, shares: 420, publishTime: getRecentTime(), cover: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=225&fit=crop', url: 'https://v.douyin.com/mock2/', duration: '02:15', platform: 'douyin' },
  { id: 'dy3', rank: 3, title: '征地过程中这些字千万不能签！签了就晚了 #土地征收 #法律咨询', author: '法治先锋', views: '15.4w', likes: 7200, comments: 480, shares: 310, publishTime: getRecentTime(), cover: 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=400&h=225&fit=crop', url: 'https://v.douyin.com/mock3/', duration: '01:10', platform: 'douyin' },
  { id: 'dy4', rank: 4, title: '2024年土地征收新规定：不满足这3个条件不能强拆 #民法典 #土地法', author: '金牌律师团', views: '12.8w', likes: 5600, comments: 320, shares: 215, publishTime: getRecentTime(), cover: 'https://images.unsplash.com/photo-1464234470469-c1a1466aa090?w=400&h=225&fit=crop', url: 'https://v.douyin.com/mock4/', duration: '03:05', platform: 'douyin' },
  { id: 'dy5', rank: 5, title: '征地补偿款被村委会截留？律师告诉你如何拿回属于自己的钱', author: '法治在线', views: '9.6w', likes: 4300, comments: 210, shares: 150, publishTime: getRecentTime(), cover: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=225&fit=crop', url: 'https://v.douyin.com/mock5/', duration: '02:40', platform: 'douyin' },
  { id: 'dy6', rank: 6, title: '强制拆迁前的法定程序有哪些？没走这些程序就是违法拆迁', author: '拆迁维权卫士', views: '8.2w', likes: 3800, comments: 185, shares: 120, publishTime: getRecentTime(), cover: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=225&fit=crop', url: 'https://v.douyin.com/mock6/', duration: '01:55', platform: 'douyin' },
  { id: 'dy7', rank: 7, title: '农村宅基地征收补偿包括哪些内容？别让自己的利益受损', author: '土地法专家', views: '7.5w', likes: 3200, comments: 150, shares: 95, publishTime: getRecentTime(), cover: 'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=400&h=225&fit=crop', url: 'https://v.douyin.com/mock7/', duration: '02:20', platform: 'douyin' },
  { id: 'dy8', rank: 8, title: '评估公司评估价格过低？教你如何申请复核和鉴定 #房产评估', author: '房产维权专家', views: '6.9w', likes: 2900, comments: 130, shares: 80, publishTime: getRecentTime(), cover: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=225&fit=crop', url: 'https://v.douyin.com/mock8/', duration: '03:15', platform: 'douyin' },
  { id: 'dy9', rank: 9, title: '遇到“预征地”怎么办？这些情况你可以拒绝征收', author: '正义之声', views: '5.8w', likes: 2500, comments: 110, shares: 65, publishTime: getRecentTime(), cover: 'https://images.unsplash.com/photo-1574482620826-40685ca5eba2?w=400&h=225&fit=crop', url: 'https://v.douyin.com/mock9/', duration: '01:45', platform: 'douyin' },
  { id: 'dy10', rank: 10, title: '征地补偿协议不合理，已经签了字还能反悔吗？', author: '合同法研究', views: '5.2w', likes: 2100, comments: 95, shares: 55, publishTime: getRecentTime(), cover: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=225&fit=crop', url: 'https://v.douyin.com/mock10/', duration: '02:50', platform: 'douyin' },
  { id: 'dy11', rank: 11, title: '酒驾新规解读：这些情况不算酒驾', author: '交警在线', views: '8.9w', likes: 3800, comments: 180, shares: 95, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:30', platform: 'douyin' },
  { id: 'dy12', rank: 12, title: '邻里纠纷怎么处理？民法典有话说', author: '社区法律顾问', views: '7.6w', likes: 3200, comments: 150, shares: 60, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:00', platform: 'douyin' },
  { id: 'dy13', rank: 13, title: '遭遇网购诈骗如何维权？', author: '反诈中心', views: '6.5w', likes: 2900, comments: 120, shares: 110, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:50', platform: 'douyin' },
  { id: 'dy14', rank: 14, title: '继承房产需要交什么税？', author: '房产律师张三', views: '5.8w', likes: 2500, comments: 90, shares: 45, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:15', platform: 'douyin' },
  { id: 'dy15', rank: 15, title: '借条怎么写才有效？手把手教你', author: '民法典解读', views: '5.2w', likes: 2100, comments: 85, shares: 70, publishTime: getRecentTime(), cover: '', url: '#', duration: '00:50', platform: 'douyin' },
  { id: 'dy16', rank: 16, title: '被辞退了怎么要赔偿金？', author: '劳动仲裁指南', views: '4.9w', likes: 1800, comments: 75, shares: 30, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:30', platform: 'douyin' },
  { id: 'dy17', rank: 17, title: '校园霸凌零容忍！法律如何保护未成年人', author: '青少年维权', views: '4.5w', likes: 1600, comments: 60, shares: 55, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:40', platform: 'douyin' },
  { id: 'dy18', rank: 18, title: '二手房交易避坑指南', author: '房产专家', views: '4.2w', likes: 1500, comments: 55, shares: 25, publishTime: getRecentTime(), cover: '', url: '#', duration: '03:00', platform: 'douyin' },
  { id: 'dy19', rank: 19, title: '遇到医疗纠纷怎么办？', author: '医疗律师团队', views: '3.8w', likes: 1300, comments: 45, shares: 20, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:10', platform: 'douyin' },
  { id: 'dy20', rank: 20, title: '新婚姻法解读：彩礼还需要返还吗？', author: '婚姻家事律师', views: '3.5w', likes: 1200, comments: 40, shares: 15, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:25', platform: 'douyin' },

  // Kuaishou Data (Mock)
  { id: 'ks1', rank: 1, title: '老铁们注意了！这种合同千万别签', author: '快手大律师', views: '22.5w', likes: 8427, comments: 923, shares: 302, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:20', platform: 'kuaishou' },
  { id: 'ks2', rank: 2, title: '讨薪路漫漫？一招教你快速维权', author: '正义之声', views: '18.2w', likes: 6334, comments: 545, shares: 212, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:42', platform: 'kuaishou' },
  { id: 'ks3', rank: 3, title: '酒桌上的法律责任，你必须要懂', author: '法治快车', views: '15.6w', likes: 5269, comments: 428, shares: 108, publishTime: getRecentTime(), cover: '', url: '#', duration: '00:55', platform: 'kuaishou' },
  { id: 'ks4', rank: 4, title: '农村宅基地最新政策解读', author: '乡村法治', views: '14.1w', likes: 4184, comments: 332, shares: 95, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:31', platform: 'kuaishou' },
  { id: 'ks5', rank: 5, title: '这种借条无效！别再踩坑了', author: '法律顾问老王', views: '13.8w', likes: 3140, comments: 215, shares: 83, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:17', platform: 'kuaishou' },
  // ... more kuaishou data to reach 20
  { id: 'ks6', rank: 6, title: '发生交通事故，第一时间该做什么？', author: '平安出行', views: '12.5w', likes: 2800, comments: 150, shares: 60, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:30', platform: 'kuaishou' },
  { id: 'ks7', rank: 7, title: '房东不退押金？这几招很管用', author: '租房避坑', views: '11.2w', likes: 2600, comments: 120, shares: 50, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:10', platform: 'kuaishou' },
  { id: 'ks8', rank: 8, title: '离婚冷静期到底有多长？', author: '家事调解', views: '10.8w', likes: 2400, comments: 100, shares: 40, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:00', platform: 'kuaishou' },
  { id: 'ks9', rank: 9, title: '未成年人充值游戏，钱能退吗？', author: '网瘾少年救助', views: '9.9w', likes: 2200, comments: 90, shares: 35, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:50', platform: 'kuaishou' },
  { id: 'ks10', rank: 10, title: '被宠物狗咬伤，谁来赔偿？', author: '爱宠法律', views: '9.2w', likes: 2000, comments: 80, shares: 30, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:20', platform: 'kuaishou' },
  { id: 'ks11', rank: 11, title: '高空抛物，全楼买单？', author: '城市生活', views: '8.5w', likes: 1800, comments: 70, shares: 25, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:40', platform: 'kuaishou' },
  { id: 'ks12', rank: 12, title: '遇到这种短信，千万别点！', author: '网络安全', views: '8.1w', likes: 1600, comments: 60, shares: 20, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:15', platform: 'kuaishou' },
  { id: 'ks13', rank: 13, title: '彩礼返还新规，你了解多少？', author: '婚恋指南', views: '7.8w', likes: 1400, comments: 50, shares: 15, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:10', platform: 'kuaishou' },
  { id: 'ks14', rank: 14, title: '加班不给加班费？违法！', author: '职场权益', views: '7.5w', likes: 1200, comments: 40, shares: 10, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:30', platform: 'kuaishou' },
  { id: 'ks15', rank: 15, title: '买了烂尾楼，房贷还得还吗？', author: '房产维权', views: '7.2w', likes: 1100, comments: 35, shares: 8, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:50', platform: 'kuaishou' },
  { id: 'ks16', rank: 16, title: '夫妻共同债务如何认定？', author: '法律百科', views: '6.9w', likes: 1000, comments: 30, shares: 5, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:45', platform: 'kuaishou' },
  { id: 'ks17', rank: 17, title: '遭遇家庭暴力，如何取证？', author: '反家暴中心', views: '6.5w', likes: 900, comments: 25, shares: 4, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:25', platform: 'kuaishou' },
  { id: 'ks18', rank: 18, title: '微信转账记录能当证据吗？', author: '证据法学', views: '6.2w', likes: 800, comments: 20, shares: 3, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:10', platform: 'kuaishou' },
  { id: 'ks19', rank: 19, title: '个人信息泄露，谁来负责？', author: '隐私保护', views: '5.8w', likes: 700, comments: 15, shares: 2, publishTime: getRecentTime(), cover: '', url: '#', duration: '01:35', platform: 'kuaishou' },
  { id: 'ks20', rank: 20, title: '劳动仲裁流程详解', author: '法律援助', views: '5.5w', likes: 600, comments: 10, shares: 1, publishTime: getRecentTime(), cover: '', url: '#', duration: '03:00', platform: 'kuaishou' },

  // WeChat Data (Mock)
  { id: 'wx1', rank: 1, title: '深度解读：新公司法对创业者的影响', author: '法治周末', views: '10w+', likes: 5427, comments: 323, shares: 502, publishTime: getRecentTime(), cover: '', url: '#', duration: '05:10', platform: 'wechat' },
  { id: 'wx2', rank: 2, title: '【收藏】生活中常见的100个法律常识', author: '人民日报', views: '10w+', likes: 4334, comments: 245, shares: 812, publishTime: getRecentTime(), cover: '', url: '#', duration: '03:12', platform: 'wechat' },
  { id: 'wx3', rank: 3, title: '最高法发布典型案例：保护消费者权益', author: '最高人民法院', views: '8.6w', likes: 3269, comments: 128, shares: 308, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:45', platform: 'wechat' },
  { id: 'wx4', rank: 4, title: '律师视点：如何看待AI生成内容的版权问题', author: '知识产权前沿', views: '6.1w', likes: 2184, comments: 92, shares: 145, publishTime: getRecentTime(), cover: '', url: '#', duration: '04:31', platform: 'wechat' },
  { id: 'wx5', rank: 5, title: '民法典实施三周年：这些变化影响你我生活', author: '法治日报', views: '5.8w', likes: 1140, comments: 65, shares: 93, publishTime: getRecentTime(), cover: '', url: '#', duration: '03:57', platform: 'wechat' },
   // ... more wechat data to reach 20
  { id: 'wx6', rank: 6, title: '刑法修正案（十二）草案解读', author: '刑事法治', views: '4.5w', likes: 900, comments: 50, shares: 60, publishTime: getRecentTime(), cover: '', url: '#', duration: '04:00', platform: 'wechat' },
  { id: 'wx7', rank: 7, title: '环境公益诉讼制度的发展与完善', author: '环保法律', views: '4.2w', likes: 800, comments: 40, shares: 50, publishTime: getRecentTime(), cover: '', url: '#', duration: '03:30', platform: 'wechat' },
  { id: 'wx8', rank: 8, title: '数字经济时代的法律挑战', author: '互联网法律', views: '3.8w', likes: 700, comments: 30, shares: 40, publishTime: getRecentTime(), cover: '', url: '#', duration: '05:00', platform: 'wechat' },
  { id: 'wx9', rank: 9, title: '涉外法律服务人才培养', author: '国际法研究', views: '3.5w', likes: 600, comments: 25, shares: 35, publishTime: getRecentTime(), cover: '', url: '#', duration: '04:20', platform: 'wechat' },
  { id: 'wx10', rank: 10, title: '基层社会治理的法治化路径', author: '法治社会', views: '3.2w', likes: 500, comments: 20, shares: 30, publishTime: getRecentTime(), cover: '', url: '#', duration: '03:50', platform: 'wechat' },
  { id: 'wx11', rank: 11, title: '行政复议法修订亮点', author: '行政法苑', views: '2.9w', likes: 450, comments: 18, shares: 25, publishTime: getRecentTime(), cover: '', url: '#', duration: '03:10', platform: 'wechat' },
  { id: 'wx12', rank: 12, title: '未成年人网络保护条例解读', author: '护苗行动', views: '2.6w', likes: 400, comments: 16, shares: 20, publishTime: getRecentTime(), cover: '', url: '#', duration: '03:40', platform: 'wechat' },
  { id: 'wx13', rank: 13, title: '爱国主义教育法草案审议', author: '立法前沿', views: '2.3w', likes: 350, comments: 14, shares: 15, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:50', platform: 'wechat' },
  { id: 'wx14', rank: 14, title: '粮食安全保障法草案二审', author: '农业法律', views: '2.1w', likes: 300, comments: 12, shares: 10, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:30', platform: 'wechat' },
  { id: 'wx15', rank: 15, title: '慈善法修正草案提请审议', author: '公益慈善', views: '1.9w', likes: 250, comments: 10, shares: 8, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:10', platform: 'wechat' },
  { id: 'wx16', rank: 16, title: '国务院组织法修订草案审议', author: '宪法研究', views: '1.7w', likes: 200, comments: 8, shares: 6, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:00', platform: 'wechat' },
  { id: 'wx17', rank: 17, title: '海洋环境保护法修订通过', author: '海洋法律', views: '1.5w', likes: 150, comments: 6, shares: 5, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:40', platform: 'wechat' },
  { id: 'wx18', rank: 18, title: '外国国家豁免法表决通过', author: '涉外法治', views: '1.3w', likes: 100, comments: 4, shares: 4, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:20', platform: 'wechat' },
  { id: 'wx19', rank: 19, title: '无障碍环境建设法实施', author: '残障权益', views: '1.1w', likes: 80, comments: 2, shares: 3, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:15', platform: 'wechat' },
  { id: 'wx20', rank: 20, title: '对外关系法正式施行', author: '外交法律', views: '0.9w', likes: 50, comments: 1, shares: 2, publishTime: getRecentTime(), cover: '', url: '#', duration: '02:05', platform: 'wechat' },
];

const CATEGORIES = [
  { id: 'land', name: '征地拆迁', icon: AlertCircle },
  { id: 'general', name: '法律普法', icon: Sparkles }
];

export const ViralVideosSection = () => {
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiConfig, setApiConfig] = useState(() => {
    const saved = localStorage.getItem('deepseek_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  // 监听配置变化并保存到本地存储
  useEffect(() => {
    localStorage.setItem('deepseek_config', JSON.stringify(apiConfig));
  }, [apiConfig]);

  const [selectedCategory, setSelectedCategory] = useState<'land' | 'general'>('land');
  const [videos, setVideos] = useState<ViralVideo[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Analysis States
  const [analyzingVideo, setAnalyzingVideo] = useState<ViralVideo | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [manualTranscript, setManualTranscript] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<'idle' | 'analyzing'>('idle');
  const [activeTab, setActiveTab] = useState<'analysis' | 'document'>('document');

  const handleDeepAnalysis = (video: ViralVideo) => {
    setAnalyzingVideo(video);
    setAnalysisResult('');
    setManualTranscript(video.content || '');
    setAnalysisStep('idle');
    setActiveTab('document');
  };

  const handleStartAnalysis = async () => {
    if (!manualTranscript) return;
    
    setIsAnalyzing(true);
    setAnalysisStep('analyzing');
    setActiveTab('analysis');
    
    try {
      // 深度拆解分析 (使用 V3.2)
      const analysis = await analyzeDocument(apiConfig, manualTranscript, analyzingVideo);
      setAnalysisResult(analysis);
    } catch (error: any) {
      setAnalysisResult(`分析失败: ${error.message}`);
      // 如果是 401 错误，自动展开配置面板提示用户
      if (error.message.includes('401')) {
        setShowApiConfig(true);
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('idle');
    }
  };

  const handleDownloadMarkdown = () => {
    if (!analyzingVideo || !analysisResult) return;

    const content = `
# 视频法律深度拆解报告
生成时间: ${new Date().toLocaleString()}

## 1. 视频基础信息
- **标题**: ${analyzingVideo.title}
- **作者**: ${analyzingVideo.author}
- **点赞**: ${analyzingVideo.likes.toLocaleString()}
- **发布时间**: ${analyzingVideo.publishTime}

## 2. 原始文案内容
${manualTranscript}

---

## 3. AI 深度拆解分析 (DeepSeek-V3.2)
${analysisResult}
    `.trim();

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `法律深度拆解_${analyzingVideo.title.slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter and sort videos based on selection
  useEffect(() => {
    const fetchVideos = async () => {
        setLoading(true);
        try {
            // Try to fetch real data from local JSON
            // Use BASE_URL from vite config to handle subdirectory deployment
            const baseUrl = import.meta.env.BASE_URL.endsWith('/') 
                ? import.meta.env.BASE_URL 
                : `${import.meta.env.BASE_URL}/`;
            
            const response = await fetch(`${baseUrl}data/douyin_videos.json`);
            if (response.ok) {
                const realData = await response.json();
                console.log('Successfully loaded real data:', realData.length, 'items');
                
                const formatted = realData
                    .map((v: any, index: number) => {
                        // Logic to determine category based on content
                        let category: 'land' | 'general' = 'general';
                        const titleText = (v.title || v.desc || '').toLowerCase();
                        if (titleText.includes('征地') || titleText.includes('拆迁') || titleText.includes('补偿') || titleText.includes('土地') || titleText.includes('征收')) {
                            category = 'land';
                        }
                        
                        return {
                            id: `real-${index}`,
                            rank: index + 1,
                            title: v.title || v.desc || '未知标题',
                            author: v.author || '未知作者',
                            likes: v.likes || v.digg || 0,
                            comments: v.comments || v.comment || 0,
                            shares: v.shares || 0,
                            publishTime: v.publishTime || v.time || '未知时间',
                            url: v.url || '#',
                            duration: v.duration || '00:00',
                            cover: v.cover || '',
                            platform: v.platform || 'douyin',
                            category,
                            content: v.content || v.video_text || '' // Support both field names
                        };
                    })
                    .filter((v: any) => v.category === selectedCategory)
                    .sort((a: any, b: any) => b.likes - a.likes);
                
                if (formatted.length > 0) {
                    setVideos(formatted.slice(0, 20).map((v: any, i: number) => ({ ...v, rank: i + 1 })));
                    setLoading(false);
                    return;
                }
            } else {
                console.warn('Failed to fetch JSON data:', response.status);
            }
        } catch (error) {
            console.error('Error loading real data:', error);
        }

        // Fallback to Mock Data only if real data loading fails or returns empty
        console.log('Falling back to mock data');
        await new Promise(resolve => setTimeout(resolve, 600));
        const filtered = MOCK_VIRAL_VIDEOS
            .map(v => {
                let category: 'land' | 'general' = 'general';
                const content = v.title.toLowerCase();
                if (content.includes('征地') || content.includes('拆迁') || content.includes('补偿') || content.includes('土地')) {
                    category = 'land';
                }
                return { ...v, category };
            })
            .filter(v => v.category === selectedCategory)
            .sort((a, b) => b.likes - a.likes)
            .slice(0, 20)
            .map((v, index) => ({ ...v, rank: index + 1 }));

        setVideos(filtered);
        setLoading(false);
    };

    fetchVideos();
  }, [selectedCategory]);

  const currentPlatformName = '抖音';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Search className="w-6 h-6 text-purple-600" />
            抖音律师爆款视频监控 (Douyin Viral Videos)
        </h3>
        <button 
          onClick={() => setShowApiConfig(!showApiConfig)}
          className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-800 transition-colors"
        >
            <Settings className="w-3 h-3" />
            配置 API
        </button>
      </div>

      {showApiConfig && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-sm mb-6 shadow-inner animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-600" />
                    AI 模型配置 (DeepSeek Official)
                </h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">API Key</label>
                    <input 
                        type="password" 
                        value={apiConfig.apiKey}
                        onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                        placeholder="sk-..." 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Base URL</label>
                    <input 
                        type="text" 
                        value={apiConfig.baseUrl}
                        onChange={(e) => setApiConfig({ ...apiConfig, baseUrl: e.target.value })}
                        placeholder="https://api..." 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                </div>
            </div>
            
            <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                提示：401 错误通常是 Key 与接口地址不匹配。官方 Key 请配合官方节点使用。
            </p>
        </div>
      )}

      {/* Category Selection Tabs */}
      <div className="flex flex-wrap gap-4">
        {CATEGORIES.map((category, index) => {
          const isSelected = selectedCategory === category.id;
          const Icon = category.icon;
          return (
            <motion.button 
              key={category.id} 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => setSelectedCategory(category.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300",
                isSelected 
                    ? "bg-gray-900 text-white shadow-lg scale-105" 
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-900 hover:text-gray-900 shadow-sm"
              )}
            >
              <Icon className={cn("w-5 h-5", isSelected ? "text-blue-400" : "text-gray-400")} />
              {category.name}
            </motion.button>
          );
        })}
      </div>

      {/* Auto-Fetched Viral Videos List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 text-white">
            <div>
                <h4 className="text-lg font-bold flex items-center gap-2">
                    <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    {currentPlatformName}-法律类目-一周内点赞量最高
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                    自动筛选条件: 平台="{currentPlatformName}" & 关键词="法律" & 时间="一周内" & 排序="最多点赞"
                </p>
            </div>
            <div className="text-right">
                <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">
                    后台自动刷新中
                </span>
            </div>
        </div>

        {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p>正在连接{currentPlatformName}数据中心...</p>
                <p className="text-xs mt-2">Fetching top 20 viral videos...</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4">排名</th>
                            <th className="px-6 py-4">视频内容</th>
                            <th className="px-6 py-4">发布账号</th>
                            <th className="px-6 py-4 text-center">互动数据</th>
                            <th className="px-6 py-4">发布时间</th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {videos.map((video) => (
                            <tr key={video.id} className="hover:bg-blue-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-110",
                                        video.rank === 1 ? "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 text-white" :
                                        video.rank === 2 ? "bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-white" :
                                        video.rank === 3 ? "bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 text-white" :
                                        "bg-gray-100 text-gray-500"
                                    )}>
                                        {video.rank}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-28 bg-gray-200 rounded-lg overflow-hidden relative shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                            {video.cover ? (
                                                <img src={video.cover} alt={video.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                                    <Play className="w-6 h-6" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Play className="w-8 h-8 text-white fill-white" />
                                            </div>
                                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded backdrop-blur-sm">
                                                {video.duration}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <p className="font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                                {video.title}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                                                    {(video as any).category === 'land' ? '征地拆迁' : '法律普法'}
                                                </span>
                                                <span className="text-[10px] font-medium px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100">抖音爆款</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 border border-white shadow-sm overflow-hidden">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800">{video.author}</span>
                                            <span className="text-[10px] text-gray-400">认证律师/法律博主</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-2 w-48">
                                        {/* Likes Bar */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="flex items-center gap-1 font-medium text-gray-500"><ThumbsUp className="w-3 h-3 text-red-500" /> 点赞</span>
                                                <span className="font-bold text-gray-900">{video.likes.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden border border-gray-50">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (video.likes / (videos[0]?.likes || 1000)) * 100)}%` }}
                                                    className="bg-gradient-to-r from-red-400 to-red-500 h-full rounded-full"
                                                />
                                            </div>
                                        </div>
                                        {/* Comments */}
                                        <div className="flex items-center gap-1.5 text-[10px]">
                                            <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="font-medium text-gray-500">评论</span>
                                            <span className="font-bold text-gray-900 ml-auto">{video.comments.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                                            <Clock className="w-3 h-3" />
                                            {video.publishTime}
                                        </div>
                                        <span className="text-[10px] text-gray-400">发布于昨天</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleDeepAnalysis(video)}
                                                className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors border border-purple-100"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                深度分析
                                            </button>
                                            <a 
                                                href={video.url}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-lg text-xs font-bold shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5"
                                            >
                                                <Play className="w-3.5 h-3.5 fill-current" />
                                                查看视频
                                            </a>
                                        </div>
                                        <button className="text-[10px] text-gray-400 hover:text-blue-600 transition-colors font-medium">
                                            监控该账号
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </motion.div>

      {/* AI Deep Analysis Modal */}
      <AnimatePresence>
        {analyzingVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-gray-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">视频法律深度拆解报告</h4>
                    <p className="text-xs text-purple-100 opacity-80">由 DeepSeek AI 驱动的专业内容分析</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAnalyzingVideo(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="bg-white p-4 rounded-xl">
                  {/* Video Info Card */}
                  <div className="flex gap-6 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-24 h-32 bg-gray-200 rounded-lg overflow-hidden shrink-0 shadow-sm">
                      {analyzingVideo.cover ? (
                        <img src={analyzingVideo.cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Play className="w-8 h-8 text-gray-300" /></div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center gap-2">
                      <h5 className="font-bold text-gray-900 text-lg line-clamp-2">{analyzingVideo.title}</h5>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><User className="w-4 h-4" /> {analyzingVideo.author}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" /> {analyzingVideo.likes.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {analyzingVideo.publishTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tab Switcher */}
                  <div className="flex gap-4 mb-6 border-b border-gray-100">
                    <button 
                      onClick={() => setActiveTab('analysis')}
                      className={cn(
                        "pb-3 px-2 font-bold text-sm transition-all relative",
                        activeTab === 'analysis' ? "text-purple-600" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      AI 深度分析
                      {activeTab === 'analysis' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />}
                    </button>
                    <button 
                      onClick={() => setActiveTab('document')}
                      className={cn(
                        "pb-3 px-2 font-bold text-sm transition-all relative",
                        activeTab === 'document' ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      视频转化文档 (台词)
                      {activeTab === 'document' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                    </button>
                  </div>

                  {/* Analysis Result or Document Content */}
                  <div className="prose prose-blue max-w-none">
                    {activeTab === 'analysis' ? (
                      isAnalyzing && analysisStep === 'analyzing' ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
                          <p className="text-lg font-medium text-gray-600">DeepSeek-V3.2 正在进行深度分析...</p>
                          <p className="text-sm mt-2">正在分析法律核心、视觉策略与用户心理</p>
                        </div>
                      ) : analysisResult ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <ReactMarkdown>{analysisResult}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                          <Sparkles className="w-12 h-12 text-purple-200 mb-4" />
                          <p className="text-lg font-medium text-gray-600">准备就绪</p>
                          <p className="text-sm mt-2 mb-6">请确认左侧“视频转化文档”中已粘贴台词内容</p>
                          <button
                            onClick={handleStartAnalysis}
                            disabled={!manualTranscript}
                            className={cn(
                              "px-8 py-3 rounded-xl font-bold shadow-lg transition-all",
                              manualTranscript 
                                ? "bg-purple-600 text-white hover:bg-purple-700 hover:scale-105" 
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            )}
                          >
                            开始 AI 深度分析
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 min-h-[300px]">
                        <h6 className="text-blue-800 font-bold mb-4 flex items-center gap-2">
                          <BarChart2 className="w-4 h-4" /> 视频全文台词粘贴 (Video Script)
                        </h6>
                        <div className="space-y-4">
                          <p className="text-xs text-blue-600 bg-blue-100/50 p-2 rounded">
                            提示：请将视频的完整文案或台词粘贴在下方，AI 将基于此内容进行深度法律分析。
                          </p>
                          <textarea
                            value={manualTranscript}
                            onChange={(e) => setManualTranscript(e.target.value)}
                            placeholder="在此处粘贴视频台词内容..."
                            className="w-full h-64 p-4 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm leading-relaxed resize-none shadow-inner"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={() => setActiveTab('analysis')}
                              disabled={!manualTranscript}
                              className={cn(
                                "px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2",
                                manualTranscript
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                              )}
                            >
                              下一步：去分析
                              <Sparkles className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <button 
                  onClick={() => setAnalyzingVideo(null)}
                  className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  关闭报告
                </button>
                <button 
                  onClick={handleDownloadMarkdown}
                  disabled={!analysisResult}
                  className={cn(
                    "px-8 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 shadow-md",
                    analysisResult 
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:scale-105" 
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  保存为 MD (Markdown)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50"
      >
         <h4 className="font-bold text-gray-800 mb-4">如何获取最准确的数据？</h4>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">1</div>
                <div>
                    <p className="font-medium text-gray-900">点击上方按钮</p>
                    <p>系统已预置了筛选条件（如最近1天、点赞最多），点击即可直达官方搜索结果页。</p>
                </div>
            </div>
            <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">2</div>
                <div>
                    <p className="font-medium text-gray-900">使用专业数据工具</p>
                    <p>如需自动抓取每日Top 10列表，建议使用婵妈妈(抖音)或飞瓜数据(快手)等专业SaaS平台，并在上方配置API。</p>
                </div>
            </div>
         </div>
      </motion.div>
    </div>
  );
};
