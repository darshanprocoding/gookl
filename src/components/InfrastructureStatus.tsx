import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  Droplets,
  Wifi,
  Radio,
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Layers,
  Globe,
  Building2,
  Server,
  TrendingDown,
  TrendingUp,
  Clock,
  ShieldAlert,
  Info,
  Sparkles,
  Layers2,
  Gauge,
  HelpCircle,
  Truck,
  Minimize2,
  Maximize2,
  Check,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Navigation,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useDisasterSimulation } from '../context/DisasterSimulationContext';
import {
  computeZoneVulnerability,
  DistrictData,
} from '../utils/vulnerabilityMath';
import {
  getDistrictBaseline,
  canonicalStateName,
  STATE_BASELINES,
} from '../data/districtProfiles';
import { STATE_GEO_CONFIGS } from '../data/stateCoordinates';

export interface InfrastructureMetric {
  percentage: number;
  status: 'Normal' | 'Stable' | 'Degraded' | 'Critical' | 'Failed' | 'Clogged' | 'High Flow' | 'Optimal';
  statusColor: 'emerald' | 'cyan' | 'amber' | 'orange' | 'red';
  subLabel?: string;
}

export interface CityInfrastructureRow {
  cityName: string;
  stateName: string;
  network: InfrastructureMetric;
  drainage: InfrastructureMetric;
  communication: InfrastructureMetric;
  power: InfrastructureMetric;
  lastUpdated: string;
  overallVulnerabilityScore: number;
  primaryRiskFactor: string;
  population: number;
  isInsideImpact: boolean;
  distanceKm: number;
}

export interface StateInfrastructureRow {
  stateName: string;
  region: string;
  districtCount: number;
  network: InfrastructureMetric;
  drainage: InfrastructureMetric;
  communication: InfrastructureMetric;
  power: InfrastructureMetric;
  lastUpdated: string;
  overallVulnerabilityScore: number;
  isEpicenterState: boolean;
  affectedCitiesCount: number;
  cities: CityInfrastructureRow[];
}

