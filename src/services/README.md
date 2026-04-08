# 视频数据服务

## 概述

本项目提供了完整的视频数据服务，包括：
- API 服务层 (`videoApi.ts`)
- Mock API 服务 (`mockApi.ts`) 
- 爬虫服务 (`scraperService.ts`)

## 当前状态

目前使用的是 **Mock API** 服务，包含10个模拟的热门法律相关视频数据。

## 数据结构

```typescript
interface ViralVideo {
  id: string;              // 视频ID
  title: string;           // 视频标题
  url: string;            // 视频链接
  author: string;         // 作者/UP主
  platform: string;       // 平台: 'douyin' | 'kuaishou' | 'xiaohongshu' | 'bilibili' | 'weibo'
  likes: number;          // 点赞数
  content?: string;       // 识别的文案内容
  subtitles?: {           // 字幕信息
    start: string;
    end: string;
    text: string;
  }[];
  createdAt?: string;      // 创建时间
}
```

## 如何切换到真实数据

### 1. 后端 API 准备

首先需要搭建一个后端服务，提供以下 API 端点：

```typescript
// 示例 API 端点
GET /api/viral-videos?limit=10    // 获取热门视频
GET /api/viral-videos?platform=douyin&limit=10  // 按平台获取
GET /api/viral-videos/search?q=关键词  // 搜索视频
```

### 2. 修改 API 服务

在 `videoApi.ts` 中，将 mock API 替换为真实的 fetch 调用：

```typescript
// 修改前（使用 mock）
const mockApi = require('./mockApi');
return mockApi.fetchViralVideos(limit);

// 修改后（使用真实 API）
const response = await fetch(`/api/viral-videos?limit=${limit}`);
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}
return await response.json();
```

### 3. 环境配置

在 `.env` 文件中添加 API 配置：

```env
# 真实 API 配置
VITE_API_BASE_URL=https://your-api-server.com
VITE_API_KEY=your-api-key
```

## 爬虫服务

如果需要直接从视频平台爬取数据，可以使用 `scraperService.ts`：

```typescript
import { scrapeVideo } from './scraperService';

// 爬取单个视频
const result = await scrapeVideo('https://www.douyin.com/video/xxx');

if (result.success) {
  console.log('爬取成功:', result.data);
} else {
  console.error('爬取失败:', result.error);
}
```

## 数据流程

1. **前端请求** → `ViralVideosSection` 组件
2. **API 调用** → `videoApi.ts`
3. **数据获取** → `mockApi.ts` (当前) 或真实后端
4. **数据处理** → 保存到 Firebase 或本地存储

## 扩展功能

### 添加新平台

1. 在 `scraperService.ts` 的 `SUPPORTED_PLATFORMS` 中添加新平台
2. 实现对应的解析函数（如 `parseDouyinContent`）
3. 在环境配置中添加对应的 API 端点

### 数据库集成

可以考虑集成真实数据库：
- Firebase Realtime Database（当前使用）
- MongoDB
- PostgreSQL
- MySQL

## 注意事项

1. **API 限制**：注意请求频率限制
2. **数据缓存**：考虑实现本地缓存机制
3. **错误处理**：完善错误处理和重试逻辑
4. **类型安全**：保持 TypeScript 类型检查