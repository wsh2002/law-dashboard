import React from 'react';
import { motion } from 'framer-motion';
import { cn } from './lib/utils';

interface AppTempProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AppTemp: React.FC<AppTempProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="fixed left-4 top-20 z-50">
      <div className="relative group">
        <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-xl shadow-lg p-2 cursor-pointer hover:shadow-xl transition-all duration-300">
          <span className="text-xl">📊</span>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: -10, width: 0 }}
          whileHover={{ 
            opacity: 1, 
            x: 0, 
            width: 'auto' 
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute left-full top-0 ml-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl p-4 min-w-[280px] overflow-hidden z-50"
        >
          <div className="flex flex-col gap-2 min-w-[280px]">
            <div className="space-y-2 pb-3 border-b border-gray-100">
              {
                [
                  { key: 'overview', label: '数据概览和 AI 诊断', icon: '📊', color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600' },
                  { key: 'monthly', label: '月度对比分析', icon: '📈', color: 'from-purple-500 to-pink-600', bg: 'bg-purple-50', text: 'text-purple-600' },
                  { key: 'range', label: '时段对比 KPI', icon: '📅', color: 'from-orange-500 to-red-600', bg: 'bg-orange-50', text: 'text-orange-600' },
                  { key: 'personal', label: '个人行业爆款视频', icon: '👤', color: 'from-green-500 to-teal-600', bg: 'bg-green-50', text: 'text-green-600' }
                ].map((tab) => (
                  <motion.button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "relative w-full p-3 rounded-xl transition-all flex items-center gap-3 group",
                      activeTab === tab.key
                        ? `${tab.bg} border-2 border-current ${tab.text} shadow-md`
                        : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                    )}
                  >
                    <div className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full transition-all",
                      activeTab === tab.key ? tab.color.replace('from-', 'bg-') : 'bg-gray-300 group-hover:bg-gray-400'
                    )} />
                    
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all",
                      activeTab === tab.key ? tab.bg : "bg-gray-100 group-hover:bg-gray-200"
                    )}>
                      {tab.icon}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className={cn(
                        "text-sm font-bold transition-all",
                        activeTab === tab.key ? tab.text : "text-gray-700"
                      )}>
                        {tab.label}
                      </div>
                    </div>
                    
                    <div className={cn(
                      "w-5 h-5 transition-all",
                      activeTab === tab.key ? tab.text : "text-gray-400 group-hover:text-gray-600"
                    )}>
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    
                    {activeTab === tab.key && (
                      <motion.div 
                        layoutId="activeTabIndicator"
                        className={`absolute inset-0 rounded-xl border-2 ${tab.text.replace('text-', 'border-')} opacity-20`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      />
                    )}
                  </motion.button>
                ))
              }
            </div>
            
            <div className="space-y-2">
              {
                [
                  { key: 'viral', label: '行业爆款视频', icon: '🔥', color: 'from-red-500 to-orange-600', bg: 'bg-red-50', text: 'text-red-600' },
                  { key: 'rewrite', label: '文案创作', icon: '✍️', color: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50', text: 'text-cyan-600' },
                  { key: 'agent', label: '智能体', icon: '🤖', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600' }
                ].map((tab) => (
                  <motion.button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "relative w-full p-3 rounded-xl transition-all flex items-center gap-3 group",
                      activeTab === tab.key
                        ? `${tab.bg} border-2 border-current ${tab.text} shadow-md`
                        : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                    )}
                  >
                    <div className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full transition-all",
                      activeTab === tab.key ? tab.color.replace('from-', 'bg-') : 'bg-gray-300 group-hover:bg-gray-400'
                    )} />
                    
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all",
                      activeTab === tab.key ? tab.bg : "bg-gray-100 group-hover:bg-gray-200"
                    )}>
                      {tab.icon}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className={cn(
                        "text-sm font-bold transition-all",
                        activeTab === tab.key ? tab.text : "text-gray-700"
                      )}>
                        {tab.label}
                      </div>
                    </div>
                    
                    <div className={cn(
                      "w-5 h-5 transition-all",
                      activeTab === tab.key ? tab.text : "text-gray-400 group-hover:text-gray-600"
                    )}>
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.button>
                ))
              }
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AppTemp;