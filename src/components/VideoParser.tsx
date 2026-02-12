import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Download, AlertCircle, PlayCircle, Image as ImageIcon, Link as LinkIcon, Settings, X, Save, RefreshCw } from 'lucide-react';

interface VideoData {
  title: string;
  url: string;
  cover: string;
  bigFile: boolean;
  down: string;
  download_image: string;
}

interface ApiResponse {
  code: number;
  msg: string;
  data: VideoData;
}

interface ApiConfig {
  key: string;
  uid: string;
}

const DEFAULT_CONFIG: ApiConfig = {
  key: '329AD5403EE4AFF786C0A0DEFEAF7A2B0095EEA72A9C8E734C',
  uid: '202038463'
};

export const VideoParser: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VideoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  
  // API Configuration State
  const [config, setConfig] = useState<ApiConfig>(() => {
    const saved = localStorage.getItem('video_api_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [tempConfig, setTempConfig] = useState<ApiConfig>(config);

  const TEST_URL = 'https://v.douyin.com/ik754H2U';

  const handleSaveConfig = () => {
    setConfig(tempConfig);
    localStorage.setItem('video_api_config', JSON.stringify(tempConfig));
    setShowConfig(false);
  };

  const handleResetConfig = () => {
    setTempConfig(DEFAULT_CONFIG);
  };

  const handleParse = async (overrideUrl?: string) => {
    const rawUrl = overrideUrl || url;
    if (!rawUrl) return;
    
    // Auto-extract URL from text (e.g. "8.41 ... https://v.douyin.com/...")
    const linkReg = /(https?:\/\/[^\s]+)/g;
    const match = rawUrl.match(linkReg);
    const targetUrl = match ? match[0] : rawUrl;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Use the proxy configured in vite.config.ts
      // Note: In a real production environment, you might need a more dynamic proxy or a backend
      const proxyUrl = `/api/douyin/${config.key}/${config.uid}/?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(proxyUrl);
      const data: ApiResponse = await response.json();

      if (data.code === 200) {
        setResult(data.data);
      } else {
        setError(data.msg || '解析失败，请检查链接是否正确');
      }
    } catch (err) {
      setError('网络请求失败，请稍后重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleParse();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white">
                  <path d="M35 11L35 15C35 17.2091 33.2091 19 31 19C28.7909 19 27 17.2091 27 15L27 34C27 38.9706 22.9706 43 18 43C13.0294 43 9 38.9706 9 34C9 29.0294 13.0294 25 18 25C19.1032 25 20.1652 25.1991 21.1481 25.5674" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M35 13.8V4H41V11.6C41 12.815 40.015 13.8 38.8 13.8H35Z" fill="currentColor" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">抖音/快手视频无水印解析</h3>
        </div>
        <button 
          onClick={() => setShowConfig(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          title="API 设置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* API Config Modal */}
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  解析 API 配置
                </h4>
                <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">API Key (接口密钥)</label>
                  <input
                    type="text"
                    value={tempConfig.key}
                    onChange={(e) => setTempConfig({ ...tempConfig, key: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-mono"
                    placeholder="请输入 API Key"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">User ID (UID)</label>
                  <input
                    type="text"
                    value={tempConfig.uid}
                    onChange={(e) => setTempConfig({ ...tempConfig, uid: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-mono"
                    placeholder="请输入 UID"
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    <strong>提示：</strong> 您可以从 ake999.com 获取 Key 和 UID。
                    设置将保存在本地浏览器，刷新不会丢失。
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button
                  onClick={handleResetConfig}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  恢复默认
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                >
                  <Save className="w-4 h-4" />
                  保存设置
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请粘贴抖音/快手视频分享链接 (e.g. https://v.douyin.com/...)"
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
          />
        </div>
        <button
          onClick={() => handleParse()}
          disabled={loading || !url}
          className="bg-black hover:bg-gray-800 text-white font-medium px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              解析中...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              立即解析
            </>
          )}
        </button>
      </div>

      {/* Test API Section */}
      <div className="flex items-center gap-4 mb-6 px-4 py-3 bg-blue-50/50 rounded-xl border border-blue-100">
        <div className="flex-1">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">API 连通性测试</p>
          <p className="text-xs text-blue-600 line-clamp-1">测试链接: {TEST_URL}</p>
        </div>
        <button
          onClick={() => handleParse(TEST_URL)}
          disabled={loading}
          className="text-xs font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
          运行测试
        </button>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100"
          >
            {/* Video Preview / Cover */}
            <div className="aspect-[9/16] md:aspect-video bg-black rounded-xl overflow-hidden relative group">
              {result.url ? (
                <video 
                  src={result.url} 
                  controls 
                  className="w-full h-full object-contain"
                  poster={result.cover}
                />
              ) : (
                <img 
                  src={result.cover} 
                  alt={result.title} 
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Info & Actions */}
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="font-bold text-gray-900 mb-2 line-clamp-2">{result.title || '无标题视频'}</h4>
                <div className="flex flex-wrap gap-2">
                    {result.bigFile && <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md font-medium">大文件</span>}
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium">解析成功</span>
                </div>
              </div>

              <div className="flex-1" />

              <div className="space-y-3">
                {result.url && (
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors"
                      download
                    >
                      <Download className="w-4 h-4" />
                      下载无水印视频
                    </a>
                )}
                
                {result.cover && (
                    <a 
                      href={result.cover} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                      查看封面原图
                    </a>
                )}

                <div className="text-xs text-gray-400 text-center mt-2">
                    解析结果由第三方 API 提供，仅供学习使用
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
