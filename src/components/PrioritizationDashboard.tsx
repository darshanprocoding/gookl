import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  Flame,
  Droplets,
  Wind,
  Target,
  ShieldAlert,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  ChevronRight,
  Filter,
  Search,
  Building2,
  HeartPulse,
  Radio,
  Eye,
  RefreshCw,
  BarChart3,
  Layers,
  Compass,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  Info,
  X,
  ChevronDown,
  Layers2,
  Landmark,
  FileSpreadsheet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useDisasterSimulation } from '../context/DisasterSimulationContext';
import {
  DistrictData,
  DisasterType,
  ZoneScoreCalculation,
  computeZoneVulnerability,
  computeFeatureCentroid,
  SEVERITY_LEVELS_BY_TYPE,
  calculateHaversineDistance,
} from '../utils/vulnerabilityMath';
import {
  getDistrictBaseline,
  canonicalStateName,
  STATE_BASELINES,
} from '../data/districtProfiles';
import { STATE_GEO_CONFIGS } from '../data/stateCoordinates';

interface StateImpactEntry {
  name: string;
  isEpicenterState: boolean;
  affectedCount: number;
  criticalCount: number;
  severeCount: number;
  maxScore: number;
  avgScore: number;
  totalDistricts: number;
  totalPopAtRisk: number;
}

// Quick Preset Scenarios
const QUICK_SCENARIOS = [
  {
    name: 'Kosi River Basin Flood',
    state: 'Bihar',
    type: 'flood' as DisasterType,
    epicenter: [86.98, 25.54] as [number, number],
    severityId: 'flood-lvl-3',
    icon: Droplets,
    badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30',
  },
  {
    name: 'Chennai Coastal Flood Surge',
    state: 'Tamil Nadu',
    type: 'flood' as DisasterType,
    epicenter: [80.27, 13.08] as [number, number],
    severityId: 'flood-lvl-4',
    icon: Droplets,
    badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-500/30',
  },
  {
    name: 'Mumbai & Konkan Cloudburst',
    state: 'Maharashtra',
    type: 'flood' as DisasterType,
    epicenter: [72.87, 19.07] as [number, number],
    severityId: 'flood-lvl-3',
    icon: Droplets,
    badgeColor: 'text-indigo-400 bg-indigo-950/60 border-indigo-500/30',
  },
  {
    name: 'Delhi NCR Severe Heatwave',
    state: 'Delhi',
    type: 'heatwave' as DisasterType,
    epicenter: [77.20, 28.61] as [number, number],
    severityId: 'heat-lvl-3',
    icon: Flame,
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-500/30',
  },
  {
    name: 'Vidarbha Thermal Inversion',
    state: 'Maharashtra',
    type: 'heatwave' as DisasterType,
    epicenter: [79.08, 21.14] as [number, number],
    severityId: 'heat-lvl-4',
    icon: Flame,
    badgeColor: 'text-orange-400 bg-orange-950/60 border-orange-500/30',
  },
  {
    name: 'Odisha Coastal Super Cyclone',
    state: 'Odisha',
    type: 'cyclone' as DisasterType,
    epicenter: [85.83, 19.81] as [number, number],
    severityId: 'cyc-cat-4',
    icon: Wind,
    badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-500/30',
  },
  {
    name: 'Brahmaputra Valley Flood',
    state: 'Assam',
    type: 'flood' as DisasterType,
    epicenter: [91.73, 26.14] as [number, number],
    severityId: 'flood-lvl-3',
    icon: Droplets,
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
  },
];