export const InfrastructureStatus: React.FC = () => {
  const {
    disasterType,
    epicenterName,
    customRadiusKm,
    activeParams,
  } = useDisasterSimulation();

  // State selection and expanded accordions
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AFFECTED' | 'CRITICAL' | 'POWER_STRESSED' | 'DRAINAGE_STRESSED' | 'HEALTHY'>('ALL');
  const [sortBy, setSortBy] = useState<'vulnerabilityScore' | 'state' | 'power' | 'drainage' | 'network' | 'communication'>('vulnerabilityScore');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  // Manual refresh trigger
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshedAt(new Date());
      setIsRefreshing(false);
    }, 400);
  };

  // Toggle state expansion
  const toggleStateExpand = (stateName: string) => {
    setExpandedStates((prev) => ({
      ...prev,
      [stateName]: !prev[stateName],
    }));
  };

  // Expand / Collapse all
  const expandAll = () => {
    const allExp: Record<string, boolean> = {};
    Object.values(STATE_GEO_CONFIGS).forEach((s) => {
      allExp[s.name] = true;
    });
    setExpandedStates(allExp);
  };

  const collapseAll = () => {
    setExpandedStates({});
  };

  // Generate dynamic state and city infrastructure data synced with active disaster simulation
  const stateDataList: StateInfrastructureRow[] = useMemo(() => {
    const result: StateInfrastructureRow[] = [];

    Object.values(STATE_GEO_CONFIGS).forEach((stateConfig) => {
      const stateName = stateConfig.name;
      const isEpicenterState = epicenterName.toLowerCase().includes(stateName.toLowerCase());
      const cityRows: CityInfrastructureRow[] = [];

      (stateConfig.keyDistricts || []).forEach((cityName, idx) => {
        const distBase = getDistrictBaseline(cityName, stateName);

        // Approximate coordinates around state center
        const latOffset = (idx % 4 - 1.5) * 0.45;
        const lngOffset = (Math.floor(idx / 4) - 1.0) * 0.45;
        const coords: [number, number] = [
          Number((stateConfig.center[0] + lngOffset).toFixed(4)),
          Number((stateConfig.center[1] + latOffset).toFixed(4)),
        ];

        const distData: DistrictData = {
          id: `dist-infra-${stateConfig.id}-${idx}`,
          name: cityName,
          state: stateName,
          coordinates: coords,
          population: distBase.population,
          areaKm2: distBase.areaKm2,
          populationDensity: distBase.populationDensity,
          historicalDamageScore: distBase.historicalDamageScore,
          dependencyRatio: distBase.dependencyRatio,
          povertyIndex: distBase.povertyIndex,
          buildingVulnerability: distBase.buildingVulnerability,
          lifelineProximityScore: distBase.lifelineProximityScore,
          ewsCoverage: distBase.ewsCoverage,
          historicalEvent: distBase.historicalEvent,
          primaryRiskFactor: distBase.primaryRiskFactor,
        };

        const calc = computeZoneVulnerability(distData, activeParams);
        const distanceKm = calc.distanceKm;
        const isInsideImpact = calc.isWithinImpactRadius;

        // Dynamic infrastructure health modeling based on disaster proximity, type, and baseline lifelines
        let netPct = Math.min(99, Math.max(25, Math.round(distBase.lifelineProximityScore * 0.95 + (100 - distBase.povertyIndex) * 0.05)));
        let drainPct = Math.min(99, Math.max(20, Math.round((100 - distBase.historicalDamageScore * 0.7) * 0.9)));
        let commPct = Math.min(99, Math.max(30, Math.round(distBase.ewsCoverage * 0.95 + 4)));
        let powerPct = Math.min(99, Math.max(25, Math.round((100 - distBase.buildingVulnerability * 0.5) * 0.95)));

        // Apply disaster stressors when inside impact radius
        if (isInsideImpact) {
          const impactSeverityFactor = Math.max(0.1, 1 - distanceKm / customRadiusKm); // 0 to 1

          if (disasterType === 'flood') {
            drainPct = Math.max(18, Math.round(drainPct - 48 * impactSeverityFactor));
            netPct = Math.max(25, Math.round(netPct - 38 * impactSeverityFactor));
            powerPct = Math.max(20, Math.round(powerPct - 32 * impactSeverityFactor));
            commPct = Math.max(40, Math.round(commPct - 18 * impactSeverityFactor));
          } else if (disasterType === 'cyclone') {
            commPct = Math.max(15, Math.round(commPct - 52 * impactSeverityFactor));
            powerPct = Math.max(12, Math.round(powerPct - 58 * impactSeverityFactor));
            netPct = Math.max(28, Math.round(netPct - 34 * impactSeverityFactor));
            drainPct = Math.max(30, Math.round(drainPct - 38 * impactSeverityFactor));
          } else if (disasterType === 'heatwave') {
            powerPct = Math.max(25, Math.round(powerPct - 44 * impactSeverityFactor));
            netPct = Math.max(65, Math.round(netPct - 10 * impactSeverityFactor));
            drainPct = Math.max(70, Math.round(drainPct - 5 * impactSeverityFactor));
            commPct = Math.max(75, Math.round(commPct - 8 * impactSeverityFactor));
          }
        }

        // Determine status tags
        const getNetStatus = (p: number): { status: InfrastructureMetric['status']; color: InfrastructureMetric['statusColor'] } => {
          if (p < 40) return { status: 'Critical', color: 'red' };
          if (p < 65) return { status: 'Degraded', color: 'orange' };
          if (p < 85) return { status: 'Stable', color: 'cyan' };
          return { status: 'Normal', color: 'emerald' };
        };

        const getDrainStatus = (p: number): { status: InfrastructureMetric['status']; color: InfrastructureMetric['statusColor'] } => {
          if (p < 40) return { status: 'Clogged', color: 'red' };
          if (p < 65) return { status: 'High Flow', color: 'orange' };
          if (p < 85) return { status: 'Stable', color: 'cyan' };
          return { status: 'Normal', color: 'emerald' };
        };

        const getCommStatus = (p: number): { status: InfrastructureMetric['status']; color: InfrastructureMetric['statusColor'] } => {
          if (p < 40) return { status: 'Failed', color: 'red' };
          if (p < 70) return { status: 'Degraded', color: 'orange' };
          if (p < 88) return { status: 'Stable', color: 'cyan' };
          return { status: 'Optimal', color: 'emerald' };
        };

        const getPowerStatus = (p: number): { status: InfrastructureMetric['status']; color: InfrastructureMetric['statusColor'] } => {
          if (p < 40) return { status: 'Critical', color: 'red' };
          if (p < 68) return { status: 'Degraded', color: 'orange' };
          if (p < 88) return { status: 'Stable', color: 'cyan' };
          return { status: 'Normal', color: 'emerald' };
        };

        const netObj = getNetStatus(netPct);
        const drainObj = getDrainStatus(drainPct);
        const commObj = getCommStatus(commPct);
        const powerObj = getPowerStatus(powerPct);

        // Multi-incident compound vulnerability calculation across all disasters
        const multiIncidentBaseline =
          distBase.floodBase * 0.4 +
          distBase.cycloneBase * 0.3 +
          distBase.heatwaveBase * 0.3;

        const infraDeficitScore =
          (100 - netPct) * 0.25 +
          (100 - drainPct) * 0.35 +
          (100 - powerPct) * 0.25 +
          (100 - commPct) * 0.15;

        const overallCompoundScore = Number(
          Math.min(
            99.5,
            Math.max(
              8.0,
              calc.finalScore * 0.55 +
                multiIncidentBaseline * 0.25 +
                infraDeficitScore * 0.2
            )
          ).toFixed(1)
        );

        // Realistic telemetry sync timestamps
        const timeOffsets = ['Just now', '1 min ago', '2 mins ago', '3 mins ago', '5 mins ago', '8 mins ago'];
        const lastUpdated = timeOffsets[(cityName.length + idx) % timeOffsets.length];

        cityRows.push({
          cityName,
          stateName,
          network: { percentage: netPct, status: netObj.status, statusColor: netObj.color },
          drainage: { percentage: drainPct, status: drainObj.status, statusColor: drainObj.color },
          communication: { percentage: commPct, status: commObj.status, statusColor: commObj.color },
          power: { percentage: powerPct, status: powerObj.status, statusColor: powerObj.color },
          lastUpdated,
          overallVulnerabilityScore: overallCompoundScore,
          primaryRiskFactor: distBase.primaryRiskFactor,
          population: distBase.population,
          isInsideImpact,
          distanceKm: Number(distanceKm.toFixed(1)),
        });
      });

      // Aggregate state averages
      const avgNet = Math.round(
        cityRows.reduce((a, b) => a + b.network.percentage, 0) / cityRows.length
      );
      const avgDrain = Math.round(
        cityRows.reduce((a, b) => a + b.drainage.percentage, 0) / cityRows.length
      );
      const avgComm = Math.round(
        cityRows.reduce((a, b) => a + b.communication.percentage, 0) / cityRows.length
      );
      const avgPower = Math.round(
        cityRows.reduce((a, b) => a + b.power.percentage, 0) / cityRows.length
      );
      const avgOverall = Number(
        (
          cityRows.reduce((a, b) => a + b.overallVulnerabilityScore, 0) / cityRows.length
        ).toFixed(1)
      );

      const affectedCities = cityRows.filter((c) => c.isInsideImpact).length;

      const getAggStatus = (p: number): { status: InfrastructureMetric['status']; color: InfrastructureMetric['statusColor'] } => {
        if (p < 45) return { status: 'Critical', color: 'red' };
        if (p < 68) return { status: 'Degraded', color: 'orange' };
        if (p < 86) return { status: 'Stable', color: 'cyan' };
        return { status: 'Normal', color: 'emerald' };
      };

      const sNet = getAggStatus(avgNet);
      const sDrain = getAggStatus(avgDrain);
      const sComm = getAggStatus(avgComm);
      const sPower = getAggStatus(avgPower);

      result.push({
        stateName,
        region: stateConfig.region,
        districtCount: cityRows.length,
        network: { percentage: avgNet, status: sNet.status, statusColor: sNet.color },
        drainage: { percentage: avgDrain, status: sDrain.status, statusColor: sDrain.color },
        communication: { percentage: avgComm, status: sComm.status, statusColor: sComm.color },
        power: { percentage: avgPower, status: sPower.status, statusColor: sPower.color },
        lastUpdated: isEpicenterState ? 'Just now' : '2 mins ago',
        overallVulnerabilityScore: avgOverall,
        isEpicenterState,
        affectedCitiesCount: affectedCities,
        cities: cityRows,
      });
    });

    return result;
  }, [epicenterName, activeParams, disasterType, customRadiusKm]);

  // Overall India Aggregated Telemetry Summary
  const nationalOverview = useMemo(() => {
    let totalNet = 0;
    let totalDrain = 0;
    let totalComm = 0;
    let totalPower = 0;
    let totalVul = 0;
    let totalDistricts = 0;
    let criticalNodesCount = 0;
    let affectedZonesCount = 0;

    stateDataList.forEach((st) => {
      st.cities.forEach((c) => {
        totalNet += c.network.percentage;
        totalDrain += c.drainage.percentage;
        totalComm += c.communication.percentage;
        totalPower += c.power.percentage;
        totalVul += c.overallVulnerabilityScore;
        totalDistricts++;

        if (c.overallVulnerabilityScore >= 75 || c.power.percentage < 45 || c.drainage.percentage < 45) {
          criticalNodesCount++;
        }
        if (c.isInsideImpact) {
          affectedZonesCount++;
        }
      });
    });

    return {
      avgNetwork: Math.round(totalNet / totalDistricts),
      avgDrainage: Math.round(totalDrain / totalDistricts),
      avgCommunication: Math.round(totalComm / totalDistricts),
      avgPower: Math.round(totalPower / totalDistricts),
      avgVulnerabilityScore: Number((totalVul / totalDistricts).toFixed(1)),
      totalDistricts,
      totalStates: stateDataList.length,
      criticalNodesCount,
      affectedZonesCount,
    };
  }, [stateDataList]);

  // Auto-expand epicenter state on first load / epicenter switch
  useEffect(() => {
    const epiState = stateDataList.find((s) => s.isEpicenterState);
    if (epiState) {
      setExpandedStates((prev) => ({
        ...prev,
        [epiState.stateName]: true,
      }));
    }
  }, [epicenterName, stateDataList]);

  // Filtered and sorted State list
  const filteredStates = useMemo(() => {
    let list = [...stateDataList];

    // Status filter
    if (statusFilter === 'CRITICAL') {
      list = list.filter((s) => s.overallVulnerabilityScore >= 70 || s.power.percentage < 55 || s.drainage.percentage < 55);
    } else if (statusFilter === 'POWER_STRESSED') {
      list = list.filter((s) => s.power.percentage < 65);
    } else if (statusFilter === 'DRAINAGE_STRESSED') {
      list = list.filter((s) => s.drainage.percentage < 65);
    } else if (statusFilter === 'AFFECTED') {
      list = list.filter((s) => s.affectedCitiesCount > 0);
    } else if (statusFilter === 'HEALTHY') {
      list = list.filter((s) => s.overallVulnerabilityScore < 50);
    }

    // Search query filter (matches state name or any city name inside)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.stateName.toLowerCase().includes(q) ||
          s.region.toLowerCase().includes(q) ||
          s.cities.some((c) => c.cityName.toLowerCase().includes(q) || c.primaryRiskFactor.toLowerCase().includes(q))
      );
    }

    // Sorting
    return list.sort((a, b) => {
      // Prioritize affected/epicenter states first when default score sort
      if (sortBy === 'vulnerabilityScore') {
        if (a.isEpicenterState && !b.isEpicenterState) return sortOrder === 'desc' ? -1 : 1;
        if (!a.isEpicenterState && b.isEpicenterState) return sortOrder === 'desc' ? 1 : -1;
        return sortOrder === 'desc'
          ? b.overallVulnerabilityScore - a.overallVulnerabilityScore
          : a.overallVulnerabilityScore - b.overallVulnerabilityScore;
      }
      if (sortBy === 'state') {
        return sortOrder === 'desc' ? b.stateName.localeCompare(a.stateName) : a.stateName.localeCompare(b.stateName);
      }
      if (sortBy === 'power') {
        return sortOrder === 'desc' ? b.power.percentage - a.power.percentage : a.power.percentage - b.power.percentage;
      }
      if (sortBy === 'drainage') {
        return sortOrder === 'desc' ? b.drainage.percentage - a.drainage.percentage : a.drainage.percentage - b.drainage.percentage;
      }
      if (sortBy === 'network') {
        return sortOrder === 'desc' ? b.network.percentage - a.network.percentage : a.network.percentage - b.network.percentage;
      }
      if (sortBy === 'communication') {
        return sortOrder === 'desc' ? b.communication.percentage - a.communication.percentage : a.communication.percentage - b.communication.percentage;
      }
      return 0;
    });
  }, [stateDataList, statusFilter, searchQuery, sortBy, sortOrder]);

  // Color helper for metric percentage badges
  const renderMetricCell = (metric: InfrastructureMetric, labelType: 'network' | 'drainage' | 'comm' | 'power') => {
    const isRed = metric.percentage < 45 || metric.statusColor === 'red';
    const isOrange = (metric.percentage >= 45 && metric.percentage < 68) || metric.statusColor === 'orange';
    const isCyan = (metric.percentage >= 68 && metric.percentage < 88) || metric.statusColor === 'cyan';

    const textClass = isRed
      ? 'text-red-400'
      : isOrange
      ? 'text-orange-400'
      : isCyan
      ? 'text-cyan-400'
      : 'text-emerald-400';

    const barClass = isRed
      ? 'bg-red-500'
      : isOrange
      ? 'bg-orange-500'
      : isCyan
      ? 'bg-cyan-400'
      : 'bg-emerald-400';

    const badgeBg = isRed
      ? 'bg-red-500/15 text-red-300 border-red-500/30'
      : isOrange
      ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
      : isCyan
      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

    return (
      <div className="flex flex-col gap-1.5 min-w-[130px]">
        <div className="flex items-center justify-between gap-1.5">
          <span className={`font-mono font-black text-xs ${textClass}`}>
            {metric.percentage}%
          </span>
          <span className={`text-[10px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badgeBg}`}>
            {metric.status}
          </span>
        </div>
        <div className="w-full bg-[#131d2f] h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barClass}`}
            style={{ width: `${metric.percentage}%` }}
          />
        </div>
      </div>
    );
  };

  // Color helper for overall vulnerability score pill
  const renderVulnerabilityScoreCell = (score: number) => {
    let colorClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    let label = 'LOW';
    let barColor = 'bg-emerald-400';

    if (score >= 80) {
      colorClass = 'bg-red-500/25 text-red-200 border-red-500/50 shadow-sm shadow-red-500/20 font-black';
      label = 'CRITICAL';
      barColor = 'bg-red-500';
    } else if (score >= 65) {
      colorClass = 'bg-orange-500/20 text-orange-200 border-orange-500/40 font-bold';
      label = 'SEVERE';
      barColor = 'bg-orange-500';
    } else if (score >= 45) {
      colorClass = 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-bold';
      label = 'HIGH';
      barColor = 'bg-amber-400';
    } else if (score >= 28) {
      colorClass = 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30';
      label = 'MODERATE';
      barColor = 'bg-cyan-400';
    }

    return (
      <div className="flex flex-col gap-1.5 min-w-[150px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldAlert size={14} className={score >= 65 ? 'text-red-400' : 'text-slate-400'} />
            <span className="font-mono font-black text-xs text-white">
              {score}
            </span>
          </div>
          <span className={`text-[10px] font-sans font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${colorClass}`}>
            {label}
          </span>
        </div>
        <div className="w-full bg-[#131d2f] h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(10, score))}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* 1. OVERALL INDIA HERO HEADER & 4 CORE LIFELINE TELEMETRY GAUGES */}
      <div className="bg-[#090d16] border border-[#172338] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-3xl pointer-events-none rounded-full" />
        
        {/* Top Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#141f32] pb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-lg shadow-blue-500/10">
              <Globe size={26} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black text-slate-100 tracking-tight">
                  Overall India Critical Infrastructure & Lifeline Status
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live C2 Telemetry
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#101b2f] text-blue-300 border border-blue-500/30">
                  {nationalOverview.totalStates} States & UTs • {nationalOverview.totalDistricts} Monitored Cities
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time national telemetry for <strong className="text-slate-300">Transport Network</strong>, <strong className="text-slate-300">Drainage Systems</strong>, <strong className="text-slate-300">Communication Grid</strong>, and <strong className="text-slate-300">Power Grid</strong> synchronized with active disaster simulation (<strong className="text-amber-300">{epicenterName}</strong>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                showLegend
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                  : 'bg-[#0e1726] border-[#1e2d45] text-slate-300 hover:text-white hover:border-slate-500'
              }`}
            >
              <Info size={14} />
              <span>{showLegend ? 'Hide Scoring Guide' : 'Scoring Guide'}</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0e1726] border border-[#1e2d45] text-slate-300 hover:border-slate-500 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-400' : ''} />
              <span>Refresh Telemetry</span>
            </button>

            <div className="px-3 py-2 rounded-xl bg-[#0b1220] border border-[#16233b] text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
              <Clock size={12} className="text-slate-500" />
              <span>Sync: <strong className="text-slate-200">{lastRefreshedAt.toLocaleTimeString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Collapsible Methodology / Scoring Guide */}
        <AnimatePresence>
          {showLegend && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-b border-[#141f32] text-xs text-slate-300 space-y-3"
            >
              <div className="bg-[#0b1220] border border-[#18263e] rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs mb-1">
                    <Truck size={14} className="text-blue-400" />
                    <span>Transport Network</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Evaluates arterial highway clearance, critical road transit routes, and logistics supply corridor connectivity.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs mb-1">
                    <Droplets size={14} className="text-cyan-400" />
                    <span>Drainage Systems</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Measures stormwater pumping station efficiency, canal clearance, and sluice gate discharge capacity during inundation.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs mb-1">
                    <Wifi size={14} className="text-emerald-400" />
                    <span>Communication</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Monitors telecom tower uptime, fiber backhaul integrity, satellite failovers, and Early Warning System (EWS) dissemination reach.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs mb-1">
                    <Zap size={14} className="text-amber-400" />
                    <span>Power Grid</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Tracks high-voltage electrical substation operations, feeder line stability, transformer health, and backup generator reserves.
                  </p>
                </div>
              </div>

              <div className="bg-[#080d19] border border-[#152238] rounded-lg p-3 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
                <span>
                  <strong className="text-slate-200">Overall Vulnerability Score Formula:</strong> 55% Active Disaster Hazard Shock + 25% Multi-Incident Baseline (Floods, Heatwaves, Cyclones) + 20% Compound Infrastructure Deficit.
                </span>
                <span className="font-mono text-slate-500">Scale: 0 (Resilient) — 100 (Critical Failure)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4 Core India Lifelines: Network, Drainage, Communication, Power Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          {/* Card 1: Transport & Logistics Network */}
          <div className="bg-[#0b1220] border border-[#16233b] p-4 rounded-xl relative overflow-hidden group hover:border-[#223554] transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-slate-300">1. Transport Network</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-all">
                <Truck size={17} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-100 font-mono">{nationalOverview.avgNetwork}%</span>
              <span className="text-xs font-bold text-emerald-400">Operational</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              National highway & arterial road connectivity index
            </p>
            <div className="w-full bg-[#131d2f] h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${nationalOverview.avgNetwork}%` }}
              />
            </div>
          </div>

          {/* Card 2: Drainage & Flood Sluice Systems */}
          <div className="bg-[#0b1220] border border-[#16233b] p-4 rounded-xl relative overflow-hidden group hover:border-[#223554] transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-slate-300">2. Drainage System</span>
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-all">
                <Droplets size={17} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-cyan-300 font-mono">{nationalOverview.avgDrainage}%</span>
              <span className="text-xs font-bold text-orange-400">Moderate Flow</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Stormwater discharge clearance & pumping efficiency
            </p>
            <div className="w-full bg-[#131d2f] h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${nationalOverview.avgDrainage}%` }}
              />
            </div>
          </div>

          {/* Card 3: Communications & Telecom Grid */}
          <div className="bg-[#0b1220] border border-[#16233b] p-4 rounded-xl relative overflow-hidden group hover:border-[#223554] transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-slate-300">3. Communication</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                <Wifi size={17} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400 font-mono">{nationalOverview.avgCommunication}%</span>
              <span className="text-xs font-bold text-emerald-400">Optimal</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Cell towers, fiber backhaul & early warning broadcast reach
            </p>
            <div className="w-full bg-[#131d2f] h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${nationalOverview.avgCommunication}%` }}
              />
            </div>
          </div>

          {/* Card 4: Power Grid & Substations */}
          <div className="bg-[#0b1220] border border-[#16233b] p-4 rounded-xl relative overflow-hidden group hover:border-[#223554] transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-slate-300">4. Power Grid</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-all">
                <Zap size={17} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400 font-mono">{nationalOverview.avgPower}%</span>
              <span className="text-xs font-bold text-amber-400">Stable</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Substations operational & transmission grid load capacity
            </p>
            <div className="w-full bg-[#131d2f] h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${nationalOverview.avgPower}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATEWISE INFRASTRUCTURE TABLE & CITY EXPANSION ACCORDION */}
      <div className="bg-[#090d16] border border-[#172338] rounded-2xl shadow-xl overflow-hidden">
        {/* Table Control Header */}
        <div className="p-4 border-b border-[#141f32] bg-[#080d19] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Layers2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>State-Wise & City-Wise Critical Infrastructure Telemetry</span>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono font-bold">
                  {filteredStates.length} of {stateDataList.length} States
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Click on any state row to view detailed city-level infrastructure telemetry with identical indicators
              </p>
            </div>
          </div>

          {/* Search, Filter & Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search state, city, threat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs bg-[#0b1322] border border-[#1c2d47] rounded-lg text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 w-52"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Health Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#0b1322] text-xs font-semibold text-slate-200 border border-[#1c2d47] rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Statuses ({stateDataList.length})</option>
              <option value="AFFECTED">🚨 Disaster Impacted States</option>
              <option value="CRITICAL">⚠️ Critical Lifelines (&lt;50%)</option>
              <option value="POWER_STRESSED">⚡ Power Stressed</option>
              <option value="DRAINAGE_STRESSED">🌊 Drainage Compromised</option>
              <option value="HEALTHY">✅ Healthy & Stable</option>
            </select>

            {/* Sort Field */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0b1322] text-xs font-semibold text-slate-200 border border-[#1c2d47] rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="vulnerabilityScore">Sort: Overall Vulnerability Score</option>
              <option value="state">Sort: State Name</option>
              <option value="power">Sort: Power Grid</option>
              <option value="drainage">Sort: Drainage</option>
              <option value="communication">Sort: Communication</option>
              <option value="network">Sort: Network</option>
            </select>

            {/* Sort Direction */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#0b1322] border border-[#1c2d47] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
              title="Toggle Sort Order"
            >
              <ArrowUpDown size={12} />
              <span>{sortOrder === 'desc' ? 'DESC' : 'ASC'}</span>
            </button>

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-1 border-l border-[#1c2d47] pl-2">
              <button
                onClick={expandAll}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0b1322] border border-[#1c2d47] text-slate-300 hover:text-white hover:border-slate-500 cursor-pointer"
                title="Expand All States"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0b1322] border border-[#1c2d47] text-slate-400 hover:text-white hover:border-slate-500 cursor-pointer"
                title="Collapse All States"
              >
                Collapse
              </button>
            </div>
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header: Columns with Full Form Labels */}
            <thead className="bg-[#0b1220] text-slate-400 uppercase font-mono tracking-wider border-b border-[#16233b] select-none sticky top-0 z-10">
              <tr>
                <th className="py-3.5 px-4 font-bold text-slate-300 w-80">State</th>
                <th className="py-3.5 px-3 font-bold text-slate-300">Network</th>
                <th className="py-3.5 px-3 font-bold text-slate-300">Drainage</th>
                <th className="py-3.5 px-3 font-bold text-slate-300">Communication</th>
                <th className="py-3.5 px-3 font-bold text-slate-300">Power</th>
                <th className="py-3.5 px-3 font-bold text-slate-300">Last Updated</th>
                <th className="py-3.5 px-4 font-bold text-slate-300">Overall Vulnerability Score for All Incidents</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#141f32]">
              {filteredStates.map((stateRow) => {
                const isExpanded = !!expandedStates[stateRow.stateName];

                return (
                  <React.Fragment key={stateRow.stateName}>
                    {/* STATE ROW */}
                    <tr
                      onClick={() => toggleStateExpand(stateRow.stateName)}
                      className={`cursor-pointer transition-all ${
                        isExpanded
                          ? 'bg-[#0e172a] border-l-4 border-l-blue-500 shadow-md'
                          : stateRow.isEpicenterState
                          ? 'bg-[#151121] hover:bg-[#1a1529] border-l-4 border-l-red-500'
                          : 'bg-[#080d19] hover:bg-[#0d1526]'
                      }`}
                    >
                      {/* Column 1: State */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="p-1.5 rounded-md bg-[#142138] text-slate-300 hover:text-white transition-transform cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStateExpand(stateRow.stateName);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown size={15} className="text-blue-400" />
                            ) : (
                              <ChevronRight size={15} />
                            )}
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-slate-100 tracking-tight">
                                {stateRow.stateName}
                              </span>

                              {stateRow.isEpicenterState && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                  EPICENTER
                                </span>
                              )}

                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono text-slate-400 bg-slate-800 border border-slate-700">
                                {stateRow.region}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {stateRow.districtCount} Monitored Cities
                              {stateRow.affectedCitiesCount > 0 && (
                                <span className="text-red-400 font-semibold ml-1.5">
                                  • {stateRow.affectedCitiesCount} inside hazard radius
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Network */}
                      <td className="py-4 px-3">
                        {renderMetricCell(stateRow.network, 'network')}
                      </td>

                      {/* Column 3: Drainage */}
                      <td className="py-4 px-3">
                        {renderMetricCell(stateRow.drainage, 'drainage')}
                      </td>

                      {/* Column 4: Communication */}
                      <td className="py-4 px-3">
                        {renderMetricCell(stateRow.communication, 'comm')}
                      </td>

                      {/* Column 5: Power */}
                      <td className="py-4 px-3">
                        {renderMetricCell(stateRow.power, 'power')}
                      </td>

                      {/* Column 6: Last Updated */}
                      <td className="py-4 px-3 text-slate-400 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-500" />
                          <span>{stateRow.lastUpdated}</span>
                        </div>
                      </td>

                      {/* Column 7: Overall Vulnerability Score for All Incidents */}
                      <td className="py-4 px-4">
                        {renderVulnerabilityScoreCell(stateRow.overallVulnerabilityScore)}
                      </td>
                    </tr>

                    {/* NESTED CITIES TABLE (Appears when State is Clicked) */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-[#060a14] border-b border-[#1b2b45]">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="p-4 pl-8 space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-[#142138] pb-2 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-blue-400" />
                                <span className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                                  Cities & Districts in {stateRow.stateName}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                                  {stateRow.cities.length} Municipal Urban Zones
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                Detailed municipal lifeline telemetry
                              </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-[#142138] bg-[#070d18]">
                              <table className="w-full text-left text-xs border-collapse">
                                {/* City Table Header with IDENTICAL Column Names */}
                                <thead className="bg-[#0b1220] text-slate-400 uppercase font-mono tracking-wider text-[11px] border-b border-[#142138]">
                                  <tr>
                                    <th className="py-3 px-4 font-bold text-slate-300 w-72">City / District</th>
                                    <th className="py-3 px-3 font-bold text-slate-300">Network</th>
                                    <th className="py-3 px-3 font-bold text-slate-300">Drainage</th>
                                    <th className="py-3 px-3 font-bold text-slate-300">Communication</th>
                                    <th className="py-3 px-3 font-bold text-slate-300">Power</th>
                                    <th className="py-3 px-3 font-bold text-slate-300">Last Updated</th>
                                    <th className="py-3 px-4 font-bold text-slate-300">Overall Vulnerability Score for All Incidents</th>
                                  </tr>
                                </thead>

                                <tbody className="divide-y divide-[#101b2f]">
                                  {stateRow.cities.map((city) => (
                                    <tr
                                      key={city.cityName}
                                      className={`hover:bg-[#0d1627] transition-colors ${
                                        city.isInsideImpact ? 'bg-[#14101e]/70' : ''
                                      }`}
                                    >
                                      {/* City Name & Local Threat */}
                                      <td className="py-3 px-4">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-200 text-xs">
                                              {city.cityName}
                                            </span>
                                            {city.isInsideImpact && (
                                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-red-500/30 text-red-300 border border-red-500/40 flex items-center gap-1">
                                                <Navigation size={9} />
                                                <span>{city.distanceKm}km away</span>
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                                            {city.primaryRiskFactor} • Pop: {(city.population / 100000).toFixed(1)}L
                                          </p>
                                        </div>
                                      </td>

                                      {/* City Network */}
                                      <td className="py-3 px-3">
                                        {renderMetricCell(city.network, 'network')}
                                      </td>

                                      {/* City Drainage */}
                                      <td className="py-3 px-3">
                                        {renderMetricCell(city.drainage, 'drainage')}
                                      </td>

                                      {/* City Communication */}
                                      <td className="py-3 px-3">
                                        {renderMetricCell(city.communication, 'comm')}
                                      </td>

                                      {/* City Power */}
                                      <td className="py-3 px-3">
                                        {renderMetricCell(city.power, 'power')}
                                      </td>

                                      {/* City Last Updated */}
                                      <td className="py-3 px-3 text-slate-400 font-mono text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <Clock size={12} className="text-slate-500" />
                                          <span>{city.lastUpdated}</span>
                                        </div>
                                      </td>

                                      {/* City Overall Vulnerability Score */}
                                      <td className="py-3 px-4">
                                        {renderVulnerabilityScoreCell(city.overallVulnerabilityScore)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {filteredStates.length === 0 && (
            <div className="p-12 text-center text-slate-500 text-xs">
              No states or cities matching current search and filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
