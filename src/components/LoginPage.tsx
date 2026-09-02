import React, { useState } from 'react';
import { AshokaChakra, TirangaRibbon } from './AshokaChakra';
import { useTranslation } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Cpu,
  Radio,
  FileText
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
  onOpenCulturalGuide?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenCulturalGuide }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    if (trimmedUser === 'bharat' && trimmedPass === 'watchdogs') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess('bharat');
      }, 400);
    } else {
      setErrorMsg('Invalid Credentials. Username is "bharat" and Password is "watchdogs". Use the 1-Click Judge button below for instant access.');
    }
  };

  const handleAutoFillAndLogin = () => {
    setUsername('bharat');
    setPassword('watchdogs');
    setErrorMsg(null);
    setAutoFilled(true);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess('bharat');
    }, 500);
  };

  const handleFillOnly = () => {
    setUsername('bharat');
    setPassword('watchdogs');
    setErrorMsg(null);
    setAutoFilled(true);
  };

  return (
    <div className="min-h-screen bg-[#050A17] text-slate-100 font-sans flex flex-col justify-between relative overflow-hidden selection:bg-[#FF9933]/30 selection:text-white">
      {/* Top Tiranga Micro-Ribbon */}
      <TirangaRibbon height="h-1.5" />

      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-br from-[#000080]/20 via-[#FF9933]/10 to-[#138808]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#000080]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FF9933]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar with Language & Cultural Guide */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-[#142344]/80 bg-[#070D1E]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#000080]/40 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_14px_rgba(59,130,246,0.3)]">
            <AshokaChakra size={22} color="#60A5FA" animate />
          </div>
          <div>
            <span className="text-xs font-black tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>URBAN VULNERABILITY ENGINE</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30 rounded font-mono">
                C2 PORTAL
              </span>
            </span>
            <p className="text-[10px] text-slate-400 font-mono">
              National Disaster Early Warning &amp; Resilience System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onOpenCulturalGuide && (
            <button
              type="button"
              onClick={onOpenCulturalGuide}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1E3D] hover:bg-[#1A2D52] border border-[#1E325C] text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <span>🇮🇳</span>
              <span className="text-[11px]">Design Ethos</span>
            </button>
          )}
          <LanguageSelector />
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-[#091124]/90 border border-[#182B54] rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

            {/* Emblem Header */}
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-b from-[#0F1E3D] to-[#070D1E] border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.25)] mb-3">
                <AshokaChakra size={38} color="#93C5FD" animate />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                National Command Portal
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Govt. of India • Disaster Logistics &amp; Vulnerability C2
              </p>
            </div>

            {/* HACKATHON JUDGE 1-CLICK QUICK ACCESS BOX */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-[#FF9933]/15 via-[#000080]/20 to-[#138808]/15 border border-[#FF9933]/40 shadow-lg shadow-[#FF9933]/5 relative">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF9933]">
                  <Sparkles size={14} className="animate-spin text-[#FF9933]" style={{ animationDuration: '4s' }} />
                  <span>Hackathon Judge Quick-Access</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#138808]/30 border border-[#138808]/50 text-emerald-300 font-mono font-bold">
                  Verified Bypass
                </span>
              </div>

              <div className="bg-[#060B18]/90 rounded-lg p-2.5 border border-[#1E325C] mb-3 text-[11px] font-mono flex items-center justify-between text-slate-300">
                <div>
                  <span className="text-slate-400">User: </span>
                  <strong className="text-amber-300 font-bold">bharat</strong>
                </div>
                <div className="h-3 w-px bg-slate-700" />
                <div>
                  <span className="text-slate-400">Pass: </span>
                  <strong className="text-emerald-300 font-bold">watchdogs</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAutoFillAndLogin}
                  disabled={isLoading}
                  className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-[#FF9933] to-[#FF8000] hover:from-[#FFAA44] hover:to-[#FF9010] text-[#0A1329] font-black text-xs transition-all shadow-md shadow-[#FF9933]/25 flex items-center justify-center gap-1.5 cursor-pointer transform active:scale-95"
                >
                  <KeyRound size={14} />
                  <span>1-Click Auto-Login</span>
                </button>

                <button
                  type="button"
                  onClick={handleFillOnly}
                  className="w-full py-2.5 px-3 rounded-lg bg-[#0F1E3D] hover:bg-[#182C54] border border-[#233F7A] text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>Fill Fields Only</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Username / Nodal ID:</span>
                  <span className="text-[10px] text-slate-400 font-mono font-normal">Use: bharat</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={15} />
                  </div>
                  <input
                    id="login-username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="bharat"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#060B18] border border-[#1A2E59] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-mono transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Secret Clearance Passcode:</span>
                  <span className="text-[10px] text-slate-400 font-mono font-normal">Use: watchdogs</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={15} />
                  </div>
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="watchdogs"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#060B18] border border-[#1A2E59] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="login-submit-button"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Nodal Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate &amp; Enter C2 Engine</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Security Assurance Tag */}
            <div className="mt-6 pt-4 border-t border-[#142344] flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck size={13} />
                <span>NDMA 256-Bit TLS</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-300">
                <Radio size={12} className="animate-pulse" />
                <span>Live C2 Sync</span>
              </div>
            </div>
          </div>

          {/* Quick Info Below Card */}
          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-500">
              National Early Warning &amp; Disaster Relief Resource Optimization
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 px-6 text-center text-[10px] text-slate-500 font-mono border-t border-[#142344]/50 bg-[#070D1E]/60">
        <span>© 2025–2026 Government of India • Ministry of Home Affairs / NDMA Integrated Network</span>
      </footer>
    </div>
  );
};
