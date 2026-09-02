import React from 'react';
import {
  Map,
  Activity,
  Layers,
  BarChart3,
  LogOut,
  Navigation,
  Truck,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { AshokaChakra } from './AshokaChakra';
import { useTranslation } from '../context/LanguageContext';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onLogout }) => {
  const { t, currentLanguage } = useTranslation();

  const analytics = [
    {
      name: 'Vulnerability Map',
      translationKey: 'nav.vulnerabilityMap',
      icon: Map,
      badge: '3-Pillar GIS',
    },
    {
      name: 'Dispatch Map',
      translationKey: 'nav.dispatchMap',
      icon: Navigation,
      badge: 'GPS Fleet',
    },
    {
      name: 'Resource Management',
      translationKey: 'nav.resourceManagement',
      icon: Truck,
      badge: '36 States',
    },
    {
      name: 'Prioritization Dashboard',
      translationKey: 'nav.prioritizationDashboard',
      icon: BarChart3,
      badge: 'AI C2',
    },
    {
      name: 'Infrastructure Status',
      translationKey: 'nav.infrastructureStatus',
      icon: Zap,
      badge: 'Live Telemetry',
    },
  ];

  return (
    <aside className="w-68 bg-[#070D1D] border-r border-[#142344] flex flex-col shrink-0 h-full select-none">
      {/* National Emblem & Brand Header */}
      <div className="p-4 border-b border-[#142344] bg-[#0A1329] flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#000080]/60 to-[#0A1329] border border-[#1D4ED8]/60 flex items-center justify-center text-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.3)] shrink-0">
          <AshokaChakra size={26} color="#93C5FD" animate />
        </div>
        <div className="min-w-0">
          <h1 className="font-black text-sm text-slate-100 tracking-wide truncate">
            {t('app.name', 'Urban Vuln Engine')}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-[#FF9933]" />
            <span className="w-2 h-2 rounded-full bg-white" />
            <span className="w-2 h-2 rounded-full bg-[#138808]" />
            <span className="text-[10px] text-[#FF9933] font-bold tracking-wider ml-0.5 font-mono">
              INDIA C2
            </span>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-[#142344]">
        <div className="mb-6 px-3">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              {currentLanguage === 'hi' ? 'विश्लेषण एवं कृत्रिम मेधा' : 'ANALYTICS & AI C2'}
            </p>
          </div>
          <div className="space-y-1.5">
            {analytics.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.name;
              const displayName = t(item.translationKey, item.name);
              return (
                <button
                  key={item.name}
                  onClick={() => setCurrentView(item.name)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all text-left group cursor-pointer ${
                    isActive
                      ? 'bg-[#101F42] text-[#FF9933] font-bold border-l-3 border-[#FF9933] shadow-md shadow-[#FF9933]/10 border-t border-r border-b border-[#1E325C]'
                      : 'text-slate-300 hover:text-white hover:bg-[#0D1833] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        isActive
                          ? 'bg-[#FF9933]/15 text-[#FF9933]'
                          : 'bg-[#060B18] text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-xs tracking-tight">
                        {displayName}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ml-1 border ${
                      isActive
                        ? 'bg-[#FF9933]/20 text-[#FF9933] border-[#FF9933]/40'
                        : 'bg-[#060B18] text-slate-400 border-[#142344]'
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* National Motto Card */}
        <div className="mx-3 mt-2 p-3 rounded-xl bg-[#060B18] border border-[#142344] text-center">
          <p className="text-xs font-serif font-black text-[#FF9933]">
            {t('app.motto', '“Relief in calamity is supreme duty”')}
          </p>
          <div className="mt-2 pt-2 border-t border-[#142344] flex items-center justify-center gap-2 text-[10px] text-[#138808] font-bold">
            <ShieldCheck size={13} />
            <span>24x7 Ready</span>
          </div>
        </div>
      </div>

      {/* User Profile & National Command Seal */}
      <div className="p-3.5 border-t border-[#142344] bg-[#0A1329] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-[#060B18] border border-[#FF9933]/50 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-xs font-black text-[#FF9933]">ND</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-100 truncate">National Disaster C2</p>
            <p className="text-[10px] text-slate-400 truncate">{t('app.adminCenter', 'Admin • Nodal Center')}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#138808] shadow-[0_0_6px_#138808]" />
              <span className="text-[10px] text-emerald-400 font-bold font-mono">
                {t('app.authorized', 'AUTHORIZED')}
              </span>
            </div>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/30 cursor-pointer"
            title="Log out"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  );
};
