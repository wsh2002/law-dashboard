import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ChevronRight, ShieldCheck, Users } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import { supabase } from '../services/supabase';

interface LoginProps {
    onLogin?: () => void;
}

const errorMap: Record<string, string> = {
    'Invalid login credentials': '邮箱或密码错误',
    'Email not confirmed': '邮箱尚未验证，请联系管理员',
    'Too many requests': '尝试次数过多，请稍后再试',
    'User not found': '该邮箱未注册',
    'Invalid email': '邮箱格式不正确',
};

const Login: React.FC<LoginProps> = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        setLoading(false);

        if (error) {
            const msg = errorMap[error.message] || `登录失败：${error.message}`;
            setError(msg);
        }
        // 登录成功后 onAuthStateChange 会自动触发，无需手动跳转
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-sans relative overflow-hidden">
            <AnimatedBackground />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/60 relative z-10"
            >
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">律所数据分析平台</h1>
                        <p className="text-gray-500 text-sm">请登录以访问数据仪表盘</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 ml-1">邮箱</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="请输入邮箱地址"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 ml-1">密码</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="请输入密码"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-100"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? '登录中...' : '登录平台'}
                            {!loading && <ChevronRight className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-2">
                            <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-semibold text-gray-900">数据安全</h4>
                                <p className="text-[10px] text-gray-500 leading-tight mt-0.5">所有数据仅在本地浏览器处理，不上传云端</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <Users className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-semibold text-gray-900">多用户访问</h4>
                                <p className="text-[10px] text-gray-500 leading-tight mt-0.5">支持多人同时在线使用，数据互不干扰</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
            
            <div className="absolute bottom-4 text-xs text-gray-400 text-center w-full">
                &copy; {new Date().getFullYear()} Law Firm Data Analysis. All rights reserved.
            </div>
        </div>
    );
};

export default Login;
