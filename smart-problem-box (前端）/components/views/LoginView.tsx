
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { GraduationCap, ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const LoginView: React.FC = () => {
  const { login, setViewMode } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');
    try {
      await login(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败，请稍后再试';
      setAuthError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-[#09090b] p-4 font-display">
        <div className="w-full max-w-[500px] bg-white dark:bg-[#121217] rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="p-8 md:p-12 flex flex-col justify-center">
                
                <div className="flex items-center gap-2 mb-8">
                     <GraduationCap size={32} className="text-primary" />
                     <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Smart题库助手</h1>
                </div>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">欢迎回来</h2>
                    <p className="text-zinc-500 text-sm">请输入您的账号信息以继续</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">邮箱</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="name@example.com"
                                autoComplete="off"
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                             <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">密码</label>
                             <button 
                                type="button"
                                onClick={() => setViewMode('forgot_password')}
                                className="text-xs text-primary hover:underline"
                             >
                                忘记密码?
                             </button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2.5 pl-10 pr-10 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                autoComplete="off"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                            >
                                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-wait mt-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                登录 <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                    {authError && (
                        <div className="text-xs text-red-600 mt-2">{authError}</div>
                    )}
                </form>

                <p className="mt-8 text-center text-xs text-zinc-500">
                    还没有账号? <button onClick={() => setViewMode('register')} className="text-primary hover:underline font-medium">立即注册</button>
                </p>
            </div>
        </div>
    </div>
  );
};

export default LoginView;
