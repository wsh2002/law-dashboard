import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, Settings, X, Save, Sparkles, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AIAnalysisConfig, DEFAULT_CONFIG as AI_DEFAULT_CONFIG, convertToDocument, analyzeDocument } from '../services/aiAnalysis';

export const VideoParser: React.FC = () => {
  const [videoContent, setVideoContent] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIAnalysisConfig>(() => {
    const saved = localStorage.getItem('video_ai_config');
    return saved ? JSON.parse(saved) : AI_DEFAULT_CONFIG;
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<'idle' | 'converting' | 'analyzing'>('idle');
  const [documentResult, setDocumentResult] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAISaveConfig = () => {
    localStorage.setItem('video_ai_config', JSON.stringify(aiConfig));
    setShowAIConfig(false);
  };

  const handleAIAnalysis = async () => {
    if (!videoContent.trim()) {
      setError('请输入视频内容或台词');
      return;
    }
    
    setError(null);
    setIsAnalyzing(true);
    setAnalysisStep('converting');
    setDocumentResult('');
    setAnalysisResult('');
    setShowAnalysisModal(true);
    
    try {
      const videoData = {
        title: videoTitle || '视频分析',
        content: videoContent
      };
      
      const doc = await convertToDocument(aiConfig, videoData);
      setDocumentResult(doc);
      
      setAnalysisStep('analyzing');
      
      const analysis = await analyzeDocument(aiConfig, doc, { likes: 0, comments: 0 });
      setAnalysisResult(analysis);
    } catch (err: any) {
      setAnalysisResult(`分析失败: ${err.message || '请检查 API 配置或网络连接。'}`);
      setDocumentResult(`文档转换失败: ${err.message || 'API 调用异常。'}`);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('idle');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">视频内容 AI 分析</h3>
        </div>
        <button 
          onClick={() => setShowAIConfig(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          title="AI 配置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        输入视频的文案、台词或内容，AI 将使用 <strong>R1</strong> 模型转换为正式文档，再使用 <strong>V3.2</strong> 模型进行深度分析。
      </p>

      <div className="space-y-4 mb-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">视频标题（可选）</label>
          <input
            type="text"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            placeholder="请输入视频标题"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">视频内容 / 台词</label>
          <textarea
            value={videoContent}
            onChange={(e) => setVideoContent(e.target.value)}
            placeholder="请粘贴视频的文案、字幕或台词内容..."
            rows={6}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button 
        onClick={handleAIAnalysis}
        disabled={isAnalyzing || !videoContent.trim()}
        className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            AI 分析中...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            开始 AI 深度分析
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center mt-3">
        视频转文档使用 <strong>DeepSeek R1</strong> 模型，深度分析使用 <strong>DeepSeek V3.2</strong> 模型
      </p>

      {/* AI Analysis Modal */}
      <AnimatePresence>
        {showAnalysisModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5" />
                  <h4 className="font-bold text-lg">AI 深度分析报告</h4>
                </div>
                <button onClick={() => setShowAnalysisModal(false)} className="text-white/80 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                {analysisStep === 'converting' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
                    <p className="text-gray-600 font-medium">正在使用 <strong>DeepSeek R1</strong> 模型将视频内容转换为文档...</p>
                  </div>
                )}
                
                {analysisStep === 'analyzing' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                    <p className="text-gray-600 font-medium">正在使用 <strong>DeepSeek V3.2</strong> 模型进行深度分析...</p>
                  </div>
                )}
                
                {documentResult && (
                  <div className="mb-6">
                    <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-500" />
                      转换后的文档 (R1模型)
                    </h5>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm max-h-60 overflow-auto">
                      <ReactMarkdown>{documentResult}</ReactMarkdown>
                    </div>
                  </div>
                )}
                
                {analysisResult && (
                  <div>
                    <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      深度分析报告 (V3.2模型)
                    </h5>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 text-sm max-h-96 overflow-auto">
                      <ReactMarkdown>{analysisResult}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Config Modal */}
      <AnimatePresence>
        {showAIConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  DeepSeek AI 配置
                </h4>
                <button onClick={() => setShowAIConfig(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">API Key</label>
                  <input
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm font-mono"
                    placeholder="sk-..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Base URL</label>
                  <input
                    type="text"
                    value={aiConfig.baseUrl}
                    onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm font-mono"
                    placeholder="https://api.deepseek.com/v1"
                  />
                </div>
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-700">
                    <strong>说明：</strong>视频转文档使用 <strong>R1</strong> 模型，深度分析使用 <strong>V3.2</strong> 模型。
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowAIConfig(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAISaveConfig}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  保存配置
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
