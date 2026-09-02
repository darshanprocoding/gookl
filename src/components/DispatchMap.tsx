import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, ScatterplotLayer, LineLayer, IconLayer, TextLayer } from '@deck.gl/layers';
import { Map as MapGL } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import { FlyToInterpolator } from '@deck.gl/core';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Truck,
  Package,
  Ship,
  Zap,
  Droplets,
  Gauge,
  Tent,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  SlidersHorizontal,
  Layers,
  Compass,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Radio,
  Send,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Navigation,
  X,
  Crosshair,
  ArrowRight,
  HeartPulse,
  Activity,
  Maximize2,
  Minimize2,
  Info,
  Flame,
  Wind,
  Waves,
  Plus,
  Trash2,
  HelpCircle,
  FileText,
  CheckCheck,
  Check,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { getUnitMapIconUrl } from '../utils/mapUnitIcons';

import {
  STATE_RESOURCE_DATA,
  RESOURCE_CATEGORIES,
  StateResourceProfile,
} from '../data/stateResourceData';
import { STATE_GEO_CONFIGS, getStateGeoConfig } from '../data/stateCoordinates';
import {
  WAREHOUSE_FACILITIES,
  WarehouseFacility,
  findNearestWarehouse,
  getWarehousesForState,
  calculateDistanceKm,
} from '../data/warehouseData';
import {
  computeFeatureCentroid,
  computeZoneVulnerability,
  ZoneScoreCalculation,
  DisasterType,
  DISASTER_PRESETS,
  SEVERITY_LEVELS_BY_TYPE,
} from '../utils/vulnerabilityMath';
import {
  getDistrictBaseline,
  calculateDistrictVulnerabilityProfile,
  calculateStateVulnerabilityScore,
  canonicalStateName,
  isStateMatch,
  DistrictVulnerabilityProfile,
} from '../data/districtProfiles';
import { useDisasterSimulation, mapToResourceKey } from '../context/DisasterSimulationContext';
import { useTranslation } from '../context/LanguageContext';
import {
  UnitIcon3D,
  DISPATCH_UNITS,
  DispatchUnitType,
  getUnitInfo,
  DISPATCH_PRESET_BUNDLES,
  PresetDispatchBundle,
  DISPATCH_RESOURCE_CATALOG,
  getResourceDisplayName,
  getResourceShortName,
  getResourceDefaultUnitType,
} from './DispatchUnitIcons';

export interface DispatchResourceItem {
  id: string;
  resourceType: string;
  quantity: number;
  unitLabel: string;
  unitType?: DispatchUnitType;
}

export interface DispatchArrivalReport {
  arrivedAt: string;
  transitDurationMinutes: number;
  deliveredSummary: string;
  beneficiariesServed: number;
  vulnerabilityReductionPct: number;
  fieldCommanderNotes: string;
  localDeploymentStatus: string;
}

export interface DispatchMission {
  id: string;
  stateId: string;
  targetDistrict: string;
  targetCoords: [number, number];
  originDepot: string;
  originCoords: [number, number];
  // Multi-resource items in this convoy/airlift
  items: DispatchResourceItem[];
  // Primary Lead Unit Type (for 3D avatar & transport performance)
  unitType: DispatchUnitType;
  transportMode: 'Green Road Corridor' | 'Waterway Fleet / Boat' | 'High-Mobility 4x4' | 'IAF Airlift';
  status: 'In Transit' | 'Staged' | 'Arrived & Active';
  progress: number; // 0 to 100
  etaMinutes: number;
  priority: 'CRITICAL' | 'HIGH' | 'ROUTINE';
  dispatchedAt: string;
  arrivedAt?: string;
  arrivalReport?: DispatchArrivalReport;
}

// Empty by default - dispatches are authorized on-demand by the operator
const INITIAL_DISPATCHES: DispatchMission[] = [];

const REGIONS = ['All', 'North', 'North-East', 'East', 'West', 'South', 'Central'];

// Helper to calculate RGB color based on vulnerability score
function getVulnerabilityColor(score: number): [number, number, number] {
  if (score >= 72) return [239, 68, 68]; // Critical - Red
  if (score >= 55) return [249, 115, 22]; // High - Orange
  if (score >= 42) return [245, 158, 11]; // Moderate - Amber
  return [16, 185, 129]; // Low - Emerald
}

