import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { AlertTriangle, TrendingUp, Users, Activity } from 'lucide-react';

const PRIORITY_DATA = [
  { zone: 'Velachery', score: 92, populationAtRisk: 14500, infrastructureStatus: 45 },
  { zone: 'OMR IT Corridor', score: 88, populationAtRisk: 22000, infrastructureStatus: 60 },
  { zone: 'Mylapore', score: 76, populationAtRisk: 9800, infrastructureStatus: 72 },
  { zone: 'T. Nagar', score: 71, populationAtRisk: 18000, infrastructureStatus: 68 },
  { zone: 'Guindy', score: 65, populationAtRisk: 11200, infrastructureStatus: 81 },
  { zone: 'Anna Nagar', score: 54, populationAtRisk: 15600, infrastructureStatus: 85 }
];

const HISTORICAL_TREND = [
  { time: '08:00', avgScore: 62 },
  { time: '09:00', avgScore: 65 },
  { time: '10:00', avgScore: 71 },
  { time: '11:00', avgScore: 78 },
  { time: '12:00', avgScore: 84 },
  { time: '13:00', avgScore: 89 },
];

export const PrioritizationDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">AI Vulnerability Analysis</h2>
          <p className="text-sm text-slate-400">Powered by Spatial Graph Neural Networks (GNN)</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Activity size={14} className="text-blue-400 animate-pulse" />
          <span className="text-xs font-semibold text-blue-400">GNN Model Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0b101d] border border-[#172338] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Critical Zones</p>
            <p className="text-2xl font-bold text-slate-100">2</p>
          </div>
        </div>
        <div className="bg-[#0b101d] border border-[#172338] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Avg Vulnerability Score</p>
            <p className="text-2xl font-bold text-slate-100">74.3</p>
          </div>
        </div>
        <div className="bg-[#0b101d] border border-[#172338] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Population at Risk</p>
            <p className="text-2xl font-bold text-slate-100">91,100</p>
          </div>
        </div>
        <div className="bg-[#0b101d] border border-[#172338] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Resource Utilization</p>
            <p className="text-2xl font-bold text-slate-100">88%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0b101d] border border-[#172338] p-6 rounded-xl">
          <h3 className="text-slate-200 font-semibold mb-4">Vulnerability Score by Zone</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PRIORITY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="zone" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                />
                <Bar dataKey="score" fill="#ef4444" radius={[4, 4, 0, 0]} name="Vulnerability Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0b101d] border border-[#172338] p-6 rounded-xl">
          <h3 className="text-slate-200 font-semibold mb-4">Citywide Vulnerability Trend (24h)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HISTORICAL_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAvgScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="avgScore" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorAvgScore)" name="Avg Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-[#0b101d] border border-[#172338] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#172338]">
          <h3 className="text-slate-200 font-semibold">Priority Resource Allocation</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#111928] text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Zone</th>
                <th className="px-4 py-3 font-medium">Vulnerability Score</th>
                <th className="px-4 py-3 font-medium">Primary Risk Factor</th>
                <th className="px-4 py-3 font-medium">Suggested Action</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172338]">
              {PRIORITY_DATA.map((row, i) => (
                <tr key={i} className="hover:bg-[#111928] transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-200">{row.zone}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            row.score >= 80 ? 'bg-red-500' : 
                            row.score >= 65 ? 'bg-orange-500' : 
                            row.score >= 50 ? 'bg-yellow-500' : 
                            'bg-emerald-500'
                          }`} 
                          style={{ width: `${row.score}%` }}
                        ></div>
                      </div>
                      <span className={
                        row.score >= 80 ? 'text-red-400 font-bold' : 
                        row.score >= 65 ? 'text-orange-400 font-semibold' : 
                        row.score >= 50 ? 'text-yellow-400' : 
                        'text-emerald-400 font-medium'
                      }>
                        {row.score}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {row.score > 80 ? 'Severe Flooding / Drainage Block' : row.score > 60 ? 'Power Grid Failure' : 'Minor Congestion'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {row.score > 80 ? 'Dispatch SDRF Teams' : row.score > 60 ? 'Reroute Power Supply' : 'Monitor Situation'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md ${
                      row.score >= 80 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                      row.score >= 65 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                      row.score >= 50 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {row.score >= 80 ? 'Critical' : row.score >= 65 ? 'Severe' : row.score >= 50 ? 'Elevated' : 'Stable'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
