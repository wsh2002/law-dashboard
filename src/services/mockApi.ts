// 模拟 API 服务 - 替代真实 API
import type { ViralVideo } from './videoApi';

// 模拟数据存储
let mockVideos: ViralVideo[] = [
  {
    id: '1',
    title: '农村盖房好消息来啦！2026 年新政策已定 #拆迁律师 #征地拆迁律师 #拆迁补偿 #土地征收 #宅基地建房',
    url: 'https://www.douyin.com/video/7623603486856416531',
    author: '法律科普达人',
    platform: 'douyin',
    likes: 12345,
    createdAt: new Date('2026-04-01').toISOString()
  },
  {
    id: '2',
    title: '2026年征地补偿标准！ #土地 #老百姓关心的话题',
    url: 'https://www.douyin.com/video/7625090468674779987',
    author: '土地政策解读',
    platform: 'douyin',
    likes: 9876,
    createdAt: new Date('2026-04-02').toISOString()
  },
  {
    id: '3',
    title: '四川引大济岷工程建设征地范围内禁止新增建设项目和迁入人口调整 #四川 #引大济岷 #成都 #雅安 #甘孜州 ',
    url: 'https://www.douyin.com/video/7625256649841806655',
    author: '工程建设动态',
    platform: 'douyin',
    likes: 5432,
    createdAt: new Date('2026-04-03').toISOString()
  },
  {
    id: '4',
    title: '宅基地使用权新规：农村户口必看！#宅基地 #农村政策 #土地使用权',
    url: 'https://www.douyin.com/video/7623603486856416534',
    author: '农村政策解读',
    platform: 'douyin',
    likes: 8765,
    createdAt: new Date('2026-04-04').toISOString()
  },
  {
    id: '5',
    title: '城市更新政策解读：2026年房屋征收补偿标准详解',
    url: 'https://www.douyin.com/video/7625090468674779999',
    author: '房产法律专家',
    platform: 'douyin',
    likes: 15678,
    createdAt: new Date('2026-04-05').toISOString()
  },
  {
    id: '6',
    title: '农村集体土地入市：新政策带来哪些机遇？',
    url: 'https://www.douyin.com/video/7625256649841806660',
    author: '土地政策研究院',
    platform: 'douyin',
    likes: 23456,
    createdAt: new Date('2026-04-06').toISOString()
  },
  {
    id: '7',
    title: '征地拆迁流程详解：从公告到补偿的全过程',
    url: 'https://www.douyin.com/video/7623603486856416535',
    author: '拆迁实务指南',
    platform: 'douyin',
    likes: 34567,
    createdAt: new Date('2026-04-07').toISOString()
  },
  {
    id: '8',
    title: '城中村改造：2026年最新政策与补偿标准',
    url: 'https://www.douyin.com/video/7625090468674780000',
    author: '城市更新研究院',
    platform: 'douyin',
    likes: 45678,
    createdAt: new Date('2026-04-08').toISOString()
  },
  {
    id: '9',
    title: '农村土地确权：如何保护自己的合法权益？',
    url: 'https://www.douyin.com/video/7625256649841806661',
    author: '土地法律顾问',
    platform: 'douyin',
    likes: 56789,
    createdAt: new Date('2026-04-07').toISOString()
  },
  {
    id: '10',
    title: '违章建筑认定与拆除：2026年最新法规解读',
    url: 'https://www.douyin.com/video/7623603486856416536',
    author: '建筑法规专家',
    platform: 'douyin',
    likes: 67890,
    createdAt: new Date('2026-04-06').toISOString()
  }
];

// 模拟 API 延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟热门视频 API
export const fetchViralVideos = async (limit: number = 10): Promise<ViralVideo[]> => {
  await delay(800); // 模拟网络延迟

  // 返回按点赞数排序的视频
  const sortedVideos = [...mockVideos]
    .sort((a, b) => b.likes - a.likes)
    .slice(0, limit);

  console.log(`📱 API 返回 ${sortedVideos.length} 个热门视频`);
  return sortedVideos;
};

// 模拟按平台筛选
export const fetchVideosByPlatform = async (platform: string, limit: number = 10): Promise<ViralVideo[]> => {
  await delay(600);

  const platformVideos = mockVideos
    .filter(video => video.platform === platform)
    .slice(0, limit);

  console.log(`📱 API 返回 ${platformVideos.length} 个${platform}视频`);
  return platformVideos;
};

// 模拟搜索功能
export const searchVideos = async (query: string, limit: number = 10): Promise<ViralVideo[]> => {
  await delay(500);

  const searchResults = mockVideos
    .filter(video =>
      video.title.toLowerCase().includes(query.toLowerCase()) ||
      video.author.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, limit);

  console.log(`🔍 搜索 "${query}" 返回 ${searchResults.length} 个结果`);
  return searchResults;
};

// 模拟添加新视频
export const addVideo = async (video: Omit<ViralVideo, 'id' | 'createdAt'>): Promise<ViralVideo> => {
  await delay(300);

  const newVideo: ViralVideo = {
    ...video,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };

  mockVideos.unshift(newVideo);
  console.log(`➕ 添加新视频: ${newVideo.title}`);
  return newVideo;
};

// 模拟更新视频内容
export const updateVideoContent = async (id: string, content: string): Promise<ViralVideo | null> => {
  await delay(200);

  const videoIndex = mockVideos.findIndex(v => v.id === id);
  if (videoIndex === -1) return null;

  mockVideos[videoIndex] = {
    ...mockVideos[videoIndex],
    content
  };

  console.log(`📝 更新视频内容: ${mockVideos[videoIndex].title}`);
  return mockVideos[videoIndex];
};

// 导入模拟数据（可用于初始化）
export const importMockData = (videos: ViralVideo[]) => {
  mockVideos = videos;
  console.log(`📥 导入了 ${videos.length} 个模拟视频`);
};

// 获取所有视频（仅用于开发）
export const getAllMockVideos = (): ViralVideo[] => {
  return [...mockVideos];
};

// 模拟 API 错误
export const simulateApiError = () => {
  mockVideos = [];
  console.log('🚫 模拟 API 错误：清空数据');
};