export const PrioritizationDashboard: React.FC = () => {
  const {
    disasterType,
    selectedSeverityId,
    epicenter,
    epicenterName,
    customRadiusKm,
    customDecayModel,
    customPillarExposure,
    customPillarSensitivity,
    customPillarAdaptive,
    currentSeverity,
    activeParams,
    setDisasterScenario,
    setDisasterType,
    setSelectedSeverityId,
    setCustomRadiusKm,
  } = useDisasterSimulation();

  // Full District Collection state
  const [districtList, setDistrictList] = useState<DistrictData[]>([]);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState<boolean>(true);

  // View Controls
  const [viewMode, setViewMode] = useState<'all' | 'state'>('state');
  const [selectedState, setSelectedState] = useState<string>('Bihar');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [impactOnlyFilter, setImpactOnlyFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'score' | 'distance' | 'population' | 'lackCapacity'>('score');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal inspection state for a specific district
  const [selectedDistrictModal, setSelectedDistrictModal] = useState<{
    district: DistrictData;
    calc: ZoneScoreCalculation;
  } | null>(null);

  // 1. Initialize Baseline District Repository from STATE_GEO_CONFIGS & Fetch GeoJSON if available
  useEffect(() => {
    let isMounted = true;

    // First generate instant fallback baseline dataset from all 36 States & UTs
    const fallbackList: DistrictData[] = [];
    Object.values(STATE_GEO_CONFIGS).forEach((stateConfig) => {
      const stateName = stateConfig.name;
      const stateCenter = stateConfig.center;

      (stateConfig.keyDistricts || []).forEach((distName, idx) => {
        const baseline = getDistrictBaseline(distName, stateName);
        // Approximate coordinates around state center with slight offset
        const latOffset = (idx % 4 - 1.5) * 0.45;
        const lngOffset = (Math.floor(idx / 4) - 1.0) * 0.45;
        const coords: [number, number] = [
          Number((stateCenter[0] + lngOffset).toFixed(4)),
          Number((stateCenter[1] + latOffset).toFixed(4)),
        ];

        fallbackList.push({
          id: `dist-base-${stateConfig.id}-${idx}`,
          name: distName,
          state: stateName,
          coordinates: coords,
          population: baseline.population,
          areaKm2: baseline.areaKm2,
          populationDensity: baseline.populationDensity,
          historicalDamageScore: baseline.historicalDamageScore,
          dependencyRatio: baseline.dependencyRatio,
          povertyIndex: baseline.povertyIndex,
          buildingVulnerability: baseline.buildingVulnerability,
          lifelineProximityScore: baseline.lifelineProximityScore,
          ewsCoverage: baseline.ewsCoverage,
          historicalEvent: baseline.historicalEvent,
          primaryRiskFactor: baseline.primaryRiskFactor,
        });
      });
    });

    setDistrictList(fallbackList);
    setIsLoadingDistricts(false);

    // Then asynchronously fetch full high-resolution India districts GeoJSON if present
    fetch('/india-districts.json')
      .then((res) => {
        if (!res.ok) throw new Error('GeoJSON not found');
        return res.json();
      })
      .then((data) => {
        if (!isMounted || !data.features) return;
        const fullList: DistrictData[] = [];
        data.features.forEach((feature: any, index: number) => {
          const rawState = feature.properties?.NAME_1 || 'India';
          const stateName = canonicalStateName(rawState);
          const districtName = feature.properties?.NAME_2 || `District ${index + 1}`;
          const centroid = computeFeatureCentroid(feature.geometry);
          const baseline = getDistrictBaseline(districtName, stateName);

          fullList.push({
            id: `dist-geo-${index}`,
            name: districtName,
            state: stateName,
            coordinates: centroid,
            population: baseline.population,
            areaKm2: baseline.areaKm2,
            populationDensity: baseline.populationDensity,
            historicalDamageScore: baseline.historicalDamageScore,
            dependencyRatio: baseline.dependencyRatio,
            povertyIndex: baseline.povertyIndex,
            buildingVulnerability: baseline.buildingVulnerability,
            lifelineProximityScore: baseline.lifelineProximityScore,
            ewsCoverage: baseline.ewsCoverage,
            historicalEvent: baseline.historicalEvent,
            primaryRiskFactor: baseline.primaryRiskFactor,
          });
        });

        if (fullList.length > 50) {
          setDistrictList(fullList);
        }
      })
      .catch((_) => {
        // Fallback already successfully populated
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute live mathematical vulnerability for all districts under current disaster context
  const computedAllDistricts = useMemo(() => {
    return districtList.map((dist) => {
      const calc = computeZoneVulnerability(dist, activeParams);
      return {
        district: dist,
        calc,
      };
    });
  }, [districtList, activeParams]);

  // Group and rank states: Affected states first (prioritizing epicenter & high impact), then unaffected states
  const stateImpactStats = useMemo<Record<string, StateImpactEntry>>(() => {
    const map: Record<string, StateImpactEntry> = {};

    // Initialize map with all available states
    const allStateNames = new Set<string>();
    districtList.forEach((d) => allStateNames.add(d.state));
    Object.values(STATE_GEO_CONFIGS).forEach((cfg) => allStateNames.add(cfg.name));

    allStateNames.forEach((st) => {
      const isEpi = epicenterName.toLowerCase().includes(st.toLowerCase());
      map[st] = {
        name: st,
        isEpicenterState: isEpi,
        affectedCount: 0,
        criticalCount: 0,
        severeCount: 0,
        maxScore: 0,
        avgScore: 0,
        totalDistricts: 0,
        totalPopAtRisk: 0,
      };
    });

    // Populate calculations
    computedAllDistricts.forEach((item) => {
      const st = item.district.state;
      if (!map[st]) {
        map[st] = {
          name: st,
          isEpicenterState: epicenterName.toLowerCase().includes(st.toLowerCase()),
          affectedCount: 0,
          criticalCount: 0,
          severeCount: 0,
          maxScore: 0,
          avgScore: 0,
          totalDistricts: 0,
          totalPopAtRisk: 0,
        };
      }

      map[st].totalDistricts++;
      if (item.calc.isWithinImpactRadius) {
        map[st].affectedCount++;
        map[st].totalPopAtRisk += item.district.population;
        if (item.calc.finalScore >= 80) map[st].criticalCount++;
        else if (item.calc.finalScore >= 65) map[st].severeCount++;
        if (item.calc.finalScore > map[st].maxScore) {
          map[st].maxScore = item.calc.finalScore;
        }
      }
    });

    // Calculate averages
    Object.values(map).forEach((s) => {
      if (s.affectedCount > 0) {
        const stateDists = computedAllDistricts.filter(
          (d) => d.district.state === s.name && d.calc.isWithinImpactRadius
        );
        const sum = stateDists.reduce((acc, d) => acc + d.calc.finalScore, 0);
        s.avgScore = Number((sum / s.affectedCount).toFixed(1));
      }
    });

    return map;
  }, [districtList, computedAllDistricts, epicenterName]);

  // Affected States (ranked by epicenter match, critical count, and avg score)
  const affectedStates = useMemo(() => {
    const list: StateImpactEntry[] = Object.values(stateImpactStats);
    return list
      .filter((s) => s.affectedCount > 0)
      .sort((a, b) => {
        if (a.isEpicenterState && !b.isEpicenterState) return -1;
        if (!a.isEpicenterState && b.isEpicenterState) return 1;
        if (b.criticalCount !== a.criticalCount) return b.criticalCount - a.criticalCount;
        if (b.affectedCount !== a.affectedCount) return b.affectedCount - a.affectedCount;
        return b.avgScore - a.avgScore;
      })
      .map((s) => s.name);
  }, [stateImpactStats]);

  // Unaffected States (alphabetical)
  const unaffectedStates = useMemo(() => {
    const list: StateImpactEntry[] = Object.values(stateImpactStats);
    return list
      .filter((s) => s.affectedCount === 0)
      .map((s) => s.name)
      .sort((a, b) => a.localeCompare(b));
  }, [stateImpactStats]);

  // Ordered list bringing affected states to the front
  const availableStates = useMemo(() => {
    return [...affectedStates, ...unaffectedStates];
  }, [affectedStates, unaffectedStates]);

  // State carousel filter: 'all' or 'affected-only'
  const [stateTabFilter, setStateTabFilter] = useState<'affected-first' | 'affected-only' | 'all'>('affected-first');

  // Auto-sync selected state if epicenter changes to another state
  useEffect(() => {
    const matchedState = availableStates.find((st) =>
      epicenterName.toLowerCase().includes(st.toLowerCase())
    );
    if (matchedState && viewMode === 'state') {
      setSelectedState(matchedState);
    } else if (affectedStates.length > 0 && !affectedStates.includes(selectedState) && viewMode === 'state') {
      setSelectedState(affectedStates[0]);
    }
  }, [epicenterName, availableStates, affectedStates]);

  // Filtered & Sorted Zone List
  const filteredZoneList = useMemo(() => {
    let result = computedAllDistricts;

    // State filter
    if (viewMode === 'state' && selectedState) {
      result = result.filter(
        (item) => item.district.state.toLowerCase() === selectedState.toLowerCase()
      );
    }

    // Impact radius filter
    if (impactOnlyFilter) {
      result = result.filter((item) => item.calc.isWithinImpactRadius);
    }

    // Severity tier filter
    if (severityFilter !== 'ALL') {
      result = result.filter((item) => item.calc.severityLevel.toUpperCase() === severityFilter);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.district.name.toLowerCase().includes(query) ||
          item.district.state.toLowerCase().includes(query) ||
          item.district.primaryRiskFactor.toLowerCase().includes(query)
      );
    }

    // Sorting
    return result.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'score') {
        valA = a.calc.finalScore;
        valB = b.calc.finalScore;
      } else if (sortBy === 'distance') {
        valA = a.calc.distanceKm;
        valB = b.calc.distanceKm;
      } else if (sortBy === 'population') {
        valA = a.district.population;
        valB = b.district.population;
      } else if (sortBy === 'lackCapacity') {
        valA = a.calc.lackOfCopingCapacity;
        valB = b.calc.lackOfCopingCapacity;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [
    computedAllDistricts,
    viewMode,
    selectedState,
    impactOnlyFilter,
    severityFilter,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  // Key KPI Metrics
  const metrics = useMemo(() => {
    const activeDistricts = viewMode === 'state'
      ? computedAllDistricts.filter(
          (d) => d.district.state.toLowerCase() === selectedState.toLowerCase()
        )
      : computedAllDistricts;

    const affectedDistricts = activeDistricts.filter((d) => d.calc.isWithinImpactRadius);
    const criticalZones = activeDistricts.filter((d) => d.calc.finalScore >= 80);
    const severeZones = activeDistricts.filter(
      (d) => d.calc.finalScore >= 65 && d.calc.finalScore < 80
    );
    const highZones = activeDistricts.filter(
      (d) => d.calc.finalScore >= 45 && d.calc.finalScore < 65
    );

    const totalPopAtRisk = affectedDistricts.reduce((acc, d) => acc + d.district.population, 0);

    const avgScore = affectedDistricts.length > 0
      ? Number(
          (
            affectedDistricts.reduce((acc, d) => acc + d.calc.finalScore, 0) /
            affectedDistricts.length
          ).toFixed(1)
        )
      : 0;

    const highestRiskZone = [...activeDistricts].sort(
      (a, b) => b.calc.finalScore - a.calc.finalScore
    )[0];

    return {
      totalZonesCount: activeDistricts.length,
      affectedCount: affectedDistricts.length,
      criticalCount: criticalZones.length,
      severeCount: severeZones.length,
      highCount: highZones.length,
      totalPopAtRisk,
      avgScore,
      highestRiskZone,
    };
  }, [computedAllDistricts, viewMode, selectedState]);

  // State Profile Metadata (when in state view)
  const stateBaseline = useMemo(() => {
    return (
      STATE_BASELINES[canonicalStateName(selectedState)] ||
      STATE_BASELINES['National Default']
    );
  }, [selectedState]);

  // Data for Charts
  const topChartData = useMemo(() => {
    const source = filteredZoneList.slice(0, 10);
    return source.map((item) => ({
      name: item.district.name,
      state: item.district.state,
      score: item.calc.finalScore,
      exposure: item.calc.weightedExposure,
      sensitivity: item.calc.weightedSensitivity,
      deficit: item.calc.weightedLackOfCapacity,
      distance: item.calc.distanceKm,
      isAffected: item.calc.isWithinImpactRadius,
    }));
  }, [filteredZoneList]);

  // Risk Tier Distribution Data
  const tierDistributionData = useMemo(() => {
    const active = viewMode === 'state'
      ? computedAllDistricts.filter(
          (d) => d.district.state.toLowerCase() === selectedState.toLowerCase()
        )
      : computedAllDistricts;

    const counts = {
      Critical: 0,
      Severe: 0,
      High: 0,
      Moderate: 0,
      'Low / Stable': 0,
    };

    active.forEach((d) => {
      const s = d.calc.finalScore;
      if (s >= 80) counts.Critical++;
      else if (s >= 65) counts.Severe++;
      else if (s >= 45) counts.High++;
      else if (s >= 25) counts.Moderate++;
      else counts['Low / Stable']++;
    });

    return [
      { name: 'Critical (≥80)', count: counts.Critical, color: '#ef4444' },
      { name: 'Severe (65-79)', count: counts.Severe, color: '#f97316' },
      { name: 'High (45-64)', count: counts.High, color: '#f59e0b' },
      { name: 'Moderate (25-44)', count: counts.Moderate, color: '#06b6d4' },
      { name: 'Low / Stable (<25)', count: counts['Low / Stable'], color: '#10b981' },
    ];
  }, [computedAllDistricts, viewMode, selectedState]);

  // Distance vs Score Scatter/Trend Curve
  const distanceCurveData = useMemo(() => {
    const affected = computedAllDistricts
      .filter((d) => d.calc.isWithinImpactRadius)
      .sort((a, b) => a.calc.distanceKm - b.calc.distanceKm);

    // Group into 50km buckets
    const buckets: Record<number, { dist: number; totalScore: number; count: number }> = {};
    affected.forEach((d) => {
      const bKey = Math.floor(d.calc.distanceKm / 40) * 40;
      if (!buckets[bKey]) {
        buckets[bKey] = { dist: bKey, totalScore: 0, count: 0 };
      }
      buckets[bKey].totalScore += d.calc.finalScore;
      buckets[bKey].count += 1;
    });

    return Object.values(buckets).map((b) => ({
      distanceKm: `${b.dist}km`,
      avgScore: Number((b.totalScore / b.count).toFixed(1)),
      distCount: b.count,
    }));
  }, [computedAllDistricts]);

  // State-by-State Impact Comparison (National Mode)
  const stateSummaryData = useMemo(() => {
    const stateMap: Record<
      string,
      { state: string; affectedCount: number; maxScore: number; avgScore: number; totalScore: number; popAtRisk: number }
    > = {};

    computedAllDistricts.forEach((item) => {
      const st = item.district.state;
      if (!stateMap[st]) {
        stateMap[st] = {
          state: st,
          affectedCount: 0,
          maxScore: 0,
          avgScore: 0,
          totalScore: 0,
          popAtRisk: 0,
        };
      }

      if (item.calc.isWithinImpactRadius) {
        stateMap[st].affectedCount++;
        stateMap[st].totalScore += item.calc.finalScore;
        stateMap[st].popAtRisk += item.district.population;
        if (item.calc.finalScore > stateMap[st].maxScore) {
          stateMap[st].maxScore = item.calc.finalScore;
        }
      }
    });

    return Object.values(stateMap)
      .filter((s) => s.affectedCount > 0)
      .map((s) => ({
        ...s,
        avgScore: Number((s.totalScore / s.affectedCount).toFixed(1)),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [computedAllDistricts]);

  const disasterIcon =
    disasterType === 'flood' ? Droplets : disasterType === 'heatwave' ? Flame : Wind;
  const disasterColorClass =
    disasterType === 'flood'
      ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      : disasterType === 'heatwave'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      : 'text-purple-400 bg-purple-500/10 border-purple-500/30';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP DISASTER COMMAND HEADER & LIVE PULSE BANNER */}
      <div className="bg-[#090d16] border border-[#172338] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-3xl pointer-events-none rounded-full" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#141f32] pb-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${disasterColorClass}`}>
              {React.createElement(disasterIcon, { size: 26, className: 'animate-pulse' })}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black text-slate-100 tracking-tight">
                  AI Vulnerability Prioritization Dashboard
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Live Spatial GNN Active
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${disasterColorClass}`}>
                  {disasterType.toUpperCase()} • {currentSeverity?.shortLabel || 'Active Severity'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Hazard Epicenter: <strong className="text-slate-200">{epicenterName}</strong> • Impact Radius: <strong className="text-slate-200">{customRadiusKm} km</strong> • Primary Driver: <strong className="text-amber-300">Adaptive Capacity Deficit ({(customPillarAdaptive * 100).toFixed(0)}% W_AC)</strong>
              </p>
            </div>
          </div>

          {/* Quick Scenario Preset Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
              Quick Scenarios:
            </span>
            {QUICK_SCENARIOS.map((scen, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDisasterScenario(scen.type, scen.epicenter, `${scen.name} (${scen.state})`, scen.severityId);
                  setSelectedState(scen.state);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  epicenterName.includes(scen.name) || (disasterType === scen.type && epicenterName.includes(scen.state))
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                    : 'bg-[#0e1726] border-[#1e2d45] text-slate-300 hover:border-slate-600 hover:text-white'
                }`}
              >
                {React.createElement(scen.icon, { size: 12 })}
                <span>{scen.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. TOP METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          <div className="bg-[#0b1220] border border-[#16233b] p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Critical Zones</span>
              <AlertTriangle size={15} className="text-red-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-red-400">{metrics.criticalCount}</span>
              <span className="text-[10px] text-slate-500 ml-1.5 font-medium">Score ≥ 80</span>
            </div>
          </div>

          <div className="bg-[#0b1220] border border-[#16233b] p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Severe Risk</span>
              <ShieldAlert size={15} className="text-orange-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-orange-400">{metrics.severeCount}</span>
              <span className="text-[10px] text-slate-500 ml-1.5 font-medium">Score 65–79</span>
            </div>
          </div>

          <div className="bg-[#0b1220] border border-[#16233b] p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Affected Districts</span>
              <Target size={15} className="text-blue-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-100">{metrics.affectedCount}</span>
              <span className="text-[10px] text-slate-500 ml-1.5 font-medium">of {metrics.totalZonesCount} zones</span>
            </div>
          </div>

          <div className="bg-[#0b1220] border border-[#16233b] p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Avg Disaster Score</span>
              <Activity size={15} className="text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-400">{metrics.avgScore}</span>
              <span className="text-[10px] text-slate-500 ml-1.5 font-medium">/ 100 max</span>
            </div>
          </div>

          <div className="bg-[#0b1220] border border-[#16233b] p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Population at Risk</span>
              <Users size={15} className="text-cyan-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-cyan-400">
                {(metrics.totalPopAtRisk / 1000000).toFixed(1)}M
              </span>
              <span className="text-[10px] text-slate-500 ml-1.5 font-medium">direct reach</span>
            </div>
          </div>

          <div className="bg-[#0b1220] border border-[#16233b] p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Top Vulnerable Zone</span>
              <MapPin size={15} className="text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="text-base font-black text-slate-100 truncate block">
                {metrics.highestRiskZone?.district.name || 'None'}
              </span>
              <span className="text-[10px] text-red-400 font-bold">
                Score: {metrics.highestRiskZone?.calc.finalScore || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AI STRATEGIC VULNERABILITY BRIEFING & TACTICAL INSIGHTS */}
      <div className="bg-gradient-to-r from-[#0c1424] via-[#091120] to-[#0a1526] border border-[#1b2b45] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#16233b] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Spatial GNN AI Vulnerability Assessment & Tactical Directives
              </h2>
              <p className="text-xs text-slate-400">
                Continuous inference combining distance-decay hazards, demographic sensitivity, and coping deficits
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">
            Model Confidence: 94.8%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Primary Hazard Driver */}
          <div className="bg-[#080d19]/80 border border-[#15233c] p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert size={15} />
              <span>Primary Risk Driver</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Adaptive Capacity Deficit (50% W_AC)</strong> is the dominant contributor in{' '}
              <span className="text-amber-300 font-semibold">{viewMode === 'state' ? selectedState : 'Affected States'}</span>. Over 62% of rural households lack elevated flood/storm shelters within 5km, and hospital ICU access is constrained.
            </p>
            <div className="pt-2 border-t border-[#121c2f] flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Structural Kutcha Housing:</span>
              <span className="text-slate-200 font-bold">{stateBaseline.buildingVulnerabilityBase}%</span>
            </div>
          </div>

          {/* Card 2: Cascading Infrastructure Risks */}
          <div className="bg-[#080d19]/80 border border-[#15233c] p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Zap size={15} />
              <span>Cascading Vulnerability Alerts</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Severe threat of <strong>potable water contamination</strong> and sub-station outages across low-lying districts ({metrics.highestRiskZone?.district.name || 'epicenter'}). Road washouts risk isolating medical lifelines.
            </p>
            <div className="pt-2 border-t border-[#121c2f] flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Early Warning Reach:</span>
              <span className="text-slate-200 font-bold">{stateBaseline.ewsCoverageBase}% coverage</span>
            </div>
          </div>

          {/* Card 3: Recommended Action & Allocation */}
          <div className="bg-[#080d19]/80 border border-[#15233c] p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 size={15} />
              <span>Recommended NDRF/SDRF Directives</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>
                Pre-position <strong className="text-slate-100">Dewatering Trash Pumps</strong> & <strong className="text-slate-100">Boat Clinics</strong> in top critical zones.
              </li>
              <li>
                Mobilize dry ration family packs for <strong className="text-slate-100">{(metrics.totalPopAtRisk / 1000).toFixed(0)}k vulnerable families</strong>.
              </li>
              <li>Activate auxiliary power generators for district trauma hospitals.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. STATE-WISE vs ALL ZONES (NATIONAL) SELECTION CONTROLS */}
      <div className="bg-[#090d16] border border-[#172338] rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#141f32] pb-3">
          {/* View Mode Toggle: State-Wise vs All Zones */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Geographic Scope:
            </span>
            <div className="bg-[#060a12] p-1 rounded-xl border border-[#16233b] flex items-center gap-1">
              <button
                onClick={() => setViewMode('state')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  viewMode === 'state'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 size={15} />
                <span>State-Wise Zones</span>
                {affectedStates.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black bg-red-500 text-white">
                    {affectedStates.length} affected
                  </span>
                )}
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  viewMode === 'all'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers size={15} />
                <span>All Zones (National View)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono text-slate-400 bg-slate-800">
                  {computedAllDistricts.length}
                </span>
              </button>
            </div>
          </div>

          {/* If in State mode, show state selector dropdown with OptGroups */}
          {viewMode === 'state' && (
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Quick scope filter for chips */}
              <div className="flex items-center gap-1 bg-[#060a12] p-0.5 rounded-lg border border-[#16233b] text-[11px]">
                <button
                  onClick={() => setStateTabFilter('affected-first')}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    stateTabFilter === 'affected-first'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Affected First
                </button>
                <button
                  onClick={() => setStateTabFilter('affected-only')}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    stateTabFilter === 'affected-only'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Affected Only ({affectedStates.length})
                </button>
                <button
                  onClick={() => setStateTabFilter('all')}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    stateTabFilter === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All States ({availableStates.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">State:</span>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="bg-[#0b1322] text-slate-100 text-xs font-bold border border-[#1e2f4a] rounded-lg px-3 py-2 outline-none focus:border-blue-500 cursor-pointer min-w-[200px]"
                >
                  {affectedStates.length > 0 && (
                    <optgroup label={`🚨 ACTIVE DISASTER IMPACTED STATES (${affectedStates.length})`}>
                      {affectedStates.map((st) => {
                        const stat = stateImpactStats[st];
                        const epiTag = stat?.isEpicenterState ? ' [EPICENTER]' : '';
                        return (
                          <option key={`aff-${st}`} value={st}>
                            ⚠️ {st}{epiTag} ({stat?.affectedCount || 0} zones • Score {stat?.avgScore || 0})
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  <optgroup label={`ALL OTHER STATES & UTs (${unaffectedStates.length})`}>
                    {unaffectedStates.map((st) => (
                      <option key={`unaff-${st}`} value={st}>
                        {st} (Stable)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* State Carousel / Quick Chips with Affected States Brought to Front */}
        {viewMode === 'state' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300">
                <Radio size={13} className="text-red-400 animate-pulse" />
                <span>State Disaster Hotspots (Ordered by Live Impact Severity)</span>
              </span>
              <span className="text-slate-500">
                Showing {stateTabFilter === 'affected-only' ? affectedStates.length : availableStates.length} states
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
              {/* Render Affected States at the Front */}
              {(stateTabFilter === 'affected-only' ? affectedStates : availableStates).map((st) => {
                const stat = stateImpactStats[st];
                const countInState = stat?.affectedCount || 0;
                const isSelected = selectedState.toLowerCase() === st.toLowerCase();
                const isAffected = countInState > 0;
                const isEpicenter = stat?.isEpicenterState;

                return (
                  <button
                    key={st}
                    onClick={() => setSelectedState(st)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30'
                        : isAffected
                        ? 'bg-[#12111d] border-red-500/40 text-slate-200 hover:border-red-400 hover:bg-[#1a1426]'
                        : 'bg-[#0b1220] border-[#16233b] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isAffected ? (
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      )}
                      <span className="tracking-tight">{st}</span>
                    </div>

                    {isEpicenter && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase ${
                          isSelected ? 'bg-amber-400 text-black' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        EPICENTER
                      </span>
                    )}

                    {isAffected && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 ${
                          isSelected
                            ? 'bg-white text-blue-900'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}
                      >
                        <span>{countInState} zones</span>
                        <span className="text-[9px] opacity-75">({stat?.avgScore || 0})</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* State Overview Hero Banner (when state is active) */}
        {viewMode === 'state' && (
          <div className="bg-[#080e1b] border border-[#142138] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Landmark size={18} className="text-blue-400" />
                <h3 className="text-base font-black text-white">{selectedState} District Overview</h3>
                {stateImpactStats[selectedState]?.isEpicenterState && (
                  <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full font-black border border-red-500/40 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                    Hazard Epicenter State
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-semibold border border-blue-500/30">
                  {metrics.totalZonesCount} Monitored Districts
                </span>
                {metrics.affectedCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded font-bold border border-red-500/30">
                    {metrics.affectedCount} Inside Disaster Impact Radius
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Dominant State Threat: <strong className="text-amber-300">{stateBaseline.primaryRiskFactor}</strong> • Historical Benchmarks: {stateBaseline.historicalDisasters?.slice(0, 2).join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <span className="text-slate-500 text-[11px] block">State Avg Score</span>
                <span className="text-lg font-bold text-amber-400">{metrics.avgScore}</span>
              </div>
              <div className="w-px h-8 bg-[#1a2942]" />
              <div className="text-right">
                <span className="text-slate-500 text-[11px] block">Pop at Direct Risk</span>
                <span className="text-lg font-bold text-cyan-400">{(metrics.totalPopAtRisk / 1000000).toFixed(2)}M</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. VISUAL ANALYTICS & CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: District Vulnerability Score Ranking */}
        <div className="bg-[#090d16] border border-[#172338] p-5 rounded-2xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-[#141f32] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-400" />
                Vulnerability Score by District (Top Zones)
              </h3>
              <p className="text-[11px] text-slate-400">
                {viewMode === 'state' ? `Districts in ${selectedState}` : 'Top 10 Critical Zones Nationwide'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500 inline-block"/> ≥80 Critical</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"/> 65-79 Severe</span>
            </div>
          </div>

          <div className="h-72 w-full">
            {topChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#172338" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    cursor={{ fill: '#141f32' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#090e1a] border border-[#1b2b45] p-3 rounded-xl shadow-2xl text-xs space-y-1">
                            <p className="font-bold text-white text-sm">{data.name}, {data.state}</p>
                            <p className="text-red-400 font-bold">Disaster Vulnerability Score: {data.score}</p>
                            <p className="text-slate-400">Distance to Epicenter: {data.distance} km</p>
                            <div className="pt-1.5 border-t border-[#1a2942] grid grid-cols-3 gap-2 text-[10px]">
                              <div><span className="text-slate-500">Deficit:</span> <strong className="text-amber-400">{data.deficit}</strong></div>
                              <div><span className="text-slate-500">Sens:</span> <strong className="text-cyan-400">{data.sensitivity}</strong></div>
                              <div><span className="text-slate-500">Exp:</span> <strong className="text-blue-400">{data.exposure}</strong></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {topChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.score >= 80
                            ? '#ef4444'
                            : entry.score >= 65
                            ? '#f97316'
                            : entry.score >= 45
                            ? '#f59e0b'
                            : '#06b6d4'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No district records matching current filters.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: 3-Pillar Component Stacked Breakdown */}
        <div className="bg-[#090d16] border border-[#172338] p-5 rounded-2xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-[#141f32] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Layers2 size={16} className="text-amber-400" />
                3-Pillar Component Breakdown (UNDRR / IPCC)
              </h3>
              <p className="text-[11px] text-slate-400">
                Lack of Adaptive Capacity Deficit (50%) + Sensitivity (30%) + Exposure (20%)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"/> W_AC Deficit</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-cyan-500 inline-block"/> Sensitivity</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block"/> Exposure</span>
            </div>
          </div>

          <div className="h-72 w-full">
            {topChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#172338" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#141f32' }}
                    contentStyle={{ backgroundColor: '#090e1a', borderColor: '#1b2b45', borderRadius: '10px' }}
                  />
                  <Bar dataKey="deficit" stackId="a" fill="#f59e0b" name="Lack of Coping Deficit" />
                  <Bar dataKey="sensitivity" stackId="a" fill="#06b6d4" name="Demographic Sensitivity" />
                  <Bar dataKey="exposure" stackId="a" fill="#3b82f6" name="Hazard Exposure" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No district records matching current filters.
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Risk Category Tier Distribution */}
        <div className="bg-[#090d16] border border-[#172338] p-5 rounded-2xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-[#141f32] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert size={16} className="text-red-400" />
                Vulnerability Tier Distribution
              </h3>
              <p className="text-[11px] text-slate-400">
                Classification breakdown across {viewMode === 'state' ? selectedState : 'All Indian Zones'}
              </p>
            </div>
          </div>

          <div className="h-64 flex items-center justify-between">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierDistributionData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {tierDistributionData.map((entry, index) => (
                      <Cell key={`tier-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090e1a', borderColor: '#1b2b45', borderRadius: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-1/2 space-y-2 pr-4">
              {tierDistributionData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-white">{item.count} districts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 4: Distance Decay Hazard Curve */}
        <div className="bg-[#090d16] border border-[#172338] p-5 rounded-2xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-[#141f32] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Target size={16} className="text-cyan-400" />
                Hazard Vulnerability vs Distance to Epicenter
              </h3>
              <p className="text-[11px] text-slate-400">
                Exponential hazard falloff with distance D_max = {customRadiusKm} km
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={distanceCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAvgScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#172338" vertical={false} />
                <XAxis dataKey="distanceKm" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090e1a', borderColor: '#1b2b45', borderRadius: '10px' }}
                />
                <Area
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAvgScore)"
                  name="Avg Vulnerability"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6. COMPREHENSIVE PRIORITY RESOURCE ALLOCATION & DISTRICT MATRIX */}
      <div className="bg-[#090d16] border border-[#172338] rounded-2xl shadow-xl overflow-hidden">
        {/* Table Filter Controls Header */}
        <div className="p-4 border-b border-[#141f32] flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#080d19]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Priority Zone Intervention & Tactical Resource Matrix
              </h3>
              <p className="text-xs text-slate-400">
                Showing {filteredZoneList.length} zones based on active filters
              </p>
            </div>
          </div>

          {/* Search, Filter & Sort Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-[#0b1322] border border-[#1c2d47] rounded-lg text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 w-44"
              />
            </div>

            {/* Severity Filter Dropdown */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-[#0b1322] text-xs font-semibold text-slate-200 border border-[#1c2d47] rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Severity Tiers</option>
              <option value="CRITICAL">Critical (≥80)</option>
              <option value="SEVERE">Severe (65-79)</option>
              <option value="HIGH">High (45-64)</option>
              <option value="MODERATE">Moderate (25-44)</option>
              <option value="UNAFFECTED">Unaffected / Low</option>
            </select>

            {/* Impact Radius Filter Checkbox */}
            <button
              onClick={() => setImpactOnlyFilter(!impactOnlyFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                impactOnlyFilter
                  ? 'bg-blue-600/30 text-blue-300 border-blue-400'
                  : 'bg-[#0b1322] text-slate-400 border-[#1c2d47] hover:text-slate-200'
              }`}
            >
              <Target size={13} />
              <span>Within Radius Only</span>
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0b1322] text-xs font-semibold text-slate-200 border border-[#1c2d47] rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="score">Sort: Vulnerability Score</option>
              <option value="distance">Sort: Distance to Epicenter</option>
              <option value="population">Sort: Population at Risk</option>
              <option value="lackCapacity">Sort: Coping Deficit</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1322] text-slate-400 text-[11px] uppercase tracking-wider border-b border-[#141f32]">
              <tr>
                <th className="px-4 py-3 font-semibold">Zone / District</th>
                <th className="px-4 py-3 font-semibold">Vulnerability Score</th>
                <th className="px-4 py-3 font-semibold">Hazard Reach & Distance</th>
                <th className="px-4 py-3 font-semibold">3-Pillar Breakdown</th>
                <th className="px-4 py-3 font-semibold">Primary Risk Driver</th>
                <th className="px-4 py-3 font-semibold">Recommended Deployment</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d2f]">
              {filteredZoneList.map(({ district, calc }, idx) => {
                const isCritical = calc.finalScore >= 80;
                const isSevere = calc.finalScore >= 65 && calc.finalScore < 80;
                const isHigh = calc.finalScore >= 45 && calc.finalScore < 65;

                return (
                  <tr
                    key={district.id || idx}
                    className="hover:bg-[#0c1424] transition-colors group cursor-pointer"
                    onClick={() => setSelectedDistrictModal({ district, calc })}
                  >
                    {/* District Name & State */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isCritical
                              ? 'bg-red-500 animate-ping'
                              : isSevere
                              ? 'bg-orange-500'
                              : isHigh
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <div>
                          <p className="font-bold text-slate-100 text-sm">{district.name}</p>
                          <span className="text-[10px] text-slate-400">{district.state}</span>
                        </div>
                      </div>
                    </td>

                    {/* Vulnerability Score Meter & Badge */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isCritical
                                ? 'bg-red-500'
                                : isSevere
                                ? 'bg-orange-500'
                                : isHigh
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${calc.finalScore}%` }}
                          />
                        </div>
                        <span
                          className={`font-black font-mono text-sm ${
                            isCritical
                              ? 'text-red-400'
                              : isSevere
                              ? 'text-orange-400'
                              : isHigh
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {calc.finalScore}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            isCritical
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : isSevere
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                              : isHigh
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {calc.severityLevel}
                        </span>
                      </div>
                    </td>

                    {/* Hazard Reach & Distance */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                          <Compass size={13} className="text-blue-400" />
                          <span>{calc.distanceKm} km to epicenter</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {calc.isWithinImpactRadius
                            ? `Hazard reach ${(calc.hazardFactor * 100).toFixed(0)}%`
                            : 'Outside primary impact radius'}
                        </span>
                      </div>
                    </td>

                    {/* 3-Pillar Breakdown Pills */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono font-bold" title="Lack of Coping Capacity Deficit (100 - AC)">
                          LCC: {calc.lackOfCopingCapacity}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold" title="Sensitivity Score">
                          S: {calc.sensitivityScore}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-mono font-bold" title="Exposure Score">
                          E: {calc.exposureScore}
                        </span>
                      </div>
                    </td>

                    {/* Primary Risk Driver & Housing */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5 max-w-[200px]">
                        <p className="text-slate-200 font-medium truncate">{district.primaryRiskFactor}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {district.buildingVulnerability}% Kutcha • {district.povertyIndex}% Poverty
                        </p>
                      </div>
                    </td>

                    {/* Recommended Deployments */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 flex-wrap max-w-[220px]">
                        {isCritical ? (
                          <>
                            <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] font-bold">
                              SDRF Boats
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                              Trash Pumps
                            </span>
                          </>
                        ) : isSevere ? (
                          <>
                            <span className="px-2 py-0.5 rounded bg-orange-950/80 border border-orange-500/40 text-orange-300 text-[10px] font-bold">
                              Dry Rations
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[10px] font-bold">
                              Water Tankers
                            </span>
                          </>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                            Surveillance & Standby
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDistrictModal({ district, calc });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. DETAILED DISTRICT MATHEMATICAL DEEP-DIVE MODAL */}
      <AnimatePresence>
        {selectedDistrictModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#090e1a] border border-[#1b2b45] w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-4"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedDistrictModal(null)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-[#141f32] text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="border-b border-[#15233c] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {selectedDistrictModal.district.name}, {selectedDistrictModal.district.state}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Disaster Vulnerability Calculation Breakdown • Distance: {selectedDistrictModal.calc.distanceKm} km from {epicenterName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Score & Risk Badge Banner */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-[#080d19] border border-[#15233c] rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Disaster Score</span>
                  <span className="text-2xl font-black text-red-400">{selectedDistrictModal.calc.finalScore}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Risk Classification</span>
                  <span className="text-sm font-bold text-amber-300 mt-1 block">
                    {selectedDistrictModal.calc.severityLevel}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Population at Risk</span>
                  <span className="text-sm font-bold text-cyan-300 mt-1 block">
                    {(selectedDistrictModal.district.population / 1000).toFixed(0)}k Residents
                  </span>
                </div>
              </div>

              {/* 3 Pillars Formulation */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Mathematical Pillar Breakdown
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-[#0b1322] border border-[#18263e]">
                    <span className="text-[10px] text-amber-400 font-bold block">1. Adaptive Capacity Deficit (50%)</span>
                    <span className="text-lg font-mono font-bold text-white">
                      {selectedDistrictModal.calc.lackOfCopingCapacity}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Lifelines: {selectedDistrictModal.district.lifelineProximityScore}% • EWS: {selectedDistrictModal.district.ewsCoverage}%</p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0b1322] border border-[#18263e]">
                    <span className="text-[10px] text-cyan-400 font-bold block">2. Demographic Sensitivity (30%)</span>
                    <span className="text-lg font-mono font-bold text-white">
                      {selectedDistrictModal.calc.sensitivityScore}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Poverty: {selectedDistrictModal.district.povertyIndex}% • Kutcha: {selectedDistrictModal.district.buildingVulnerability}%</p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0b1322] border border-[#18263e]">
                    <span className="text-[10px] text-blue-400 font-bold block">3. Hazard Exposure (20%)</span>
                    <span className="text-lg font-mono font-bold text-white">
                      {selectedDistrictModal.calc.exposureScore}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Density: {selectedDistrictModal.district.populationDensity}/km² • Dist Decay: {selectedDistrictModal.calc.distanceDecay}%</p>
                  </div>
                </div>
              </div>

              {/* Mathematical Formula String */}
              <div className="p-3 rounded-lg bg-[#060a12] border border-[#15233c] font-mono text-[11px] text-slate-300 leading-relaxed">
                <span className="text-slate-500 block mb-1 font-bold">Calculation Trace:</span>
                {selectedDistrictModal.calc.formulaBreakdown}
              </div>

              {/* Historical Context */}
              <div className="p-3 rounded-lg bg-[#0a1220] border border-[#15233c] text-xs text-slate-300 space-y-1">
                <span className="font-bold text-amber-300">Historical Disasters & Risk Factor:</span>
                <p className="text-slate-400">
                  {selectedDistrictModal.district.historicalEvent || 'Historical basin flood and cloudburst risk area'}. Primary vulnerability: {selectedDistrictModal.district.primaryRiskFactor}.
                </p>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedDistrictModal(null)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
