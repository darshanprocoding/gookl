import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { VulnerabilityMap } from './components/VulnerabilityMap';
import { DispatchMap } from './components/DispatchMap';
import { PrioritizationDashboard } from './components/PrioritizationDashboard';
import { InfrastructureStatus } from './components/InfrastructureStatus';
import { ResourceManagement } from './components/ResourceManagement';
import { DisasterSimulationProvider } from './context/DisasterSimulationContext';

export default function App() {
  const [currentView, setCurrentView] = useState('Vulnerability Map');

  return (
    <DisasterSimulationProvider>
      <div className="flex h-screen bg-[#070a12] text-slate-100 font-sans overflow-hidden">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

        <div className="flex-1 flex flex-col min-w-0 bg-[#070a12]">
          <header className="h-16 border-b border-[#151f32] bg-[#090d16] flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-slate-100 tracking-wide">{currentView}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-xs font-semibold text-emerald-400">System Nominal</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scrollbar-thumb-slate-800">
            <div className="max-w-[1700px] mx-auto">
              <div className={currentView === 'Vulnerability Map' ? 'h-[calc(100vh-6rem)] relative' : 'hidden'}>
                <VulnerabilityMap />
              </div>
              <div className={currentView === 'Dispatch Map' ? 'h-[calc(100vh-6rem)] relative' : 'hidden'}>
                <DispatchMap />
              </div>
              {currentView === 'Resource Management' && <ResourceManagement />}
              {currentView === 'Prioritization Dashboard' && <PrioritizationDashboard />}
              {currentView === 'Infrastructure Status' && <InfrastructureStatus />}
              {currentView === 'Incident Dispatch' && <ResourceManagement />}
              {!['Vulnerability Map', 'Dispatch Map', 'Resource Management', 'Prioritization Dashboard', 'Infrastructure Status', 'Incident Dispatch'].includes(currentView) && (
                <div className="p-8 text-center bg-[#0b101d] border border-[#172338] rounded-2xl">
                  <h3 className="text-base font-bold text-slate-200">{currentView}</h3>
                  <p className="text-xs text-slate-400 mt-1">Module view is under development.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </DisasterSimulationProvider>
  );
}
