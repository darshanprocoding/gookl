import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { VulnerabilityMap } from './components/VulnerabilityMap';
import { DispatchMap } from './components/DispatchMap';
import { PrioritizationDashboard } from './components/PrioritizationDashboard';
import { InfrastructureStatus } from './components/InfrastructureStatus';
import { ResourceManagement } from './components/ResourceManagement';
import { LoginPage } from './components/LoginPage';
import { DisasterSimulationProvider } from './context/DisasterSimulationContext';
import { LanguageProvider, useTranslation } from './context/LanguageContext';
import { LanguageSelector } from './components/LanguageSelector';
import { AshokaChakra, TirangaRibbon } from './components/AshokaChakra';
import { CulturalMeaningGuide } from './components/CulturalMeaningGuide';
import { Sparkles, ShieldCheck, HelpCircle, LogOut, UserCheck } from 'lucide-react';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bharat_c2_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [currentUser, setCurrentUser] = useState<string>(() => {
    try {
      return localStorage.getItem('bharat_c2_user') || 'bharat';
    } catch {
      return 'bharat';
    }
  });

  const [currentView, setCurrentView] = useState('Vulnerability Map');
  const [showCulturalGuide, setShowCulturalGuide] = useState(false);
  const { t } = useTranslation();

  const handleLoginSuccess = (username: string) => {
    try {
      localStorage.setItem('bharat_c2_auth', 'true');
      localStorage.setItem('bharat_c2_user', username);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    setCurrentUser(username);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('bharat_c2_auth');
      localStorage.removeItem('bharat_c2_user');
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onOpenCulturalGuide={() => setShowCulturalGuide(true)}
        />
        <CulturalMeaningGuide
          isOpen={showCulturalGuide}
          onClose={() => setShowCulturalGuide(false)}
        />
      </>
    );
  }

  const getViewTitleKey = (view: string) => {
    switch (view) {
      case 'Vulnerability Map':
        return 'nav.vulnerabilityMap';
      case 'Dispatch Map':
        return 'nav.dispatchMap';
      case 'Resource Management':
        return 'nav.resourceManagement';
      case 'Prioritization Dashboard':
        return 'nav.prioritizationDashboard';
      case 'Infrastructure Status':
        return 'nav.infrastructureStatus';
      case 'Incident Dispatch':
        return 'nav.incidentDispatch';
      default:
        return view;
    }
  };

  return (
    <div className="flex h-screen bg-[#060B18] text-slate-100 font-sans overflow-hidden flex-col">
      {/* Top Flag Micro-Ribbon: Kesari (Saffron), Shwet (White), Hara (Green) */}
      <TirangaRibbon height="h-1" />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Indian Heritage & Dharmachakra Sidebar */}
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          onLogout={handleLogout}
        />

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#060B18]">
          {/* Header with National Command Crest, Ashoka Chakra, Cultural Guide & Translate Dropdown */}
          <header className="h-16 border-b border-[#142344] bg-[#0A1329] flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-[9999] shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#000080]/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                  <AshokaChakra size={22} color="#60A5FA" animate />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-100 tracking-wide">
                    {t(getViewTitleKey(currentView), currentView)}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                    {t('app.subtitle', 'National Disaster Early Warning & Resilience Engine')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* User Account / Nodal Identity Badge */}
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0F1E3D] border border-[#1E325C]">
                <UserCheck size={14} className="text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-mono font-bold text-amber-300 leading-none">
                    {currentUser}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">
                    NDMA Clearance
                  </span>
                </div>
              </div>

              {/* Translate Language Selector Button (Top Right) */}
              <LanguageSelector />

              {/* Cultural Meaning & Design Ethos Explainer Button */}
              <button
                type="button"
                onClick={() => setShowCulturalGuide(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F1E3D] hover:bg-[#1A2D52] border border-[#1E325C] hover:border-[#FF9933]/50 text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-sm group"
                title="View the cultural references and color symbolism behind this design"
              >
                <span className="text-sm">🇮🇳</span>
                <span className="text-[11px] group-hover:text-[#FF9933] transition-colors">
                  {t('app.designEthos', 'Design Ethos')}
                </span>
              </button>

              {/* Live 24x7 Continuous Vigilance Status Badge */}
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#138808]/15 border border-[#138808]/30">
                <div className="w-2 h-2 rounded-full bg-[#138808] animate-ping shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-black text-emerald-400 leading-none">
                    {t('app.vigilance', '24x7 Continuous Vigilance')}
                  </span>
                  <span className="text-[9px] text-slate-300 font-medium hidden sm:inline">
                    {t('app.systemNominal', 'System Nominal')}
                  </span>
                </div>
              </div>

              {/* Logout Button in Header */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold transition-colors cursor-pointer"
                title="Sign out of C2 Command"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline text-[11px]">Logout</span>
              </button>
            </div>
          </header>

          {/* Main Interactive Screen */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scrollbar-thumb-[#1E325C]">
            <div className="max-w-[1700px] mx-auto">
              <div className={currentView === 'Vulnerability Map' ? 'h-[calc(100vh-6.25rem)] relative' : 'hidden'}>
                <VulnerabilityMap />
              </div>
              <div className={currentView === 'Dispatch Map' ? 'h-[calc(100vh-6.25rem)] relative' : 'hidden'}>
                <DispatchMap />
              </div>
              {currentView === 'Resource Management' && <ResourceManagement />}
              {currentView === 'Prioritization Dashboard' && <PrioritizationDashboard />}
              {currentView === 'Infrastructure Status' && <InfrastructureStatus />}
              {currentView === 'Incident Dispatch' && <ResourceManagement />}
              {!['Vulnerability Map', 'Dispatch Map', 'Resource Management', 'Prioritization Dashboard', 'Infrastructure Status', 'Incident Dispatch'].includes(currentView) && (
                <div className="p-8 text-center bg-[#0A1329] border border-[#142344] rounded-2xl">
                  <h3 className="text-base font-bold text-slate-200">{currentView}</h3>
                  <p className="text-xs text-slate-400 mt-1">Module view under development.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Explainer Modal for Indian Culture & Tiranga Color Design Ethos */}
      <CulturalMeaningGuide
        isOpen={showCulturalGuide}
        onClose={() => setShowCulturalGuide(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <DisasterSimulationProvider>
        <AppContent />
      </DisasterSimulationProvider>
    </LanguageProvider>
  );
}
