// 视频数据 API 服务
export interface ViralVideo {
  id: string;
  title: string;
  url: string;
  author: string;
  platform: string;
  likes: number;
  content?: string;
  subtitles?: { start: string; end: string; text: string }[];
  createdAt?: string;
}

// 获取热门视频列表
export const fetchViralVideos = async (limit: number = 10): Promise<ViralVideo[]> => {
  try {
    // 这里可以替换为真实的 API 端点
    // 例如：const response = await fetch(`/api/viral-videos?limit=${limit}`);

    // 使用 mock API
    const mockApi = await import('./mockApi');
    return mockApi.fetchViralVideos(limit);
  } catch (error) {
    console.error('获取视频数据失败:', error);
    return [];
  }
};

// 根据平台筛选视频
export const fetchVideosByPlatform = async (platform: string, limit: number = 10): Promise<ViralVideo[]> => {
  try {
    // 使用 mock API
    const mockApi = await import('./mockApi');
    return mockApi.fetchVideosByPlatform(platform, limit);
  } catch (error) {
    console.error('获取平台视频失败:', error);
    return [];
  }
};

// 搜索视频
export const searchVideos = async (query: string, limit: number = 10): Promise<ViralVideo[]> => {
  try {
    // 使用 mock API
    const mockApi = await import('./mockApi');
    return mockApi.searchVideos(query, limit);
  } catch (error) {
    console.error('搜索视频失败:', error);
    return [];
  }
};

// 获取单个视频详情
export const fetchVideoById = async (id: string): Promise<ViralVideo | null> => {
  try {
    // 示例：const response = await fetch(`/api/viral-videos/${id}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    // 使用 id 参数
    console.log(`获取视频详情，ID: ${id}`);

    return null;
  } catch (error) {
    console.error('获取视频详情失败:', error);
    return null;
  }
};

// 批量获取视频数据
export const batchFetchVideos = async (videoIds: string[]): Promise<ViralVideo[]> => {
  try {
    const promises = videoIds.map(id => fetchVideoById(id));
    const results = await Promise.allSettled(promises);

    return results
      .filter((result): result is PromiseFulfilledResult<ViralVideo> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  } catch (error) {
    console.error('批量获取视频失败:', error);
    return [];
  }
};