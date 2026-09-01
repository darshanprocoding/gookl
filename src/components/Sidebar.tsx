import React from 'react';
import {
  Map,
  Activity,
  Layers,
  BarChart3,
  LogOut,
  MapPin,
  AlertTriangle,
  Zap,
  Truck,
  Package,
  Navigation,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onLogout }) => {
  const analytics = [
    { name: 'Vulnerability Map', icon: Map },
    { name: 'Dispatch Map', icon: Navigation },
    { name: 'Resource Management', icon: Truck },
    { name: 'Prioritization Dashboard', icon: BarChart3 },
    { name: 'Infrastructure Status', icon: Zap },
  ];

  const renderNavGroup = (title: string, items: { name: string; icon: any }[]) => (
    <div className="mb-6 px-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 font-mono">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setCurrentView(item.name)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                isActive
                  ? 'bg-[#15233c] text-blue-400 font-semibold border-l-2 border-blue-500 shadow-sm shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111927]'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
              <span className="truncate">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="w-64 bg-[#090d16] border-r border-[#151f32] flex flex-col shrink-0 h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#151f32] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.25)] shrink-0">
          <Layers size={22} className="animate-pulse" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-sm text-slate-100 tracking-wide truncate">Urban Vuln Engine</h1>
          <p className="text-[10px] text-blue-400 font-bold truncate tracking-wider">BUILD WITH भारत 2.0</p>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-800">
        {renderNavGroup('ANALYTICS & AI', analytics)}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-[#151f32] bg-[#070a12]/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
             <span className="text-xs font-bold text-slate-300">WD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Team Watch Dogs</p>
            <p className="text-[11px] text-slate-400 truncate">System Admin</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
              <span className="text-[10px] text-emerald-400 font-medium">Authorized</span>
            </div>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/30"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
};
