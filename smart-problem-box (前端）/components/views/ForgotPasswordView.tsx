
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ArrowLeft, Mail, CheckCircle, ArrowRight } from 'lucide-react';

const ForgotPasswordView: React.FC = () => {
  const { setViewMode } = useStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API delay
    setTimeout(() => {
        setIsLoading(false);
        setIsSent(true);
    }, 1500);
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

                {!isSent ? (
                    <>
                        <div className="mb-8">
                            <button 
                                onClick={() => setViewMode('study')} // 'study' acts as login fallback when !isLoggedIn
                                className="flex items-center gap-1 text-xs text-[#888888] hover:text-primary mb-4 transition-colors"
                            >
                                <ArrowLeft size={14} />
                                返回登录
                            </button>
                            <h2 className="text-2xl font-bold text-[#E0E0E0] mb-2">重置密码</h2>
                            <p className="text-[#888888] text-sm">输入您的注册邮箱，我们将向您发送重置链接。</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-[#B5B5B5]">邮箱地址</label>
                                <div className="flux-gradient-border">
                                  <div className="relative flux-input">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-200/80" size={16} />
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="flux-input-field w-full py-2.5 pl-10 pr-4 text-sm placeholder:text-[#5B6775] outline-none transition-all"
                                        placeholder="name@example.com"
                                        required
                                    />
                                  </div>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="flux-button w-full py-2.5 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        发送重置链接 <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-8 animate-fade-in">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-[#E0E0E0] mb-2">邮件已发送</h2>
                        <p className="text-[#888888] text-sm mb-8">
                            我们已向 <span className="text-[#E0E0E0] font-medium">{email}</span> 发送了重置密码的说明，请查收邮件。
                        </p>
                        <button 
                            onClick={() => {
                                setIsSent(false);
                                setViewMode('study');
                            }}
                            className="flux-button w-full py-2.5 transition-all"
                        >
                            返回登录页
                        </button>
                        <p className="mt-6 text-xs text-[#888888]">
                            没收到邮件？ <button onClick={() => setIsSent(false)} className="flux-link hover:underline">重新发送</button>
                        </p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ForgotPasswordView;
