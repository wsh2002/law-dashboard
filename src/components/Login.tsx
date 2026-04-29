import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ShieldCheck, Users, BarChart3, TrendingUp, Zap, ArrowRight } from 'lucide-react';
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

const features = [
    { icon: BarChart3, title: '多维数据分析', desc: '跨平台运营数据一站式聚合' },
    { icon: TrendingUp, title: '趋势洞察', desc: 'AI 驱动的智能诊断与建议' },
    { icon: Zap, title: '实时监控', desc: '关键 KPI 变化即时预警' },
];

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
    };

    return (
        <div className="min-h-screen flex font-sans">
            {/* ===== 左侧品牌面板 ===== */}
            <div className="hidden lg:flex lg:w-[52%] login-brand-panel flex-col justify-between p-12 text-white relative">
                <div className="data-grid-decoration" />
                <div className="grid-pattern absolute inset-0" />

                {/* 浮动装饰光斑 */}
                <div className="absolute top-[15%] right-[18%] w-64 h-64 rounded-full bg-blue-500/10 blur-3xl animate-float-slow" />
                <div className="absolute bottom-[20%] left-[10%] w-48 h-48 rounded-full bg-violet-500/8 blur-3xl animate-float-medium" />
                <div className="absolute top-[55%] right-[8%] w-32 h-32 rounded-full bg-cyan-400/6 blur-2xl animate-pulse-soft" />

                {/* 品牌标题 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="relative z-10"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <BarChart3 className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-lg font-semibold tracking-wide text-white/90">数据分析平台</span>
                    </div>
                </motion.div>

                {/* 中间大标题区域 */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.15 }}
                    className="relative z-10 -mt-12"
                >
                    <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6 tracking-tight">
                        律所短视频
                        <br />
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                            运营数据中心
                        </span>
                    </h1>
                    <p className="text-white/50 text-base max-w-md leading-relaxed">
                        多平台数据聚合 · AI 智能诊断 · 一键生成运营报告
                    </p>

                    <div className="mt-10 space-y-4">
                        {features.map((f, i) => (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                                className="flex items-center gap-4 group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                                    <f.icon className="w-5 h-5 text-blue-400/80" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-white/80">{f.title}</h3>
                                    <p className="text-xs text-white/35">{f.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* 底部数字展示 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.6 }}
                    className="relative z-10 flex gap-10"
                >
                    {[
                        { num: '3+', label: '支持平台' },
                        { num: '20+', label: '分析维度' },
                        { num: '99.9%', label: '数据安全' },
                    ].map((stat) => (
                        <div key={stat.label}>
                            <div className="text-2xl font-bold text-white/90">{stat.num}</div>
                            <div className="text-xs text-white/35 mt-0.5">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* ===== 右侧登录表单 ===== */}
            <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative">
                {/* 移动端简化背景 */}
                <div className="absolute top-[10%] right-[5%] w-72 h-72 rounded-full bg-blue-100/40 blur-3xl lg:hidden" />
                <div className="absolute bottom-[15%] left-[8%] w-56 h-56 rounded-full bg-violet-100/30 blur-3xl lg:hidden" />

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[400px] relative z-10"
                >
                    {/* 移动端 Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/15">
                            <BarChart3 className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900">律所数据分析平台</h1>
                    </div>

                    {/* 欢迎文字 */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">欢迎回来</h2>
                        <p className="text-slate-500 text-sm mt-1.5">登录以访问数据仪表盘</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">邮箱地址</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 input-premium text-sm"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">密码</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 input-premium text-sm"
                                    placeholder="请输入密码"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 font-medium"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-brand-blue font-semibold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    登录平台
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-800">数据安全</h4>
                                    <p className="text-[10px] text-slate-500 leading-snug mt-0.5">所有数据仅在本地浏览器处理</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                <Users className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-800">多用户访问</h4>
                                    <p className="text-[10px] text-slate-500 leading-snug mt-0.5">支持多人同时在线使用</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="absolute bottom-5 text-[11px] text-slate-400 text-center w-full left-0">
                    &copy; {new Date().getFullYear()} Law Firm Data Analysis. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default Login;
