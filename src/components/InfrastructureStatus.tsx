import React from 'react';
import { Zap, Droplet, Wifi, AlertCircle, CheckCircle2 } from 'lucide-react';

const INFRASTRUCTURE_DATA = [
  { id: 'grid-1', name: 'Velachery Substation', type: 'Power', status: 'Failed', lastUpdated: '10 mins ago', riskImpact: '+15 Vuln Score' },
  { id: 'grid-2', name: 'Guindy Main Grid', type: 'Power', status: 'Operational', lastUpdated: 'Just now', riskImpact: 'Stable' },
  { id: 'water-1', name: 'OMR Storm Drains', type: 'Water', status: 'Clogged', lastUpdated: '1 hr ago', riskImpact: '+25 Vuln Score' },
  { id: 'water-2', name: 'Mylapore Pumping Station', type: 'Water', status: 'Degraded', lastUpdated: '30 mins ago', riskImpact: '+10 Vuln Score' },
  { id: 'comm-1', name: 'T. Nagar Cell Tower', type: 'Comms', status: 'Operational', lastUpdated: '2 mins ago', riskImpact: 'Stable' },
];

export const InfrastructureStatus = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#0b101d] border border-[#172338] p-6 rounded-xl">
        <h2 className="text-lg font-bold text-slate-100 mb-2">Urban Infrastructure Health</h2>
        <p className="text-sm text-slate-400 mb-6">Real-time status of critical infrastructure. Failures directly impact local vulnerability scores.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
           <div className="p-4 rounded-lg bg-[#111928] border border-[#1f2937]">
             <div className="flex items-center gap-3 mb-2">
               <Zap className="text-yellow-500" size={20} />
               <h3 className="font-semibold text-slate-200">Power Grid</h3>
             </div>
             <p className="text-2xl font-bold text-slate-100">85%</p>
             <p className="text-xs text-slate-400 mt-1">Operational Capacity</p>
           </div>
           <div className="p-4 rounded-lg bg-[#111928] border border-[#1f2937]">
             <div className="flex items-center gap-3 mb-2">
               <Droplet className="text-blue-500" size={20} />
               <h3 className="font-semibold text-slate-200">Drainage Systems</h3>
             </div>
             <p className="text-2xl font-bold text-slate-100">62%</p>
             <p className="text-xs text-red-400 mt-1">High Risk of Flooding</p>
           </div>
           <div className="p-4 rounded-lg bg-[#111928] border border-[#1f2937]">
             <div className="flex items-center gap-3 mb-2">
               <Wifi className="text-emerald-500" size={20} />
               <h3 className="font-semibold text-slate-200">Communications</h3>
             </div>
             <p className="text-2xl font-bold text-slate-100">98%</p>
             <p className="text-xs text-slate-400 mt-1">Fully Operational</p>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#111928] text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Node Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Updated</th>
                <th className="px-4 py-3 font-medium">Impact on Vuln Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172338]">
              {INFRASTRUCTURE_DATA.map((node) => (
                <tr key={node.id} className="hover:bg-[#111928] transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-200">{node.name}</td>
                  <td className="px-4 py-3 text-slate-400">{node.type}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {node.status === 'Operational' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertCircle size={14} className={node.status === 'Failed' || node.status === 'Clogged' ? 'text-red-500' : 'text-orange-500'} />}
                      <span className={node.status === 'Operational' ? 'text-emerald-400' : node.status === 'Failed' || node.status === 'Clogged' ? 'text-red-400' : 'text-orange-400'}>{node.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{node.lastUpdated}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono">{node.riskImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