export const DispatchMap: React.FC = () => {
  const { t, currentLanguage } = useTranslation();
  // State Selection & Dropdown State
  const [selectedStateId, setSelectedStateId] = useState<string>('bihar');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isDisasterDropdownOpen, setIsDisasterDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const disasterDropdownRef = useRef<HTMLDivElement>(null);

  // Shared Disaster Simulation Context (synced across Vulnerability Map & Dispatch Map)
  const {
    disasterType,
    selectedSeverityId,
    epicenter,
    epicenterName,
    customRadiusKm,
    currentSeverity,
    activeParams,
    getZoneColor,
    getZoneRGB,
    statesData,
    dispatches,
    setDispatches,
    validateDispatch,
    dispatchMission,
    cancelDispatch,
    updateDispatchProgress,
    setDisasterScenario,
    setDisasterType,
    setSelectedSeverityId,
    setEpicenter,
    setEpicenterName,
  } = useDisasterSimulation();

  // GeoJSON dataset
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selected State Profile & Config (derived from live statesData)
  const selectedStateProfile = useMemo(() => {
    return statesData.find((s) => s.id === selectedStateId) || statesData[0] || STATE_RESOURCE_DATA[0];
  }, [statesData, selectedStateId]);

  const stateGeoConfig = useMemo(() => {
    return getStateGeoConfig(selectedStateId);
  }, [selectedStateId]);

  // View State for DeckGL with smooth fly-to transition
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [viewState, setViewState] = useState({
    longitude: stateGeoConfig.center[0],
    latitude: stateGeoConfig.center[1],
    zoom: stateGeoConfig.zoom,
    pitch: is3DMode ? 28 : 0,
    bearing: 0,
  });

  // Selected District within State
  const [selectedDistrictProps, setSelectedDistrictProps] = useState<any | null>(null);

  // Selected Warehouse Facility
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseFacility | null>(null);

  // Modal and Panel UI States
  const [showNewDispatchModal, setShowNewDispatchModal] = useState<boolean>(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [activeLeftTab, setActiveLeftTab] = useState<'inventory' | 'dispatches'>('inventory');

  // State Warehouses from National Dataset of 68 Relief Facilities
  const stateWarehouses = useMemo(() => {
    return getWarehousesForState(selectedStateId);
  }, [selectedStateId]);

  // Multi-Resource Manifest and Dispatch Form State
  const [selectedOriginWarehouseId, setSelectedOriginWarehouseId] = useState<string>('');
  const [newTargetDistrict, setNewTargetDistrict] = useState<string>('');
  const [selectedLeadUnit, setSelectedLeadUnit] = useState<DispatchUnitType>('cargoTruck');
  const [newTransportMode, setNewTransportMode] = useState<DispatchMission['transportMode']>('Green Road Corridor');
  const [newPriority, setNewPriority] = useState<DispatchMission['priority']>('CRITICAL');

  // Multi-item payload manifest for creating new dispatches
  const [manifestItems, setManifestItems] = useState<DispatchResourceItem[]>([
    { id: 'm-1', resourceType: 'ambulance', quantity: 4, unitLabel: 'ALS Advanced Trauma Ambulances', unitType: 'ambulance' },
    { id: 'm-2', resourceType: 'rationPackets', quantity: 5000, unitLabel: 'Family Food Ration Packets', unitType: 'cargoTruck' },
    { id: 'm-3', resourceType: 'tarpTentKits', quantity: 2000, unitLabel: 'Weatherproof Disaster Tents & Tarps', unitType: 'cargoTruck' },
  ]);

  // Temporary builder fields for adding individual items to manifest
  const [itemToAddCategory, setItemToAddCategory] = useState<string>('rationPackets');
  const [itemToAddQty, setItemToAddQty] = useState<number>(5000);

  // Simulation Controls & Arrival Notification State
  const [arrivedNotificationMission, setArrivedNotificationMission] = useState<DispatchMission | null>(null);
  const [selectedReachedMission, setSelectedReachedMission] = useState<DispatchMission | null>(null);

  // Helper to construct realistic arrival SitRep telemetry
  const computeArrivalReport = (mission: DispatchMission): DispatchArrivalReport => {
    const items = mission.items || [];
    const deliveredSummary = items.length > 0
      ? items.map((it) => `${it.quantity.toLocaleString()} ${it.unitLabel}`).join(', ')
      : 'Emergency relief supplies & operational crew';

    let totalBeneficiaries = 0;
    items.forEach((it) => {
      const q = it.quantity || 1;
      if (it.unitType === 'ambulance') totalBeneficiaries += q * 45;
      else if (it.unitType === 'motorBoat') totalBeneficiaries += q * 180;
      else if (it.unitType === 'militaryHelicopter') totalBeneficiaries += q * 320;
      else if (it.unitType === 'fireEngine') totalBeneficiaries += q * 120;
      else if (it.unitType === 'policeUnit') totalBeneficiaries += q * 85;
      else if (it.resourceType === 'rationPackets') totalBeneficiaries += Math.round(q * 4.2);
      else if (it.resourceType === 'tarpTentKits') totalBeneficiaries += Math.round(q * 5.0);
      else if (it.resourceType === 'waterMotorPumps') totalBeneficiaries += q * 350;
      else if (it.resourceType === 'waterTankers') totalBeneficiaries += q * 800;
      else totalBeneficiaries += q * 15;
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST';
    const vulnReduction = Math.min(45, Math.max(14, Math.round(items.length * 5.5 + (totalBeneficiaries > 5000 ? 14 : 7))));

    return {
      arrivedAt: timeStr,
      transitDurationMinutes: Math.max(18, Math.round(mission.etaMinutes * 1.35)),
      deliveredSummary,
      beneficiariesServed: Math.max(750, totalBeneficiaries),
      vulnerabilityReductionPct: vulnReduction,
      fieldCommanderNotes: `Convoy reached target staging area in ${mission.targetDistrict}. Incident Command Post linked. Life-saving equipment primed and active in designated high-risk flood/disaster sectors.`,
      localDeploymentStatus: 'Operational on Ground (Active Distribution & Rescue)',
    };
  };

  // Layer Toggles
  const [layerToggles, setLayerToggles] = useState({
    convoys: true,
    warehouses: true,
    floatingClinics: true,
    pumps: true,
    vulnerabilityTint: true,
  });

  // Advance in-transit dispatches realistically with real-time live telemetry stream
  useEffect(() => {
    if (dispatches.length === 0) return;
    const interval = setInterval(() => {
      setDispatches((prev) => {
        let newlyArrived: DispatchMission | null = null;
        const updated = prev.map((d) => {
          if (d.status === 'In Transit') {
            const nextProgress = Math.min(100, (d.progress || 0) + 1);
            const isArrived = nextProgress >= 100;
            if (isArrived && !d.arrivalReport) {
              const arrivedMission: DispatchMission = {
                ...d,
                progress: 100,
                etaMinutes: 0,
                status: 'Arrived & Active',
                arrivedAt: 'Just now',
                arrivalReport: computeArrivalReport(d),
              };
              newlyArrived = arrivedMission;
              return arrivedMission;
            }
            return {
              ...d,
              progress: nextProgress,
              etaMinutes: Math.max(0, Math.round(d.etaMinutes * (1 - nextProgress / 100))),
              status: isArrived ? 'Arrived & Active' : 'In Transit',
            };
          }
          return d;
        });

        if (newlyArrived) {
          setArrivedNotificationMission(newlyArrived);
        }
        return updated;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [dispatches.length]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load GeoJSON dataset
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetch('/india-districts.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const enrichedFeatures = (data.features || []).map((feature: any, index: number) => {
          const rawState = feature.properties?.NAME_1 || 'India';
          const stateName = canonicalStateName(rawState);
          const districtName = feature.properties?.NAME_2 || `District ${index + 1}`;
          const centroid = computeFeatureCentroid(feature.geometry);
          const baseline = getDistrictBaseline(districtName, stateName);
          const distId = `dist-${index}`;

          // Precompute vulnerability profile for fast lookup
          const vProfile = calculateDistrictVulnerabilityProfile(stateName, districtName, centroid);

          return {
            ...feature,
            properties: {
              ...feature.properties,
              id: distId,
              name: districtName,
              state: stateName,
              centroid,
              coordinates: centroid,
              population: baseline.population,
              areaKm2: baseline.areaKm2,
              populationDensity: baseline.populationDensity,
              povertyIndex: baseline.povertyIndex,
              dependencyRatio: baseline.dependencyRatio,
              buildingVulnerability: baseline.buildingVulnerability,
              historicalDamageScore: baseline.historicalDamageScore,
              lifelineProximityScore: baseline.lifelineProximityScore,
              ewsCoverage: baseline.ewsCoverage,
              primaryRiskFactor: baseline.primaryRiskFactor,
              floodBase: baseline.floodBase,
              heatwaveBase: baseline.heatwaveBase,
              cycloneBase: baseline.cycloneBase,
              vulnerabilityScore: vProfile.vulnerabilityScore,
              riskTier: vProfile.riskTier,
              exposureScore: vProfile.exposureScore,
              sensitivityScore: vProfile.sensitivityScore,
              adaptiveCapacityScore: vProfile.adaptiveCapacityScore,
              lackOfCapacityScore: vProfile.lackOfCapacityScore,
            },
          };
        });

        setGeoData({
          type: 'FeatureCollection',
          features: enrichedFeatures,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load district maps', err);
        setLoadError(err.message || 'Failed to load geospatial data');
        setLoading(false);
      });
  }, []);

  // Find matching stateId from raw or canonical state name
  const findStateIdForDistrict = useCallback((rawState: string) => {
    if (!rawState) return null;
    const canonical = canonicalStateName(rawState);
    const normRaw = rawState.toLowerCase().trim();
    const normCanonical = canonical.toLowerCase().trim();

    // 1. Direct match in STATE_RESOURCE_DATA
    const foundInResource = STATE_RESOURCE_DATA.find((s) => {
      const sName = s.stateName.toLowerCase().trim();
      const sId = s.id.toLowerCase().trim();
      return (
        sId === normRaw ||
        sId === normCanonical ||
        sName === normRaw ||
        sName === normCanonical ||
        isStateMatch(s.stateName, rawState) ||
        isStateMatch(s.stateName, canonical)
      );
    });
    if (foundInResource) return foundInResource.id;

    // 2. Direct match in STATE_GEO_CONFIGS
    const foundInGeo = Object.values(STATE_GEO_CONFIGS).find((cfg) => {
      const cName = cfg.name.toLowerCase().trim();
      const cId = cfg.id.toLowerCase().trim();
      return (
        cId === normRaw ||
        cId === normCanonical ||
        cName === normRaw ||
        cName === normCanonical ||
        isStateMatch(cfg.name, rawState) ||
        isStateMatch(cfg.name, canonical)
      );
    });
    if (foundInGeo) return foundInGeo.id;

    return null;
  }, []);

  // Smoothly Fly To State when `selectedStateId` changes
  const flyToState = useCallback(
    (stateId: string, customPitch?: number) => {
      const cfg = getStateGeoConfig(stateId);
      const targetPitch = customPitch !== undefined ? customPitch : is3DMode ? 28 : 0;

      setViewState({
        longitude: cfg.center[0],
        latitude: cfg.center[1],
        zoom: cfg.zoom,
        pitch: targetPitch,
        bearing: 0,
        // @ts-ignore DeckGL smooth flight properties
        transitionDuration: 1350,
        transitionInterpolator: new FlyToInterpolator({ speed: 1.35, curve: 1.4 }),
      });
    },
    [is3DMode]
  );

  // Switch State Handler
  const handleSelectState = (stateId: string) => {
    setSelectedStateId(stateId);
    setIsDropdownOpen(false);
    setSelectedDistrictProps(null);
    setSelectedWarehouse(null);
    flyToState(stateId);
  };

  // Previous / Next State Navigation
  const handleCycleState = (direction: 'prev' | 'next') => {
    const currentIndex = STATE_RESOURCE_DATA.findIndex((s) => s.id === selectedStateId);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= STATE_RESOURCE_DATA.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = STATE_RESOURCE_DATA.length - 1;

    handleSelectState(STATE_RESOURCE_DATA[nextIndex].id);
  };

  // Toggle 3D / 2D perspective
  const handleToggle3D = () => {
    const nextMode = !is3DMode;
    setIs3DMode(nextMode);
    setViewState((prev) => ({
      ...prev,
      pitch: nextMode ? 28 : 0,
      // @ts-ignore
      transitionDuration: 800,
      transitionInterpolator: new FlyToInterpolator(),
    }));
  };

  // Filtered State List for Dropdown
  const filteredStates = useMemo(() => {
    return STATE_RESOURCE_DATA.filter((st) => {
      const matchRegion = selectedRegionFilter === 'All' || st.region === selectedRegionFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        st.stateName.toLowerCase().includes(q) ||
        st.capital.toLowerCase().includes(q) ||
        st.stateCode.toLowerCase().includes(q) ||
        st.primaryDisasterRisk.toLowerCase().includes(q);

      return matchRegion && matchQuery;
    });
  }, [searchQuery, selectedRegionFilter]);

  // Dynamic District Vulnerability Calculation Map (calculates in <0.5ms whenever disaster scenario changes)
  const districtCalculationsMap = useMemo(() => {
    if (!geoData || !geoData.features) return new Map<string, ZoneScoreCalculation>();
    const map = new Map<string, ZoneScoreCalculation>();
    for (let i = 0; i < geoData.features.length; i++) {
      const f = geoData.features[i];
      const calc = computeZoneVulnerability(f.properties, activeParams);
      map.set(f.properties?.id, calc);
    }
    return map;
  }, [geoData, activeParams]);

  // Active dispatches for current state
  const stateDispatches = useMemo(() => {
    return dispatches.filter((d) => d.stateId === selectedStateId);
  }, [dispatches, selectedStateId]);

  // Districts in the selected state from loaded GeoData
  const stateDistricts = useMemo(() => {
    if (!geoData || !geoData.features) return [];
    return geoData.features.filter((f: any) => {
      const fState = f.properties?.state || f.properties?.NAME_1 || '';
      return isStateMatch(fState, selectedStateProfile.stateName);
    });
  }, [geoData, selectedStateProfile]);

  // Dynamic State Metrics derived strictly from the simulation engine's vulnerability math
  const stateLiveMetrics = useMemo(() => {
    if (!stateDistricts || stateDistricts.length === 0) {
      const baseline = calculateStateVulnerabilityScore(selectedStateProfile.stateName);
      return {
        score: baseline,
        riskTier: 'Moderate' as const,
        impactedCount: 0,
        totalCount: 0,
        maxScore: baseline,
        isImpacted: false,
        summary: 'Baseline State Vulnerability (Outside Active Footprint)',
      };
    }

    let maxScore = 0;
    let totalActive = 0;
    let countActive = 0;

    for (const f of stateDistricts) {
      const calc = districtCalculationsMap.get(f.properties?.id);
      if (calc && calc.isWithinImpactRadius && calc.finalScore > 0) {
        if (calc.finalScore > maxScore) maxScore = calc.finalScore;
        totalActive += calc.finalScore;
        countActive++;
      }
    }

    if (countActive > 0) {
      const avgActive = totalActive / countActive;
      const score = Math.min(99, Math.round(0.70 * maxScore + 0.30 * avgActive));
      const riskTier =
        score >= 80 ? 'Critical' : score >= 60 ? 'Severe' : score >= 40 ? 'Moderate' : 'Low';

      return {
        score,
        riskTier,
        impactedCount: countActive,
        totalCount: stateDistricts.length,
        maxScore,
        isImpacted: true,
        summary: `${countActive}/${stateDistricts.length} Districts in ${activeParams.title} Crisis Footprint (Peak: ${maxScore}/100)`,
      };
    }

    // Unaffected by current active disaster event
    const baseline = calculateStateVulnerabilityScore(selectedStateProfile.stateName);
    const disasterLabel = (activeParams?.type || disasterType || 'disaster').toUpperCase();
    return {
      score: Math.min(35, Math.round(baseline * 0.4)),
      riskTier: 'Low' as const,
      impactedCount: 0,
      totalCount: stateDistricts.length,
      maxScore: 0,
      isImpacted: false,
      summary: `All ${stateDistricts.length} Districts Outside Active ${disasterLabel} Radius`,
    };
  }, [stateDistricts, districtCalculationsMap, activeParams, selectedStateProfile]);

  const stateVulnerabilityScore = stateLiveMetrics.score;

  // Helper to compute live disaster impact for any state in India (for State Selector & Quick Filter)
  const getStateLiveMetrics = useCallback(
    (stateName: string) => {
      if (!geoData || !geoData.features) {
        return { score: 0, riskTier: 'Low', isImpacted: false, impactedCount: 0, totalCount: 0, maxScore: 0 };
      }
      const dists = geoData.features.filter((f: any) =>
        isStateMatch(f.properties?.state || f.properties?.NAME_1, stateName)
      );

      let maxScore = 0;
      let totalActive = 0;
      let countActive = 0;

      for (const f of dists) {
        const calc = districtCalculationsMap.get(f.properties?.id);
        if (calc && calc.isWithinImpactRadius && calc.finalScore > 0) {
          if (calc.finalScore > maxScore) maxScore = calc.finalScore;
          totalActive += calc.finalScore;
          countActive++;
        }
      }

      if (countActive > 0) {
        const avgActive = totalActive / countActive;
        const score = Math.min(99, Math.round(0.70 * maxScore + 0.30 * avgActive));
        const riskTier =
          score >= 80 ? 'Critical' : score >= 60 ? 'Severe' : score >= 40 ? 'Moderate' : 'Low';
        return {
          score,
          riskTier,
          isImpacted: true,
          impactedCount: countActive,
          totalCount: dists.length,
          maxScore,
        };
      }

      return {
        score: 0,
        riskTier: 'Stable',
        isImpacted: false,
        impactedCount: 0,
        totalCount: dists.length,
        maxScore: 0,
      };
    },
    [geoData, districtCalculationsMap]
  );

  // Available Target District names for the New Dispatch modal (dynamically sorted by active disaster score)
  const availableTargetDistricts = useMemo(() => {
    if (stateDistricts.length > 0) {
      return stateDistricts
        .map((f: any) => {
          const name = f.properties?.name || f.properties?.NAME_2;
          const calc = districtCalculationsMap.get(f.properties?.id);
          const vulnScore = calc ? calc.finalScore : f.properties?.vulnerabilityScore || 45;
          const isImpacted = calc ? calc.isWithinImpactRadius && calc.finalScore > 0 : false;
          const riskTier = vulnScore >= 80 ? 'Critical' : vulnScore >= 60 ? 'Severe' : vulnScore >= 40 ? 'Moderate' : 'Low';
          return {
            name,
            vulnScore,
            riskTier,
            isImpacted,
            primaryRisk: isImpacted ? `${activeParams.title} Zone` : selectedStateProfile.primaryDisasterRisk,
            distanceKm: calc?.distanceToEpicenterKm || 0,
          };
        })
        .sort((a, b) => b.vulnScore - a.vulnScore);
    }
    return stateGeoConfig.keyDistricts.map((d) => ({
      name: d,
      vulnScore: 50,
      riskTier: 'Moderate' as const,
      isImpacted: false,
      primaryRisk: selectedStateProfile.primaryDisasterRisk,
      distanceKm: 0,
    }));
  }, [stateDistricts, districtCalculationsMap, activeParams, stateGeoConfig, selectedStateProfile]);

  // Pre-fill target district if not set
  useEffect(() => {
    if (availableTargetDistricts.length > 0 && !newTargetDistrict) {
      setNewTargetDistrict(availableTargetDistricts[0].name);
    }
  }, [availableTargetDistricts, newTargetDistrict]);

  // Pre-fill selected origin warehouse for active state
  useEffect(() => {
    if (stateWarehouses.length > 0) {
      setSelectedOriginWarehouseId(stateWarehouses[0].id);
    } else {
      setSelectedOriginWarehouseId(WAREHOUSE_FACILITIES[0].id);
    }
  }, [selectedStateId, stateWarehouses]);

  // Active Origin Warehouse for Dispatch
  const activeOriginWarehouse = useMemo(() => {
    if (selectedOriginWarehouseId) {
      const found = WAREHOUSE_FACILITIES.find((w) => w.id === selectedOriginWarehouseId);
      if (found) return found;
    }
    return stateWarehouses[0] || WAREHOUSE_FACILITIES[0];
  }, [selectedOriginWarehouseId, stateWarehouses]);

  // Dynamic Selected Target District Vulnerability Profile for the Dispatch Modal
  const targetDistrictVulnerability = useMemo(() => {
    if (!newTargetDistrict) return null;
    const targetFeat = stateDistricts.find(
      (f: any) => (f.properties?.name || f.properties?.NAME_2) === newTargetDistrict
    );
    const targetCoords = targetFeat?.properties?.centroid || [
      stateGeoConfig.center[0],
      stateGeoConfig.center[1],
    ];

    const calc = targetFeat ? districtCalculationsMap.get(targetFeat.properties?.id) : null;
    const score = calc ? calc.finalScore : 50;
    const riskTier = score >= 80 ? 'Critical' : score >= 60 ? 'Severe' : score >= 40 ? 'Moderate' : 'Low';
    
    // Disaster-driven smart resource recommendations
    const recommendations: Array<{ type: keyof typeof RESOURCE_CATEGORIES; label: string; reason: string }> = [];
    if (disasterType === 'flood') {
      recommendations.push(
        { type: 'floatingClinics', label: 'Inflatable Boat Clinics', reason: 'Critical for inundated flood plains' },
        { type: 'waterMotorPumps', label: 'High-Capacity Dewatering Pumps', reason: 'Submerged urban drains & basements' },
        { type: 'rationPackets', label: 'Family Ration Food Kits', reason: 'Cut-off islanded villages' }
      );
    } else if (disasterType === 'heatwave') {
      recommendations.push(
        { type: 'waterTankers', label: 'Potable Water Bowsers (10kL)', reason: 'Severe dehydration & water stress' },
        { type: 'emergencyGenerators', label: 'Emergency DG Sets', reason: 'Powering primary health center chillers' },
        { type: 'medicalFirstAidUnits', label: 'ORS & Heat-Stroke First Aid', reason: 'Cooling centers & trauma triage' }
      );
    } else {
      recommendations.push(
        { type: 'debrisMachinery', label: 'Heavy Debris Excavators', reason: 'Clearing uprooted trees & collapsed roads' },
        { type: 'tarpTentKits', label: 'Disaster Relief Tents & Tarps', reason: 'Emergency shelter for displaced families' },
        { type: 'emergencyGenerators', label: 'Mobile Floodlight Generators', reason: 'Grid blackout recovery' }
      );
    }

    return {
      districtName: newTargetDistrict,
      stateName: selectedStateProfile.stateName,
      vulnerabilityScore: score,
      riskTier,
      isImpacted: calc ? calc.isWithinImpactRadius && calc.finalScore > 0 : false,
      distanceToEpicenterKm: calc?.distanceToEpicenterKm || 0,
      hazardFactor: calc?.hazardFactor || 0,
      exposureScore: calc?.exposureScore || 50,
      sensitivityScore: calc?.sensitivityScore || 50,
      lackOfCapacityScore: calc?.lackOfCopingCapacity || 50,
      recommendedResources: recommendations,
      coordinates: targetCoords,
    };
  }, [newTargetDistrict, stateDistricts, stateGeoConfig, districtCalculationsMap, disasterType, selectedStateProfile]);

  // Calculated distance and estimated transit time to new target district
  const estimatedRouteInfo = useMemo(() => {
    if (!newTargetDistrict || !activeOriginWarehouse) return { distanceKm: 45, etaMinutes: 35, targetCoords: [stateGeoConfig.center[0], stateGeoConfig.center[1]] as [number, number] };

    const targetFeat = stateDistricts.find(
      (f: any) => (f.properties?.name || f.properties?.NAME_2) === newTargetDistrict
    );
    const targetCoords: [number, number] = targetFeat?.properties?.centroid || [
      stateGeoConfig.center[0],
      stateGeoConfig.center[1],
    ];

    const dist = calculateDistanceKm(activeOriginWarehouse.coordinates, targetCoords);
    const speedKmH =
      newTransportMode === 'IAF Airlift'
        ? 280
        : newTransportMode === 'Waterway Fleet / Boat'
        ? 22
        : 45;
    const eta = Math.max(12, Math.round((dist / speedKmH) * 60) + 10);

    return { distanceKm: Math.round(dist), etaMinutes: eta, targetCoords };
  }, [newTargetDistrict, activeOriginWarehouse, stateDistricts, stateGeoConfig, newTransportMode]);

  // Handle Creating a New Multi-Resource Dispatch Mission
  const handleCreateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetDistrict) return;

    const targetCoords = estimatedRouteInfo.targetCoords;
    const baseItems: DispatchResourceItem[] =
      manifestItems.length > 0
        ? manifestItems
        : [
            {
              id: `item-${Date.now()}`,
              resourceType: 'ambulance',
              quantity: 2,
              unitLabel: 'ALS Trauma Ambulances',
              unitType: 'ambulance',
            },
          ];

    const leadUnit = baseItems.length > 0 && baseItems[0].unitType
      ? baseItems[0].unitType
      : newTransportMode === 'IAF Airlift'
      ? 'militaryHelicopter'
      : newTransportMode === 'Waterway Fleet / Boat'
      ? 'motorBoat'
      : 'cargoTruck';

    const missionId = `DSP-${Math.floor(1000 + Math.random() * 9000)}`;

    const validation = validateDispatch(selectedStateId, baseItems, {
      autoCommit: true,
      missionDetails: {
        id: missionId,
        stateId: selectedStateId,
        targetDistrict: newTargetDistrict,
        targetCoords,
        originDepot: `${activeOriginWarehouse.facilityName} (${activeOriginWarehouse.district})`,
        originCoords: activeOriginWarehouse.coordinates,
        unitType: leadUnit,
        transportMode: newTransportMode,
        status: 'In Transit',
        progress: 4,
        etaMinutes: estimatedRouteInfo.etaMinutes,
        priority: newPriority,
        dispatchedAt: 'Just now',
      },
    });

    if (!validation.valid && validation.shortfalls.length > 0) {
      alert(validation.message);
      return;
    }

    setShowNewDispatchModal(false);
    setActiveLeftTab('dispatches');
    setIsLeftPanelOpen(true);
  };

  // Preset Bundle Application Handler
  const handleApplyPresetBundle = (preset: PresetDispatchBundle) => {
    setSelectedLeadUnit(preset.leadUnitType);
    setNewTransportMode(preset.transportMode);
    setNewPriority(preset.priority);
    setManifestItems(
      preset.items.map((it, idx) => {
        const resKey = mapToResourceKey(it.resourceType);
        const available = selectedStateProfile.resources[resKey]?.inReserve ?? it.quantity;
        const validQty = Math.max(1, Math.min(it.quantity, available > 0 ? available : it.quantity));
        return {
          id: `preset-item-${idx}-${Date.now()}`,
          resourceType: it.resourceType,
          quantity: validQty,
          unitLabel: it.unitLabel,
          unitType: it.unitType || (it.resourceType in DISPATCH_UNITS ? (it.resourceType as DispatchUnitType) : 'cargoTruck'),
        };
      })
    );
  };

  // Add Item to Custom Payload Manifest
  const handleAddManifestItem = () => {
    if (itemToAddQty <= 0) return;
    const resKey = mapToResourceKey(itemToAddCategory);
    const available = selectedStateProfile.resources[resKey]?.inReserve ?? 0;
    const validQty = available > 0 ? Math.min(itemToAddQty, available) : itemToAddQty;

    const unitLabel = getResourceDisplayName(itemToAddCategory);
    const unitType = getResourceDefaultUnitType(itemToAddCategory);

    const newItem: DispatchResourceItem = {
      id: `m-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      resourceType: itemToAddCategory,
      quantity: Math.max(1, validQty),
      unitLabel,
      unitType,
    };

    setManifestItems((prev) => [...prev, newItem]);
  };

  // Remove Item from Payload Manifest
  const handleRemoveManifestItem = (id: string) => {
    setManifestItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Update Item Quantity in Payload Manifest
  const handleUpdateManifestItemQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveManifestItem(id);
      return;
    }
    const item = manifestItems.find((it) => it.id === id);
    if (!item) return;
    const resKey = mapToResourceKey(item.resourceType);
    const available = selectedStateProfile.resources[resKey]?.inReserve ?? 0;
    const validQty = available > 0 ? Math.min(newQty, available) : newQty;

    setManifestItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: validQty } : it))
    );
  };

  // Dynamic Selected district detailed profile (when clicking a polygon on the map)
  const inspectedDistrictProfile = useMemo(() => {
    if (!selectedDistrictProps) return null;
    const distId = selectedDistrictProps.id;
    const calc = districtCalculationsMap.get(distId);
    const score = calc ? calc.finalScore : selectedDistrictProps.vulnerabilityScore || 45;
    const riskTier = score >= 80 ? 'Critical' : score >= 60 ? 'Severe' : score >= 40 ? 'Moderate' : 'Low';

    return {
      districtName: selectedDistrictProps.name || selectedDistrictProps.NAME_2 || 'District',
      stateName: selectedDistrictProps.state || selectedDistrictProps.NAME_1 || selectedStateProfile.stateName,
      vulnerabilityScore: score,
      inherentScore: calc?.inherentVulnerabilityScore || 45,
      riskTier,
      isImpacted: calc ? calc.isWithinImpactRadius && calc.finalScore > 0 : false,
      distanceToEpicenterKm: calc?.distanceToEpicenterKm || 0,
      hazardFactor: calc?.hazardFactor || 0,
      exposureScore: calc?.exposureScore || selectedDistrictProps.exposureScore || 50,
      sensitivityScore: calc?.sensitivityScore || selectedDistrictProps.sensitivityScore || 50,
      lackOfCapacityScore: calc?.lackOfCopingCapacity || selectedDistrictProps.lackOfCapacityScore || 50,
      population: selectedDistrictProps.population || 1200000,
      populationDensity: selectedDistrictProps.populationDensity || 450,
      povertyIndex: selectedDistrictProps.povertyIndex || 35,
    };
  }, [selectedDistrictProps, districtCalculationsMap, selectedStateProfile]);

  // Map Layers construction
  const layers = useMemo(() => {
    if (!geoData) return [];

    const normSelectedState = selectedStateProfile.stateName.toLowerCase().trim();
    const layerList: any[] = [];

    // 1. Dynamic District Polygons with Real-Time Disaster Vulnerability Color-Coding
    layerList.push(
      new GeoJsonLayer({
        id: 'dispatch-district-polygons',
        data: geoData,
        pickable: true,
        stroked: true,
        filled: true,
        lineWidthUnits: 'pixels',
        getLineColor: (d: any) => {
          const isSelectedDist = selectedDistrictProps && selectedDistrictProps.id === d.properties?.id;
          if (isSelectedDist) {
            return [59, 130, 246, 255]; // Vivid Cyan/Blue border for selected district
          }

          const isCurrentState = isStateMatch(
            d.properties?.state || d.properties?.NAME_1,
            selectedStateProfile.stateName
          );

          const calc = districtCalculationsMap.get(d.properties?.id);
          const score = calc ? calc.finalScore : d.properties?.vulnerabilityScore || 45;
          const isWithinImpact = calc ? calc.isWithinImpactRadius && calc.finalScore > 0 : false;

          if (isCurrentState) {
            // Prominent electric blue boundary outline for selected state (e.g. Odisha, Bihar, etc.)
            return [59, 130, 246, 255];
          }

          if (isWithinImpact) {
            const [r, g, b] = getZoneRGB(score, true);
            return [r, g, b, 230]; // Vivid alert boundary for disaster impact zone
          }

          return [255, 255, 255, 18];
        },
        getLineWidth: (d: any) => {
          const isSelectedDist = selectedDistrictProps && selectedDistrictProps.id === d.properties?.id;
          if (isSelectedDist) return 3.5;

          const isCurrentState = isStateMatch(
            d.properties?.state || d.properties?.NAME_1,
            selectedStateProfile.stateName
          );
          if (isCurrentState) return 2.4; // Bold blue outline for selected state

          const calc = districtCalculationsMap.get(d.properties?.id);
          const isWithinImpact = calc ? calc.isWithinImpactRadius && calc.finalScore > 0 : false;
          if (isWithinImpact) return 1.6;

          return 0.5;
        },
        getFillColor: (d: any) => {
          const isSelectedDist = selectedDistrictProps && selectedDistrictProps.id === d.properties?.id;
          if (isSelectedDist) {
            return [59, 130, 246, 175]; // Vivid highlight on selected district
          }

          const calc = districtCalculationsMap.get(d.properties?.id);
          const score = calc ? calc.finalScore : 0;
          const isWithinImpact = calc ? calc.isWithinImpactRadius && calc.finalScore > 0 : false;

          // 1. If within active disaster impact radius, use EXACT vulnerability RGB colors from simulation engine
          if (isWithinImpact && score > 0) {
            const [r, g, b] = getZoneRGB(score, true);
            const isCurrentState = isStateMatch(
              d.properties?.state || d.properties?.NAME_1,
              selectedStateProfile.stateName
            );
            const alpha = layerToggles.vulnerabilityTint ? (isCurrentState ? 195 : 160) : 110;
            return [r, g, b, alpha];
          }

          // 2. If in current selected state (outside active disaster footprint)
          const isCurrentState = isStateMatch(
            d.properties?.state || d.properties?.NAME_1,
            selectedStateProfile.stateName
          );
          if (isCurrentState) {
            return [30, 58, 102, layerToggles.vulnerabilityTint ? 80 : 45];
          }

          // 3. Nationwide background districts
          return [15, 23, 42, 20];
        },
        updateTriggers: {
          getFillColor: [selectedStateId, selectedDistrictProps?.id, layerToggles.vulnerabilityTint, activeParams, districtCalculationsMap],
          getLineColor: [selectedStateId, selectedDistrictProps?.id, activeParams, districtCalculationsMap],
          getLineWidth: [selectedStateId, selectedDistrictProps?.id, activeParams, districtCalculationsMap],
        },
        dataComparator: () => true,
      })
    );

    // 2. Disaster Epicenter & Impact Radius Ring
    if (epicenter && epicenter.length === 2) {
      const radiusMeters = (customRadiusKm || currentSeverity.defaultRadiusKm) * 1000;
      layerList.push(
        new ScatterplotLayer({
          id: 'dispatch-disaster-footprint-ring',
          data: [{ position: [epicenter[0], epicenter[1], 10] }],
          getPosition: (d: any) => d.position,
          getRadius: radiusMeters,
          stroked: true,
          filled: true,
          lineWidthMinPixels: 2,
          getFillColor:
            disasterType === 'flood'
              ? [59, 130, 246, 25]
              : disasterType === 'heatwave'
              ? [239, 68, 68, 25]
              : [168, 85, 247, 25],
          getLineColor:
            disasterType === 'flood'
              ? [96, 165, 250, 220]
              : disasterType === 'heatwave'
              ? [248, 113, 113, 220]
              : [192, 132, 252, 220],
          pickable: false,
        })
      );

      layerList.push(
        new ScatterplotLayer({
          id: 'dispatch-disaster-epicenter-beacon',
          data: [{ position: [epicenter[0], epicenter[1], 20] }],
          getPosition: (d: any) => d.position,
          getRadius: 18000,
          radiusMinPixels: 9,
          radiusMaxPixels: 22,
          filled: true,
          stroked: true,
          getFillColor:
            disasterType === 'flood'
              ? [59, 130, 246, 240]
              : disasterType === 'heatwave'
              ? [239, 68, 68, 240]
              : [168, 85, 247, 240],
          getLineColor: [255, 255, 255, 255],
          lineWidthMinPixels: 2.5,
          pickable: true,
        })
      );
    }

      // 3. Active Supply Lines & Convoys (Connecting Relief Warehouses to Affected Districts)
    if (layerToggles.convoys && stateDispatches.length > 0) {
      const lineData = stateDispatches.map((disp) => ({
        id: disp.id,
        sourcePosition: Array.isArray(disp.originCoords) && disp.originCoords.length >= 2 ? disp.originCoords : [78.9629, 20.5937],
        targetPosition: Array.isArray(disp.targetCoords) && disp.targetCoords.length >= 2 ? disp.targetCoords : [78.9629, 20.5937],
        priority: disp.priority,
        status: disp.status,
        glowColor:
          disp.priority === 'CRITICAL'
            ? [239, 68, 68, 160]
            : disp.priority === 'HIGH'
            ? [245, 158, 11, 160]
            : [14, 165, 233, 160],
        coreColor:
          disp.priority === 'CRITICAL'
            ? [254, 202, 202, 255]
            : disp.priority === 'HIGH'
            ? [254, 240, 138, 255]
            : [186, 230, 253, 255],
      }));

      // 3a. Broad Vibrant Neon Glow Tube Layer
      layerList.push(
        new LineLayer({
          id: 'dispatch-supply-routes-glow',
          data: lineData,
          getSourcePosition: (d: any) => d.sourcePosition,
          getTargetPosition: (d: any) => d.targetPosition,
          getColor: (d: any) => d.glowColor,
          getWidth: 8,
          widthUnits: 'pixels',
          pickable: false,
        })
      );

      // 3b. High-Contrast Laser Core Line Layer
      layerList.push(
        new LineLayer({
          id: 'dispatch-supply-routes-core',
          data: lineData,
          getSourcePosition: (d: any) => d.sourcePosition,
          getTargetPosition: (d: any) => d.targetPosition,
          getColor: (d: any) => d.coreColor,
          getWidth: 3.5,
          widthUnits: 'pixels',
          pickable: true,
        })
      );

      // 3c. Origin & Target Dropzone Tactical Anchor Rings
      const originPoints = stateDispatches.map((d) => ({
        position: Array.isArray(d.originCoords) && d.originCoords.length >= 2 ? d.originCoords : [78.9629, 20.5937],
        label: d.originFacility,
      }));
      const targetPoints = stateDispatches.map((d) => ({
        position: Array.isArray(d.targetCoords) && d.targetCoords.length >= 2 ? d.targetCoords : [78.9629, 20.5937],
        label: d.targetDistrict,
        priority: d.priority,
      }));

      layerList.push(
        new ScatterplotLayer({
          id: 'dispatch-origin-depot-anchors',
          data: originPoints,
          getPosition: (d: any) => d.position,
          getRadius: 7000,
          radiusMinPixels: 6,
          radiusMaxPixels: 14,
          filled: true,
          stroked: true,
          getFillColor: [16, 185, 129, 200],
          getLineColor: [255, 255, 255, 255],
          lineWidthMinPixels: 2,
        })
      );

      layerList.push(
        new ScatterplotLayer({
          id: 'dispatch-target-dropzone-anchors',
          data: targetPoints,
          getPosition: (d: any) => d.position,
          getRadius: 10000,
          radiusMinPixels: 8,
          radiusMaxPixels: 20,
          filled: true,
          stroked: true,
          getFillColor: (d: any) =>
            d.priority === 'CRITICAL'
              ? [239, 68, 68, 120]
              : [245, 158, 11, 120],
          getLineColor: (d: any) =>
            d.priority === 'CRITICAL'
              ? [254, 202, 202, 240]
              : [254, 240, 138, 240],
          lineWidthMinPixels: 2,
        })
      );

      // Moving Convoy Units along route with high-contrast tactical HUD vehicle badges
      const movingBeacons = stateDispatches.map((disp) => {
        const progressRatio = Math.max(0.02, Math.min(0.98, (disp.progress || 10) / 100));
        const [x1, y1] = Array.isArray(disp.originCoords) && disp.originCoords.length >= 2 ? disp.originCoords : [78.9629, 20.5937];
        const [x2, y2] = Array.isArray(disp.targetCoords) && disp.targetCoords.length >= 2 ? disp.targetCoords : [78.9629, 20.5937];
        const curLng = x1 + (x2 - x1) * progressRatio;
        const curLat = y1 + (y2 - y1) * progressRatio;
        const unitType = disp.unitType || (disp.items?.[0]?.unitType) || 'cargoTruck';
        const iconUrl = getUnitMapIconUrl(unitType);

        return {
          id: `${disp.id}-beacon`,
          dispatchId: disp.id,
          position: [curLng, curLat, 500],
          resourceType: disp.resourceType,
          unitType,
          iconUrl,
          label: disp.id,
          priority: disp.priority,
          progress: disp.progress,
          targetDistrict: disp.targetDistrict,
          transportMode: disp.transportMode,
          status: disp.status,
        };
      });

      // 1. Ambient pulsing beacon ground halo
      layerList.push(
        new ScatterplotLayer({
          id: 'dispatch-moving-convoys-halo',
          data: movingBeacons,
          getPosition: (d: any) => d.position,
          getRadius: 7500,
          radiusMinPixels: 12,
          radiusMaxPixels: 24,
          filled: true,
          stroked: true,
          getFillColor: (d: any) =>
            d.priority === 'CRITICAL'
              ? [239, 68, 68, 60]
              : d.priority === 'HIGH'
              ? [245, 158, 11, 60]
              : [59, 130, 246, 60],
          getLineColor: (d: any) =>
            d.priority === 'CRITICAL'
              ? [239, 68, 68, 220]
              : d.priority === 'HIGH'
              ? [245, 158, 11, 220]
              : [59, 130, 246, 220],
          lineWidthMinPixels: 2,
          pickable: false,
        })
      );

      // 2. High-Tech Tactical C2 HUD Pin Badges (AMB-07, FE-02, UAV-02, RT-01, PV-08, HELI-01)
      layerList.push(
        new IconLayer({
          id: 'dispatch-moving-convoys-icons',
          data: movingBeacons,
          getPosition: (d: any) => d.position,
          getIcon: (d: any) => ({
            url: d.iconUrl,
            width: 100,
            height: 115,
            anchorX: 50,
            anchorY: 106,
            mask: false,
          }),
          getSize: 46,
          sizeScale: 1,
          sizeUnits: 'pixels',
          sizeMinPixels: 34,
          sizeMaxPixels: 56,
          pickable: true,
          onClick: (info: any) => {
            if (info.object) {
              const disp = stateDispatches.find((d) => d.id === info.object.dispatchId);
              if (disp) {
                if (disp.status === 'Arrived & Active') {
                  setSelectedReachedMission(disp);
                } else {
                  setActiveLeftTab('dispatches');
                  setIsLeftPanelOpen(true);
                }
              }
            }
          },
        })
      );

      // 3. Clear, High-Contrast Mission Progress Tag below the pin tip
      layerList.push(
        new TextLayer({
          id: 'dispatch-moving-convoys-labels',
          data: movingBeacons,
          getPosition: (d: any) => d.position,
          getText: (d: any) => `${d.progress}% En Route`,
          getSize: 9.5,
          sizeUnits: 'pixels',
          getColor: [255, 255, 255, 255],
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'top',
          getPixelOffset: [0, 8],
          background: true,
          getBackgroundColor: () => [6, 10, 18, 235],
          backgroundPadding: [5, 2, 5, 2],
          borderRadius: 4,
          fontFamily: 'monospace, ui-monospace, sans-serif',
          fontWeight: 'bold',
          pickable: true,
          onClick: (info: any) => {
            if (info.object) {
              const disp = stateDispatches.find((d) => d.id === info.object.dispatchId);
              if (disp) {
                if (disp.status === 'Arrived & Active') {
                  setSelectedReachedMission(disp);
                } else {
                  setActiveLeftTab('dispatches');
                  setIsLeftPanelOpen(true);
                }
              }
            }
          },
        })
      );
    }

    // 4. Official NDMA/SDMA Relief Warehouses (National Dataset)
    if (layerToggles.warehouses) {
      layerList.push(
        new ScatterplotLayer({
          id: 'dispatch-relief-warehouses',
          data: WAREHOUSE_FACILITIES,
          getPosition: (d: WarehouseFacility) => d.coordinates,
          getRadius: (d: WarehouseFacility) => {
            const isStateWH = stateWarehouses.some((sw) => sw.id === d.id);
            return isStateWH ? 8500 : 5000;
          },
          radiusMinPixels: 5,
          radiusMaxPixels: 12,
          filled: true,
          stroked: true,
          getFillColor: (d: WarehouseFacility) => {
            const isSelected = selectedWarehouse?.id === d.id;
            if (isSelected) return [250, 204, 21, 255]; // Yellow highlight
            const isStateWH = stateWarehouses.some((sw) => sw.id === d.id);
            return isStateWH ? [16, 185, 129, 240] : [100, 116, 139, 140]; // Emerald vs muted slate
          },
          getLineColor: [255, 255, 255, 220],
          lineWidthMinPixels: 1.5,
          pickable: true,
          onClick: (info: any) => {
            if (info.object) {
              setSelectedWarehouse(info.object);
              setSelectedDistrictProps(null);
            }
          },
        })
      );
    }

    return layerList;
  }, [
    geoData,
    selectedStateProfile,
    selectedStateId,
    selectedDistrictProps,
    selectedWarehouse,
    layerToggles,
    stateDispatches,
    stateWarehouses,
    districtCalculationsMap,
    activeParams,
    getZoneRGB,
    epicenter,
    customRadiusKm,
    currentSeverity,
    disasterType,
  ]);

  // Handle map clicks for district selection - automatically teleports map to the entire state containing the district
  const handleMapClick = (info: any) => {
    if (info.object && info.layer?.id === 'dispatch-district-polygons') {
      const props = info.object.properties;
      setSelectedWarehouse(null);
      setSelectedDistrictProps(props);

      const rawState = props?.state || props?.NAME_1 || '';
      const targetStateId = findStateIdForDistrict(rawState);

      if (targetStateId) {
        setSelectedStateId(targetStateId);
        flyToState(targetStateId);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-[#070a12] overflow-hidden rounded-2xl border border-[#151f32] select-none">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#070a12]/85 backdrop-blur-md">
          <div className="flex flex-col items-center gap-3">
            <Radio className="animate-spin text-blue-500" size={36} />
            <p className="text-slate-200 font-semibold tracking-wide text-sm">
              Initializing State Dispatch Map & Vulnerability Telemetry...
            </p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {loadError && !loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#070a12]/90 backdrop-blur-md p-6">
          <div className="flex flex-col items-center gap-3 max-w-sm text-center bg-red-950/40 border border-red-800/50 p-6 rounded-2xl">
            <AlertTriangle className="text-red-400" size={36} />
            <h4 className="text-slate-200 font-bold text-base">Failed to Load Map Data</h4>
            <p className="text-xs text-slate-400">{loadError}</p>
          </div>
        </div>
      )}

      {/* TOP HEADER: Streamlined Navigation, Telemetry Pill & Tactical Actions */}
      <header className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-50 flex items-center justify-between gap-2 pointer-events-none">
        {/* Left: State Dropdown Selector with Quick Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0" ref={dropdownRef}>
          {/* Previous State Button */}
          <button
            onClick={() => handleCycleState('prev')}
            className="h-9 sm:h-10 w-8 sm:w-9 flex items-center justify-center bg-[#090d16]/95 border border-[#1b2a44] hover:border-blue-500/50 hover:bg-[#121c2e] text-slate-300 hover:text-white rounded-xl backdrop-blur-xl transition-all shadow-xl cursor-pointer shrink-0"
            title="Previous State"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Main State Dropdown Trigger */}
          <div className="relative z-50">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="h-9 sm:h-10 min-w-[170px] sm:min-w-[220px] max-w-[220px] sm:max-w-[280px] px-2.5 sm:px-3 flex items-center justify-between gap-2 bg-[#090d16]/95 border border-[#1b2a44] hover:border-blue-500/60 rounded-xl backdrop-blur-xl transition-all shadow-xl text-left cursor-pointer"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-mono text-[11px] font-bold shrink-0">
                  {selectedStateProfile.stateCode}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-xs font-bold text-slate-100 truncate">
                      {selectedStateProfile.stateName}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 font-bold uppercase tracking-wider border border-blue-500/20 shrink-0">
                      {selectedStateProfile.region}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                  isDropdownOpen ? 'rotate-180 text-blue-400' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Modal */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-12 left-0 w-[320px] sm:w-[380px] max-h-[460px] bg-[#090d16] border border-[#1e2f4d] rounded-2xl shadow-2xl backdrop-blur-2xl z-[9999] overflow-hidden flex flex-col"
                >
                  {/* Search and Region Tabs */}
                  <div className="p-3 border-b border-[#15233c] bg-[#070b14]/80 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                      <input
                        type="text"
                        placeholder="Search state, capital, or risk..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full pl-8 pr-3 py-1.5 bg-[#0d1524] border border-[#1b2b46] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Region Filters */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                      {REGIONS.map((reg) => (
                        <button
                          key={reg}
                          onClick={() => setSelectedRegionFilter(reg)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all ${
                            selectedRegionFilter === reg
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-[#111c30]'
                          }`}
                        >
                          {reg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable State List */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800 max-h-[320px]">
                    {filteredStates.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No states matching "{searchQuery}"
                      </div>
                    ) : (
                      filteredStates
                        .slice()
                        .sort((a, b) => {
                          const mA = getStateLiveMetrics(a.stateName);
                          const mB = getStateLiveMetrics(b.stateName);
                          if (mA.isImpacted !== mB.isImpacted) {
                            return mA.isImpacted ? -1 : 1;
                          }
                          return mB.score - mA.score;
                        })
                        .map((st) => {
                          const isSelected = st.id === selectedStateId;
                          const activeDispCount = dispatches.filter((d) => d.stateId === st.id).length;
                          const live = getStateLiveMetrics(st.stateName);

                          return (
                            <button
                              key={st.id}
                              onClick={() => handleSelectState(st.id)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                                isSelected
                                  ? 'bg-blue-600/20 border border-blue-500/40 text-slate-100'
                                  : 'hover:bg-[#101a2c] text-slate-300 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
                                    isSelected
                                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                                      : live.isImpacted
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      : 'bg-[#15233c] text-blue-400'
                                  }`}
                                >
                                  {st.stateCode}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-100 truncate">
                                      {st.stateName}
                                    </span>
                                    {live.isImpacted ? (
                                      <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                                          live.score >= 72
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            : live.score >= 50
                                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        }`}
                                      >
                                        V: {live.score} • {live.impactedCount} affected
                                      </span>
                                    ) : (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono text-slate-400 bg-slate-800/40 border border-slate-700/30">
                                        Stable (0)
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                    {live.isImpacted
                                      ? `${live.impactedCount}/${live.totalCount} Districts in Active ${(activeParams?.type || disasterType || 'hazard').toUpperCase()} Zone`
                                      : `Outside Active Footprint • ${st.primaryDisasterRisk}`}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {activeDispCount > 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30 flex items-center gap-1 animate-pulse">
                                    <Radio size={9} />
                                    {activeDispCount}
                                  </span>
                                )}
                                {isSelected && <CheckCircle2 size={14} className="text-blue-400" />}
                              </div>
                            </button>
                          );
                        })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Next State Button */}
          <button
            onClick={() => handleCycleState('next')}
            className="h-9 sm:h-10 w-8 sm:w-9 flex items-center justify-center bg-[#090d16]/95 border border-[#1b2a44] hover:border-blue-500/50 hover:bg-[#121c2e] text-slate-300 hover:text-white rounded-xl backdrop-blur-xl transition-all shadow-xl cursor-pointer shrink-0"
            title="Next State"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Center: Live Disaster Impact HUD & State Risk Telemetry */}
        <div className="flex items-center gap-2 sm:gap-2.5 bg-[#090d16]/95 border border-[#17243c] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl backdrop-blur-xl pointer-events-auto shadow-xl shrink-0">
          {/* Active Disaster Scenario Badge */}
          <div className="flex items-center gap-2 border-r border-[#15233c] pr-2.5 sm:pr-3 shrink-0">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 ${
                disasterType === 'flood'
                  ? 'bg-blue-600 shadow-sm shadow-blue-500/30'
                  : disasterType === 'heatwave'
                  ? 'bg-red-600 shadow-sm shadow-red-500/30'
                  : 'bg-purple-600 shadow-sm shadow-purple-500/30'
              }`}
            >
              {disasterType === 'flood' ? (
                <Waves size={13} />
              ) : disasterType === 'heatwave' ? (
                <Flame size={13} />
              ) : (
                <Wind size={13} />
              )}
            </div>
            <div className="flex flex-col text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100 truncate max-w-[100px] sm:max-w-[140px] md:max-w-none">{activeParams.title}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-white/10 text-slate-300 shrink-0 whitespace-nowrap">
                  {currentSeverity.name}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px]">
                {epicenterName}
              </span>
            </div>

            {/* Focus Epicenter Button */}
            <button
              onClick={() => {
                if (epicenter && epicenter.length === 2) {
                  // Find matching state for epicenter or fly to epicenter coords
                  setViewState({
                    longitude: epicenter[0],
                    latitude: epicenter[1],
                    zoom: 6.8,
                    pitch: is3DMode ? 28 : 0,
                    bearing: 0,
                    // @ts-ignore
                    transitionDuration: 1200,
                    transitionInterpolator: new FlyToInterpolator(),
                  });
                }
              }}
              className="ml-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-sm whitespace-nowrap"
              title="Focus Camera on Disaster Epicenter"
            >
              <Crosshair size={11} className="text-blue-400" />
              <span>Epicenter</span>
            </button>
          </div>

          {/* State Risk Index */}
          <div className="hidden md:flex items-center gap-2 border-r border-[#15233c] pr-2.5 sm:pr-3 shrink-0 whitespace-nowrap">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">State Risk:</span>
            <span
              className={`text-xs font-black font-mono px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                stateLiveMetrics.isImpacted
                  ? stateVulnerabilityScore >= 72
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : stateVulnerabilityScore >= 50
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800/40 text-slate-300 border border-slate-700/30'
              }`}
              title={stateLiveMetrics.summary}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  stateLiveMetrics.isImpacted
                    ? stateVulnerabilityScore >= 72
                      ? 'bg-red-400 animate-pulse'
                      : stateVulnerabilityScore >= 50
                      ? 'bg-orange-400'
                      : 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="whitespace-nowrap">
                {stateLiveMetrics.isImpacted
                  ? `${stateVulnerabilityScore} / 100 [${stateLiveMetrics.riskTier}]`
                  : 'Stable (0/100)'}
              </span>
              {stateLiveMetrics.isImpacted && (
                <span className="text-[10px] opacity-75 font-normal whitespace-nowrap">
                  ({stateLiveMetrics.impactedCount}/{stateLiveMetrics.totalCount})
                </span>
              )}
            </span>
          </div>

          {/* SDRF Battalions - guaranteed visible with whitespace-nowrap */}
          <div className="flex items-center gap-1.5 text-xs shrink-0 whitespace-nowrap">
            <span className="text-emerald-400 font-mono text-[11px] font-bold whitespace-nowrap">
              {selectedStateProfile.sdrfBattalions} SDRF Battalions
            </span>
          </div>
        </div>

        {/* Right: Live Telemetry Indicator & Panel Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
          {/* Live Telemetry Status Pill */}
          <div className="hidden 2xl:flex items-center gap-2 px-3 py-2 bg-[#090d16]/95 border border-emerald-500/40 rounded-xl shadow-xl backdrop-blur-xl text-xs whitespace-nowrap shrink-0">
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute opacity-75" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="font-mono font-bold tracking-wider text-emerald-400 uppercase text-[11px]">
              LIVE
            </span>
            <span className="text-slate-400 text-[10px] font-mono">
              • Real-Time
            </span>
          </div>

          {/* Toggle Left SDRF Drawer Button */}
          <button
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className={`h-9 sm:h-10 px-3 sm:px-3.5 flex items-center gap-1.5 sm:gap-2 rounded-xl text-xs font-bold border backdrop-blur-xl transition-all shadow-xl cursor-pointer whitespace-nowrap shrink-0 ${
              isLeftPanelOpen
                ? 'bg-blue-600/30 border-blue-500/60 text-blue-300'
                : 'bg-[#090d16]/95 border-[#1b2a44] text-slate-300 hover:text-white hover:bg-[#121c2e]'
            }`}
            title="Toggle Resource & Dispatches Panel"
          >
            <Layers size={14} className="text-blue-400" />
            <span className="hidden sm:inline">Force & Logistics</span>
            {stateDispatches.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                {stateDispatches.length}
              </span>
            )}
          </button>

          {/* 2D / 3D Tilt Toggle */}
          <button
            onClick={handleToggle3D}
            className={`h-9 sm:h-10 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-xl text-xs font-bold border backdrop-blur-xl transition-all shadow-xl cursor-pointer whitespace-nowrap shrink-0 ${
              is3DMode
                ? 'bg-blue-600/30 border-blue-500/60 text-blue-300'
                : 'bg-[#090d16]/95 border-[#1b2a44] text-slate-300 hover:text-white hover:bg-[#121c2e]'
            }`}
            title="Toggle 2D / 3D Oblique View"
          >
            <Compass size={13} className={is3DMode ? 'rotate-45 text-blue-400' : ''} />
            <span>{is3DMode ? '3D' : '2D'}</span>
          </button>

          {/* Reset Camera to State */}
          <button
            onClick={() => flyToState(selectedStateId)}
            className="h-9 sm:h-10 w-9 sm:w-10 flex items-center justify-center bg-[#090d16]/95 border border-[#1b2a44] hover:border-blue-500/50 hover:bg-[#121c2e] text-slate-300 hover:text-white rounded-xl backdrop-blur-xl transition-all shadow-xl cursor-pointer shrink-0"
            title="Recenter Camera on State"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      {/* FIXED FORCE & LOGISTICS FLOATING BUTTON - Always visible on the left, does not hide anything */}
      <div className="absolute top-15 sm:top-16 left-3 sm:left-4 z-40 pointer-events-auto flex items-center gap-2">
        <button
          id="fixed-force-logistics-trigger-btn"
          onClick={() => setIsLeftPanelOpen((prev) => !prev)}
          className={`h-9 sm:h-10 px-3 sm:px-3.5 flex items-center gap-2 rounded-xl text-xs font-bold border backdrop-blur-xl transition-all shadow-2xl cursor-pointer ${
            isLeftPanelOpen
              ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/30 ring-2 ring-blue-500/20'
              : 'bg-[#090d16]/95 border-[#1b2a44] hover:border-blue-500/70 text-slate-200 hover:text-white hover:bg-[#121c2e] shadow-xl'
          }`}
          title={isLeftPanelOpen ? 'Collapse Force & Logistics Panel' : 'Open Force & Logistics Panel'}
        >
          <Layers size={14} className={isLeftPanelOpen ? 'text-white' : 'text-blue-400'} />
          <span className="whitespace-nowrap font-bold">Force & Logistics</span>
          {stateDispatches.length > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-mono font-bold flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              {stateDispatches.length} active
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono inline font-normal">
              ({selectedStateProfile.sdrfBattalions} Battalions)
            </span>
          )}
        </button>
      </div>

      {/* TOP FLOATING NOTIFICATION: Mission Arrival Alert Banner */}
      <AnimatePresence>
        {arrivedNotificationMission && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className="absolute top-18 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-auto"
          >
            <div className="p-3.5 bg-[#081220]/95 border-2 border-emerald-500/80 rounded-2xl shadow-2xl shadow-emerald-500/20 backdrop-blur-2xl flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-1 flex items-center justify-center shrink-0">
                  <UnitIcon3D
                    type={arrivedNotificationMission.unitType || (arrivedNotificationMission.items?.[0]?.unitType) || 'militaryHelicopter'}
                    size={38}
                    animated={true}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 uppercase">
                      Mission Arrived
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {arrivedNotificationMission.id}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate mt-0.5">
                    Reached {arrivedNotificationMission.targetDistrict}
                  </h4>
                  <p className="text-[10px] text-slate-300 truncate">
                    {arrivedNotificationMission.items && arrivedNotificationMission.items.length > 0
                      ? arrivedNotificationMission.items.map((it) => `${it.quantity} ${it.unitLabel}`).join(', ')
                      : 'Relief and Rescue Task Force deployed on ground'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setSelectedReachedMission(arrivedNotificationMission);
                    setArrivedNotificationMission(null);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileText size={12} />
                  <span>View Reached Info</span>
                </button>
                <button
                  onClick={() => setArrivedNotificationMission(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  title="Dismiss Notification"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DeckGL & Basemap Container */}
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
        controller={true}
        layers={layers}
        onClick={handleMapClick}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'default')}
      >
        <MapGL
          mapLib={maplibregl}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          reuseMaps
          attributionControl={false}
        />
      </DeckGL>

      {/* LEFT FLOATING PANEL: SDRF Resources & Live Dispatches Drawer */}
      <AnimatePresence>
        {isLeftPanelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-[106px] sm:top-[116px] left-3 sm:left-4 z-40 w-[310px] sm:w-92 max-h-[calc(100vh-130px)] flex flex-col bg-[#090d16]/95 border border-[#172338] backdrop-blur-2xl rounded-2xl shadow-2xl p-4 pointer-events-auto space-y-3"
          >
            {/* Header & Tabs */}
            <div className="flex items-center justify-between border-b border-[#141f32] pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-blue-400" />
                  <span>{selectedStateProfile.stateName} Logistics</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  HQ: {selectedStateProfile.capital}
                </p>
              </div>
              <button
                onClick={() => setIsLeftPanelOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Collapse Panel"
              >
                <X size={15} />
              </button>
            </div>

            {/* Sub-Tabs: Inventory vs Live Dispatches */}
            <div className="flex items-center gap-1 bg-[#060a14] p-1 rounded-xl border border-[#141f32]">
              <button
                onClick={() => setActiveLeftTab('inventory')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  activeLeftTab === 'inventory'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SDRF Resources
              </button>
              <button
                onClick={() => setActiveLeftTab('dispatches')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeLeftTab === 'dispatches'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Dispatches</span>
                {stateDispatches.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                    {stateDispatches.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: Force & Resource Inventory */}
            {activeLeftTab === 'inventory' && (
              <div className="space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 max-h-[420px]">
                {/* SDRF Battalion Info */}
                <div className="p-2.5 bg-[#0a1120] border border-[#15233c] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">SDRF Field Battalions</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {selectedStateProfile.sdrfBattalions} Active
                  </span>
                </div>

                {/* 6 Grid Resources with Clear Res (Standby), Act (Active), and Total */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* 1. Water Bowsers */}
                  <div className="p-2 bg-[#0c1322] border border-[#16233a] rounded-xl space-y-1">
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Droplets size={13} className="text-cyan-400 shrink-0" />
                        <span className="text-[11px] text-slate-200 font-bold truncate">Water Bowsers</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">Tot: {selectedStateProfile.resources.waterTankers.total.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#16233a]">
                      <span className="text-emerald-400 font-bold">Res: {selectedStateProfile.resources.waterTankers.inReserve.toLocaleString()}</span>
                      <span className="text-cyan-300 font-semibold">Act: {selectedStateProfile.resources.waterTankers.active.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 2. Heavy Earthmovers */}
                  <div className="p-2 bg-[#0c1322] border border-[#16233a] rounded-xl space-y-1">
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Truck size={13} className="text-amber-400 shrink-0" />
                        <span className="text-[11px] text-slate-200 font-bold truncate">Earthmovers</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">Tot: {selectedStateProfile.resources.debrisMachinery.total.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#16233a]">
                      <span className="text-emerald-400 font-bold">Res: {selectedStateProfile.resources.debrisMachinery.inReserve.toLocaleString()}</span>
                      <span className="text-amber-300 font-semibold">Act: {selectedStateProfile.resources.debrisMachinery.active.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 3. Emergency Generators */}
                  <div className="p-2 bg-[#0c1322] border border-[#16233a] rounded-xl space-y-1">
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Zap size={13} className="text-yellow-400 shrink-0" />
                        <span className="text-[11px] text-slate-200 font-bold truncate">Generators</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">Tot: {selectedStateProfile.resources.emergencyGenerators.total.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#16233a]">
                      <span className="text-emerald-400 font-bold">Res: {selectedStateProfile.resources.emergencyGenerators.inReserve.toLocaleString()}</span>
                      <span className="text-yellow-300 font-semibold">Act: {selectedStateProfile.resources.emergencyGenerators.active.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 4. Family Rations */}
                  <div className="p-2 bg-[#0c1322] border border-[#16233a] rounded-xl space-y-1">
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Package size={13} className="text-emerald-400 shrink-0" />
                        <span className="text-[11px] text-slate-200 font-bold truncate">Rations</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">Tot: {(selectedStateProfile.resources.rationPackets.total / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#16233a]">
                      <span className="text-emerald-400 font-bold">Res: {(selectedStateProfile.resources.rationPackets.inReserve / 1000).toFixed(0)}k</span>
                      <span className="text-emerald-300 font-semibold">Act: {(selectedStateProfile.resources.rationPackets.active / 1000).toFixed(0)}k</span>
                    </div>
                  </div>

                  {/* 5. Tents & Tarps */}
                  <div className="p-2 bg-[#0c1322] border border-[#16233a] rounded-xl space-y-1">
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Tent size={13} className="text-purple-400 shrink-0" />
                        <span className="text-[11px] text-slate-200 font-bold truncate">Tents / Tarps</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">Tot: {(selectedStateProfile.resources.tarpTentKits.total / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#16233a]">
                      <span className="text-emerald-400 font-bold">Res: {(selectedStateProfile.resources.tarpTentKits.inReserve / 1000).toFixed(0)}k</span>
                      <span className="text-purple-300 font-semibold">Act: {(selectedStateProfile.resources.tarpTentKits.active / 1000).toFixed(0)}k</span>
                    </div>
                  </div>

                  {/* 6. Dewatering Pumps */}
                  <div className="p-2 bg-[#0c1322] border border-[#16233a] rounded-xl space-y-1">
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Gauge size={13} className="text-blue-400 shrink-0" />
                        <span className="text-[11px] text-slate-200 font-bold truncate">Trash Pumps</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">Tot: {selectedStateProfile.resources.waterMotorPumps.total.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#16233a]">
                      <span className="text-emerald-400 font-bold">Res: {selectedStateProfile.resources.waterMotorPumps.inReserve.toLocaleString()}</span>
                      <span className="text-blue-300 font-semibold">Act: {selectedStateProfile.resources.waterMotorPumps.active.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Authorize New Dispatch Action Button */}
                <button
                  onClick={() => setShowNewDispatchModal(true)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Send size={14} />
                  <span>Authorize Emergency Dispatch</span>
                </button>
              </div>
            )}

            {/* TAB 2: Live Convoy Dispatches */}
            {activeLeftTab === 'dispatches' && (
              <div className="space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 max-h-[420px]">
                {stateDispatches.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-[#060a14] rounded-xl border border-[#141f32] space-y-2">
                    <p>No active convoys in {selectedStateProfile.stateName}.</p>
                    <button
                      onClick={() => setShowNewDispatchModal(true)}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send size={12} />
                      <span>Launch Dispatch</span>
                    </button>
                  </div>
                ) : (
                  stateDispatches.map((disp) => {
                    const leadUnitType: DispatchUnitType =
                      disp.unitType ||
                      (disp.items && disp.items[0]?.unitType) ||
                      (disp.items && disp.items[0]?.resourceType in DISPATCH_UNITS
                        ? (disp.items[0].resourceType as DispatchUnitType)
                        : 'cargoTruck');
                    const unitMeta = getUnitInfo(leadUnitType);
                    const items = disp.items && disp.items.length > 0 ? disp.items : [];

                    return (
                      <div
                        key={disp.id}
                        className={`p-3 bg-[#0a1120] border rounded-xl space-y-2 transition-all text-left shadow-lg ${
                          disp.status === 'Arrived & Active'
                            ? 'border-emerald-500/50 bg-[#08151f]'
                            : 'border-[#15233c] hover:border-blue-500/40'
                        }`}
                      >
                        {/* Header: 3D Unit Icon, ID, Priority and Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#0e1a2e] border border-[#1d3150] p-1 flex items-center justify-center shrink-0">
                              <UnitIcon3D type={leadUnitType} size={30} animated={disp.status === 'In Transit'} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] font-bold text-blue-400">{disp.id}</span>
                                <span
                                  className={`text-[8px] px-1.5 py-0.2 rounded font-black uppercase ${
                                    disp.priority === 'CRITICAL'
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      : disp.priority === 'HIGH'
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  }`}
                                >
                                  {disp.priority}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold truncate">
                                {unitMeta.serviceBranch} • {disp.transportMode}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => cancelDispatch(disp.id)}
                              className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                              title="Recall Convoy & Return Resources to Reserve"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Origin -> Destination corridor */}
                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="text-slate-400 text-[10px] truncate max-w-[110px]" title={disp.originDepot}>
                            {disp.originDepot.split('(')[0]}
                          </span>
                          <ArrowRight size={11} className="text-blue-400 shrink-0 mx-1" />
                          <span className="font-bold text-slate-100 text-[11px] truncate">{disp.targetDistrict}</span>
                        </div>

                        {/* Multi-Resource Items Manifest Breakdown */}
                        <div className="space-y-1 bg-[#060a14] p-2 rounded-lg border border-[#141f32]">
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                            Payload Manifest ({items.length} resource types):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {items.map((it, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-[#101b2e] border border-[#1a2d4b] text-slate-200 font-mono flex items-center gap-1"
                              >
                                <span className="text-cyan-400 font-bold">{it.quantity.toLocaleString()}</span>
                                <span className="truncate">{it.unitLabel}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Progress Bar & Real-Time Status / Reached Actions */}
                        <div className="space-y-1.5 pt-0.5">
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                disp.status === 'Arrived & Active'
                                  ? 'bg-emerald-500'
                                  : disp.priority === 'CRITICAL'
                                  ? 'bg-red-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${disp.progress}%` }}
                            ></div>
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            {disp.status === 'Arrived & Active' ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCheck size={12} />
                                <span>Reached & Active on Ground</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center gap-1">
                                <Clock size={10} className="text-amber-400" />
                                <span>{disp.progress}% en route • ETA: {disp.etaMinutes}m</span>
                              </span>
                            )}

                            {disp.status === 'Arrived & Active' ? (
                              <button
                                onClick={() => setSelectedReachedMission(disp)}
                                className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                              >
                                <FileText size={10} />
                                <span>Reached Info</span>
                              </button>
                            ) : (
                              <span className="font-mono text-[9px] text-slate-400 font-bold">{disp.transportMode}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {stateDispatches.length > 0 && (
                  <button
                    onClick={() => setShowNewDispatchModal(true)}
                    className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send size={12} />
                    <span>Add Another Dispatch</span>
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT FLOATING PANEL: District Inspection OR Warehouse Inspection */}
      <AnimatePresence>
        {selectedWarehouse ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-16 sm:top-[72px] right-3 sm:right-4 z-40 w-80 sm:w-92 bg-[#090d16]/95 border border-emerald-500/40 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl pointer-events-auto space-y-3"
          >
            <div className="flex items-start justify-between border-b border-[#141f32] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300">
                    {selectedWarehouse.facilityName}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedWarehouse.district}, {selectedWarehouse.state}
                </p>
              </div>
              <button
                onClick={() => setSelectedWarehouse(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Warehouse Details */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-[#0a1420] border border-[#142d3c] rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Facility Type:</span>
                  <span className="font-bold text-emerald-400">{selectedWarehouse.facilityType}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">GPS Coordinates:</span>
                  <span className="font-mono text-slate-300">
                    [{selectedWarehouse.coordinates[0].toFixed(3)}°E, {selectedWarehouse.coordinates[1].toFixed(3)}°N]
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedOriginWarehouseId(selectedWarehouse.id);
                  setShowNewDispatchModal(true);
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Send size={14} />
                <span>Dispatch From This Warehouse</span>
              </button>
            </div>
          </motion.div>
        ) : inspectedDistrictProfile ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-16 sm:top-[72px] right-3 sm:right-4 z-40 w-80 sm:w-92 bg-[#090d16]/95 border border-blue-500/40 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl pointer-events-auto space-y-3"
          >
            <div className="flex items-start justify-between border-b border-[#141f32] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    {inspectedDistrictProfile.districtName}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {inspectedDistrictProfile.stateName}
                </p>
              </div>
              <button
                onClick={() => setSelectedDistrictProps(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Vulnerability Score Card */}
            <div className="p-3 bg-[#0a1120] border border-[#15233c] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Activity size={13} className="text-blue-400" />
                  Vulnerability Score
                </span>
                <span
                  className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg border ${
                    inspectedDistrictProfile.vulnerabilityScore >= 72
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : inspectedDistrictProfile.vulnerabilityScore >= 55
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}
                >
                  {inspectedDistrictProfile.vulnerabilityScore} / 100 [{inspectedDistrictProfile.riskTier}]
                </span>
              </div>

              {/* 3-Pillar Progress Mini-Bars */}
              <div className="space-y-1.5 pt-1 text-[10px]">
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>1. Exposure (Hazard & Density)</span>
                    <span className="font-mono text-cyan-400 font-bold">{inspectedDistrictProfile.exposureScore}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full" style={{ width: `${inspectedDistrictProfile.exposureScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>2. Sensitivity (Poverty & Weak Housing)</span>
                    <span className="font-mono text-amber-400 font-bold">{inspectedDistrictProfile.sensitivityScore}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${inspectedDistrictProfile.sensitivityScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>3. Adaptive Deficit (Lack of Hospitals & EWS)</span>
                    <span className="font-mono text-emerald-400 font-bold">{inspectedDistrictProfile.lackOfCapacityScore}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${inspectedDistrictProfile.lackOfCapacityScore}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Nearest Relief Warehouse Info */}
            <div className="p-2.5 bg-[#060a14] rounded-xl border border-[#141f32] space-y-1 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Nearest Relief Staging Base
              </span>
              {(() => {
                const centroid = selectedDistrictProps.centroid || [
                  stateGeoConfig.center[0],
                  stateGeoConfig.center[1],
                ];
                const { warehouse: nearest, distanceKm } = findNearestWarehouse(centroid, selectedStateId);
                return (
                  <div className="flex items-center justify-between pt-1">
                    <div className="truncate pr-2">
                      <p className="font-bold text-emerald-300 truncate">{nearest.facilityName}</p>
                      <p className="text-[10px] text-slate-400">{nearest.district}</p>
                    </div>
                    <span className="font-mono font-bold text-cyan-300 shrink-0 text-xs">
                      {Math.round(distanceKm)} km
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Direct Dispatch to District CTA */}
            <button
              onClick={() => {
                setNewTargetDistrict(inspectedDistrictProfile.districtName);
                setShowNewDispatchModal(true);
              }}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send size={14} />
              <span>Direct Dispatch to {inspectedDistrictProfile.districtName}</span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* BOTTOM DOCK: Layer Toggles & Vulnerability Scale Indicator */}
      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 bg-[#090d16]/95 border border-[#172338] px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-xl pointer-events-auto">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 pr-2.5 border-r border-[#15233c]">
          <Layers size={13} className="text-blue-400" />
          <span>Layers</span>
        </div>

        {/* Toggle Supply Routes */}
        <button
          onClick={() => setLayerToggles((p) => ({ ...p, convoys: !p.convoys }))}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            layerToggles.convoys
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck size={12} />
          <span>Convoys</span>
        </button>

        {/* Toggle 68 Warehouses */}
        <button
          onClick={() => setLayerToggles((p) => ({ ...p, warehouses: !p.warehouses }))}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            layerToggles.warehouses
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 size={12} />
          <span>68 Warehouses</span>
        </button>

        {/* Toggle Vulnerability Choropleth Tint */}
        <button
          onClick={() => setLayerToggles((p) => ({ ...p, vulnerabilityTint: !p.vulnerabilityTint }))}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            layerToggles.vulnerabilityTint
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity size={12} />
          <span>Risk Color-Coding</span>
        </button>

        {/* Compact Vulnerability Gradient Scale */}
        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-[#15233c] text-[10px] text-slate-400 font-mono">
          <span>0 (Low)</span>
          <div className="w-16 h-2 rounded-full bg-gradient-to-r from-[#10b981] via-[#f59e0b] via-[#f97316] to-[#ef4444]" />
          <span>100 (Crit)</span>
        </div>
      </footer>

      {/* MODAL: Authorize New Rapid Dispatch with Integrated Vulnerability Telemetry */}
      <AnimatePresence>
        {showNewDispatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070a12]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#090d16] border border-[#1e2f4d] rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 select-none max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800"
            >
              <div className="flex items-start justify-between border-b border-[#15233c] pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400">
                    <Send size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Authorize Emergency Dispatch</h3>
                    <p className="text-xs text-slate-400">
                      Dispatched from official NDMA / SDMA Warehouse Staging Facilities
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewDispatchModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateDispatch} className="space-y-4">
                {/* 1. Origin Warehouse Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>1. Origin Relief Warehouse</span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {stateWarehouses.length} in {selectedStateProfile.stateName}
                    </span>
                  </label>
                  <select
                    value={selectedOriginWarehouseId}
                    onChange={(e) => setSelectedOriginWarehouseId(e.target.value)}
                    className="w-full p-2.5 bg-[#0d1524] border border-[#1b2b46] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <optgroup label={`${selectedStateProfile.stateName} Facilities`}>
                      {stateWarehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.facilityName} ({wh.district} - {wh.facilityType})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other National Warehouses">
                      {WAREHOUSE_FACILITIES.filter((w) => !stateWarehouses.some((sw) => sw.id === w.id)).map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.facilityName} ({wh.state} - {wh.district})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* 2. Target District Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>2. Target Impact District</span>
                    <span className="text-[10px] text-blue-400">Sorted by Vulnerability Score</span>
                  </label>
                  <select
                    value={newTargetDistrict}
                    onChange={(e) => setNewTargetDistrict(e.target.value)}
                    className="w-full p-2.5 bg-[#0d1524] border border-[#1b2b46] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    {availableTargetDistricts.map((dist) => (
                      <option key={dist.name} value={dist.name}>
                        {dist.name} (Vuln: {dist.vulnScore} • {dist.riskTier} Risk)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. TARGET DISTRICT VULNERABILITY & DECISION SUPPORT CARD */}
                {targetDistrictVulnerability && (
                  <div className="p-3 bg-[#0a1324] border border-blue-500/30 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-blue-400" />
                        <span className="text-xs font-bold text-slate-200">
                          {targetDistrictVulnerability.districtName} Vulnerability Assessment
                        </span>
                      </div>
                      <span
                        className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg border ${
                          targetDistrictVulnerability.vulnerabilityScore >= 72
                            ? 'bg-red-500/20 text-red-400 border-red-500/40'
                            : targetDistrictVulnerability.vulnerabilityScore >= 55
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        }`}
                      >
                        Score: {targetDistrictVulnerability.vulnerabilityScore} / 100 [{targetDistrictVulnerability.riskTier}]
                      </span>
                    </div>

                    {/* 3-Pillar Metrics Breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className="p-2 bg-[#060c18] rounded-lg border border-[#13233c]">
                        <span className="text-slate-400 block">1. Exposure</span>
                        <span className="font-mono font-bold text-cyan-400">{targetDistrictVulnerability.exposureScore}%</span>
                      </div>
                      <div className="p-2 bg-[#060c18] rounded-lg border border-[#13233c]">
                        <span className="text-slate-400 block">2. Sensitivity</span>
                        <span className="font-mono font-bold text-amber-400">{targetDistrictVulnerability.sensitivityScore}%</span>
                      </div>
                      <div className="p-2 bg-[#060c18] rounded-lg border border-[#13233c]">
                        <span className="text-slate-400 block">3. Adaptive Deficit</span>
                        <span className="font-mono font-bold text-emerald-400">{targetDistrictVulnerability.lackOfCapacityScore}%</span>
                      </div>
                    </div>

                    {/* Smart Decision Recommendations */}
                    {targetDistrictVulnerability.recommendedResources.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Suggested Resources Based on Vulnerability Drivers:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {targetDistrictVulnerability.recommendedResources.map((rec, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                const catalog = DISPATCH_RESOURCE_CATALOG[rec.type];
                                const qty = catalog ? catalog.defaultQty : (rec.type === 'waterMotorPumps' ? 25 : rec.type === 'tarpTentKits' ? 5000 : rec.type === 'rationPackets' ? 10000 : rec.type === 'floatingClinics' ? 4 : 10);
                                const unitLabel = getResourceDisplayName(rec.type);
                                const unitType = getResourceDefaultUnitType(rec.type);
                                setManifestItems((prev) => [
                                  ...prev,
                                  {
                                    id: `manifest-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                    resourceType: rec.type,
                                    quantity: qty,
                                    unitLabel,
                                    unitType,
                                  },
                                ]);
                              }}
                              className="text-[10px] px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                              title={rec.reason}
                            >
                              <Sparkles size={10} className="text-blue-400" />
                              <span>+ Add {rec.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Route & ETA Telemetry */}
                <div className="p-2.5 bg-[#0b1322] border border-[#15233c] rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Navigation size={13} className="text-blue-400" />
                    <span>Road Corridor Distance:</span>
                    <span className="font-mono font-bold text-white">{estimatedRouteInfo.distanceKm} km</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                    <Clock size={13} />
                    <span>Est. ETA ~{estimatedRouteInfo.etaMinutes} mins</span>
                  </div>
                </div>

                {/* 4. PRESET TACTICAL BUNDLES */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} className="text-cyan-400" />
                      <span>Quick Tactical Bundles</span>
                    </label>
                    <span className="text-[10px] text-slate-400">1-Click Auto-Configure</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DISPATCH_PRESET_BUNDLES.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPresetBundle(preset)}
                        className="p-2 bg-[#0c1424] hover:bg-[#132038] border border-[#182844] hover:border-cyan-500/50 rounded-xl text-left transition-all cursor-pointer space-y-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                            {preset.name}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 line-clamp-1">{preset.description}</p>
                        <div className="flex items-center gap-1 text-[9px] text-cyan-400 font-mono font-semibold">
                          <span>{preset.items.length} Resource Types</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. MULTI-RESOURCE PAYLOAD MANIFEST BUILDER */}
                <div className="space-y-2 bg-[#070e1c] p-3.5 rounded-xl border border-[#162744]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={13} className="text-emerald-400" />
                      <span>Multi-Resource Payload Manifest ({manifestItems.length} Items)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Combine multiple supplies in 1 convoy</span>
                  </div>

                  {/* Add New Item Row with Live Reserve Telemetry */}
                  <div className="p-2.5 bg-[#0a1426] border border-[#192b4a] rounded-xl space-y-2">
                    {(() => {
                      const resKey = mapToResourceKey(itemToAddCategory);
                      const available = selectedStateProfile.resources[resKey]?.inReserve ?? 0;
                      return (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-300 font-bold">Add Resource to Manifest:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">
                              Standby in {selectedStateProfile.stateName}:{' '}
                              <span className={`font-mono font-bold ${available > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {available.toLocaleString()} units
                              </span>
                            </span>
                            {available > 0 && (
                              <button
                                type="button"
                                onClick={() => setItemToAddQty(available)}
                                className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded font-mono font-bold text-[9px] cursor-pointer"
                              >
                                SET MAX
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-7">
                        <select
                          value={itemToAddCategory}
                          onChange={(e) => {
                            const newCat = e.target.value;
                            setItemToAddCategory(newCat);
                            const catalog = DISPATCH_RESOURCE_CATALOG[newCat];
                            const resKey = mapToResourceKey(newCat);
                            const available = selectedStateProfile.resources[resKey]?.inReserve ?? 0;
                            if (catalog) {
                              setItemToAddQty(Math.min(catalog.defaultQty, available > 0 ? available : catalog.defaultQty));
                            }
                          }}
                          className="w-full p-2 bg-[#060c16] border border-[#1b2f50] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
                        >
                          <optgroup label="Emergency Tactical Vehicles & Units">
                            <option value="ambulance">ALS Advanced Trauma Ambulances</option>
                            <option value="fireEngine">High-Reach Fire & Rescue Engines</option>
                            <option value="policeUnit">Police & SDRF Quick Response Units</option>
                            <option value="militaryHelicopter">IAF / Military Mi-17 Heavy Helicopters</option>
                            <option value="motorBoat">Inflatable Motor Boats (Gemini Craft)</option>
                            <option value="reconDrone">Disaster Recon Drones</option>
                          </optgroup>
                          <optgroup label="Disaster Relief Supplies & Hardware">
                            <option value="rationPackets">Family Food Ration Packets</option>
                            <option value="medicalFirstAidUnits">Trauma & Heat-Stroke First Aid Kits</option>
                            <option value="waterTankers">Potable Water Bowsers (10,000 L)</option>
                            <option value="debrisMachinery">Heavy Debris Excavators & Earthmovers</option>
                            <option value="emergencyGenerators">Emergency DG Generator Sets</option>
                            <option value="tarpTentKits">Weatherproof Disaster Tents & Tarps</option>
                            <option value="waterMotorPumps">High-Volume Dewatering Trash Pumps</option>
                            <option value="floatingClinics">Inflatable Boat Mobile Clinics</option>
                          </optgroup>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        {(() => {
                          const resKey = mapToResourceKey(itemToAddCategory);
                          const available = selectedStateProfile.resources[resKey]?.inReserve ?? 0;
                          return (
                            <input
                              type="number"
                              min={1}
                              max={available > 0 ? available : 50000}
                              value={itemToAddQty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setItemToAddQty(available > 0 ? Math.min(Math.max(1, val), available) : Math.max(1, val));
                              }}
                              className="w-full p-2 bg-[#060c16] border border-[#1b2f50] rounded-lg text-xs text-slate-200 font-mono font-bold focus:outline-none focus:border-cyan-500"
                              placeholder="Qty"
                            />
                          );
                        })()}
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={handleAddManifestItem}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Visual Manifest Items Table */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {manifestItems.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 bg-[#060c16] rounded-lg border border-[#16233a]">
                        Manifest is empty. Add resources above or select a Quick Preset.
                      </div>
                    ) : (
                      manifestItems.map((item) => {
                        const resKey = mapToResourceKey(item.resourceType);
                        const available = selectedStateProfile.resources[resKey]?.inReserve ?? item.quantity;
                        const isAtMax = item.quantity >= available && available > 0;

                        return (
                          <div
                            key={item.id}
                            className="p-2 bg-[#0a1322] border border-[#16253c] rounded-lg flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded bg-[#101e34] flex items-center justify-center shrink-0">
                                <UnitIcon3D
                                  type={item.unitType || (item.resourceType in DISPATCH_UNITS ? item.resourceType as DispatchUnitType : 'cargoTruck')}
                                  size={18}
                                />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-200 truncate">{item.unitLabel}</span>
                                <span className="text-[9px] text-slate-400">
                                  Reserve in state: <span className="text-emerald-400 font-mono font-bold">{available.toLocaleString()}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center bg-[#060c18] border border-[#182a46] rounded-md">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateManifestItemQty(item.id, item.quantity - (item.quantity > 50 ? 50 : 1))}
                                  className="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-l cursor-pointer font-bold"
                                >
                                  -
                                </button>
                                <span className="px-2 font-mono font-bold text-cyan-300 text-xs">
                                  {item.quantity.toLocaleString()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateManifestItemQty(item.id, Math.min(available > 0 ? available : item.quantity + 50, item.quantity + (item.quantity >= 50 ? 50 : 1)))}
                                  className="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-r cursor-pointer font-bold"
                                  disabled={isAtMax}
                                >
                                  +
                                </button>
                              </div>

                              {isAtMax && (
                                <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1 py-0.5 rounded">
                                  MAX
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveManifestItem(item.id)}
                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 7. Transport Corridor & Emergency Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Transport Corridor
                    </label>
                    <select
                      value={newTransportMode}
                      onChange={(e) => setNewTransportMode(e.target.value as any)}
                      className="w-full p-2.5 bg-[#0d1524] border border-[#1b2b46] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="Green Road Corridor">Green Road Corridor (NDMA Express Lane)</option>
                      <option value="Waterway Fleet / Boat">Waterway Fleet / Gemini Motor Boats</option>
                      <option value="High-Mobility 4x4">High-Mobility 4x4 Heavy All-Terrain</option>
                      <option value="IAF Airlift">IAF Airlift (Mi-17 / C-130J Hercules)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Emergency Priority
                    </label>
                    <div className="flex items-center gap-1.5">
                      {(['CRITICAL', 'HIGH', 'ROUTINE'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewPriority(p)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            newPriority === p
                              ? p === 'CRITICAL'
                                ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-500/25'
                                : p === 'HIGH'
                                ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/25'
                                : 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/25'
                              : 'bg-[#0d1524] border-[#1b2b46] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#15233c]">
                  <div className="text-xs text-slate-400">
                    <span className="font-mono text-cyan-400 font-bold">{manifestItems.length}</span> Resources • ETA ~
                    <span className="font-mono text-emerald-400 font-bold">{estimatedRouteInfo.etaMinutes} mins</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewDispatchModal(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={manifestItems.length === 0}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Send size={14} />
                      <span>Authorize & Launch Convoy</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REACHED INFORMATION & FIELD DEBRIEF SITUATION REPORT */}
      <AnimatePresence>
        {selectedReachedMission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070a12]/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#090e1a] border border-emerald-500/50 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl shadow-emerald-500/10 space-y-4 select-none max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800"
            >
              {/* Header with 3D Hero Icon */}
              <div className="flex items-start justify-between border-b border-[#14233c] pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 p-2 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                    <UnitIcon3D
                      type={selectedReachedMission.unitType || (selectedReachedMission.items?.[0]?.unitType) || 'militaryHelicopter'}
                      size={52}
                      animated={true}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        DELIVERED & OPERATIONAL
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-300">
                        {selectedReachedMission.id}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          selectedReachedMission.priority === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {selectedReachedMission.priority}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white mt-1">
                      Convoy Reached {selectedReachedMission.targetDistrict}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Dispatched from {selectedReachedMission.originDepot} via {selectedReachedMission.transportMode}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedReachedMission(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick SitRep Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-[#0a1526] border border-[#152a4a] rounded-xl text-left">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Arrival Timestamp
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5 block">
                    {selectedReachedMission.arrivalReport?.arrivedAt || '12:45 IST'}
                  </span>
                  <span className="text-[9px] text-slate-400">On Schedule</span>
                </div>

                <div className="p-3 bg-[#0a1526] border border-[#152a4a] rounded-xl text-left">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Transit Duration
                  </span>
                  <span className="text-sm font-mono font-bold text-cyan-400 mt-0.5 block">
                    {selectedReachedMission.arrivalReport?.transitDurationMinutes || 42} mins
                  </span>
                  <span className="text-[9px] text-slate-400">Green corridor speed</span>
                </div>

                <div className="p-3 bg-[#0a1526] border border-[#152a4a] rounded-xl text-left">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Population Served
                  </span>
                  <span className="text-sm font-mono font-bold text-amber-400 mt-0.5 block">
                    {(selectedReachedMission.arrivalReport?.beneficiariesServed || 4500).toLocaleString()}+
                  </span>
                  <span className="text-[9px] text-slate-400">Direct beneficiaries</span>
                </div>

                <div className="p-3 bg-[#0a1526] border border-[#152a4a] rounded-xl text-left">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Risk Deficit Relief
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-300 mt-0.5 block">
                    -{selectedReachedMission.arrivalReport?.vulnerabilityReductionPct || 24}%
                  </span>
                  <span className="text-[9px] text-slate-400">Capacity increase</span>
                </div>
              </div>

              {/* Itemized Deliverables Table */}
              <div className="space-y-2 bg-[#060c18] p-3.5 rounded-xl border border-[#132238] text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Delivered Multi-Resource Inventory Manifest:</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">100% Accounted For</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {(selectedReachedMission.items && selectedReachedMission.items.length > 0
                    ? selectedReachedMission.items
                    : [
                        {
                          id: 'fallback-1',
                          resourceType: 'ambulance',
                          quantity: 4,
                          unitLabel: 'ALS Trauma Ambulances',
                          unitType: 'ambulance' as DispatchUnitType,
                        },
                      ]
                  ).map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#091222] border border-[#182844] rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#0e1d35] border border-[#1c355e] p-1 flex items-center justify-center shrink-0">
                          <UnitIcon3D
                            type={it.unitType || (it.resourceType in DISPATCH_UNITS ? it.resourceType as DispatchUnitType : 'cargoTruck')}
                            size={24}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-100 truncate">{it.unitLabel}</span>
                      </div>
                      <div className="text-right shrink-0 font-mono text-xs font-black text-cyan-300">
                        {it.quantity.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Field Commander Situation Report */}
              <div className="p-3 bg-[#0a1324] border border-blue-500/30 rounded-xl space-y-1.5 text-left text-xs">
                <div className="flex items-center gap-2 text-blue-300 font-bold">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Field Commander Situation Report (SitRep)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {selectedReachedMission.arrivalReport?.fieldCommanderNotes ||
                    `Convoy has reached ${selectedReachedMission.targetDistrict} forward operations base. Field hospital triage tent erected, high-mobility boats launched into inundated tributaries.`}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#132238]">
                  <span>Status: <strong className="text-emerald-400">Active Ground Operation</strong></span>
                  <span>Incident Command: <strong className="text-slate-200">NDMA / SDMA Task Force 4</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReachedMission(null);
                    setNewTargetDistrict(selectedReachedMission.targetDistrict);
                    setShowNewDispatchModal(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Dispatch Reinforcements to {selectedReachedMission.targetDistrict}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReachedMission(null)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
                >
                  Acknowledge & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
