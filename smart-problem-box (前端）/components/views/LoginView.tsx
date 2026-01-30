
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';

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
    <div className="dark flux-root min-h-screen w-full flex items-center justify-center px-6 py-10 font-mono bg-[#05050a] text-[#E0E0E0]">
        <div className="flux-card w-full max-w-[520px]">
            <div className="relative z-10 p-8 md:p-12 flex flex-col justify-center">
                
                <div className="flex items-center gap-2 mb-8">
                     <img
                         src="/flux-logo.png"
                         alt="Flux Matrix logo"
                         className="h-8 w-8 rounded-md object-contain"
                     />
                     <h1 className="text-xl font-bold tracking-tight text-[#E0E0E0]">Flux Matrix</h1>
                </div>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-[#E0E0E0] mb-2">欢迎回来</h2>
                    <p className="text-[#888888] text-sm">请输入您的账号信息以继续</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#B5B5B5]">邮箱</label>
                        <div className="flux-gradient-border">
                          <div className="relative flux-input">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-200/80" size={16} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flux-input-field w-full py-2.5 pl-10 pr-4 text-sm placeholder:text-[#5B6775] outline-none transition-all"
                                placeholder="name@example.com"
                                autoComplete="off"
                                required
                            />
                          </div>
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                             <label className="text-xs font-semibold text-[#B5B5B5]">密码</label>
                             <button 
                                type="button"
                                onClick={() => setViewMode('forgot_password')}
                                className="text-xs flux-link hover:underline"
                             >
                                忘记密码?
                             </button>
                        </div>
                        <div className="flux-gradient-border">
                          <div className="relative flux-input">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-200/80" size={16} />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flux-input-field w-full py-2.5 pl-10 pr-10 text-sm placeholder:text-[#5B6775] outline-none transition-all"
                                placeholder="••••••••"
                                autoComplete="off"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-200/70 hover:text-cyan-200 transition-colors"
                                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                            >
                                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                          </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="flux-button w-full py-2.5 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        ) : (
                            <>
                                登录 <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                    {authError && (
                        <div className="text-xs text-red-400 mt-2">{authError}</div>
                    )}
                </form>

                <p className="mt-8 text-center text-xs text-[#888888]">
                    还没有账号? <button onClick={() => setViewMode('register')} className="flux-link hover:underline font-medium">立即注册</button>
                </p>
            </div>
        </div>
    </div>
  );
};

export default LoginView;
