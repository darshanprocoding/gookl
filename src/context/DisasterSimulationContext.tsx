import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  DisasterType,
  DisasterSeverityOption,
  DisasterParameters,
  DistrictData,
  ZoneScoreCalculation,
  DISASTER_PRESETS,
  SEVERITY_LEVELS_BY_TYPE,
  computeZoneVulnerability,
} from '../utils/vulnerabilityMath';
import {
  STATE_RESOURCE_DATA,
  StateResourceProfile,
} from '../data/stateResourceData';
import {
  DispatchMission,
  DispatchResourceItem,
  DispatchArrivalReport,
  DispatchLog,
  DispatchValidationItem,
  DispatchValidationShortfall,
  ValidateDispatchResult,
} from '../types';

export interface DisasterSimulationContextType {
  // Active Disaster State
  disasterType: DisasterType;
  selectedSeverityId: string;
  epicenter: [number, number];
  epicenterName: string;
  customRadiusKm: number;
  customDecayModel: 'exponential' | 'linear' | 'gaussian';

  // Pillar Weights
  customPillarExposure: number;
  customPillarSensitivity: number;
  customPillarAdaptive: number;

  // Sub-variable Weights
  customExpDist: number;
  customExpDensity: number;
  customExpHist: number;
  customSensDep: number;
  customSensPov: number;
  customSensBldg: number;
  customAdpLife: number;
  customAdpEws: number;

  // Computed / Derived
  currentSeverity: DisasterSeverityOption;
  activeParams: DisasterParameters;

  // Live State-Wise Resource Inventory & Active Dispatches
  statesData: StateResourceProfile[];
  setStatesData: React.Dispatch<React.SetStateAction<StateResourceProfile[]>>;
  dispatches: DispatchMission[];
  setDispatches: React.Dispatch<React.SetStateAction<DispatchMission[]>>;
  dispatchLogs: DispatchLog[];

  // Resource Dispatch Actions & Validation
  validateDispatch: (
    stateId: string,
    items: DispatchValidationItem[] | DispatchValidationItem,
    options?: {
      autoCommit?: boolean;
      missionDetails?: Partial<DispatchMission>;
      interState?: {
        targetStateId: string;
        transitMode: string;
        priority?: 'CRITICAL' | 'HIGH' | 'ROUTINE';
      };
    }
  ) => ValidateDispatchResult;
  dispatchMission: (mission: DispatchMission) => ValidateDispatchResult;
  cancelDispatch: (dispatchId: string) => void;
  updateDispatchProgress: (dispatchId: string, progress: number, status?: DispatchMission['status'], arrivalReport?: DispatchArrivalReport) => void;
  interStateDispatch: (
    sourceStateId: string,
    targetStateId: string,
    resourceKey: keyof StateResourceProfile['resources'],
    quantity: number,
    transitMode: string,
    priority?: 'CRITICAL' | 'HIGH' | 'ROUTINE'
  ) => { success: boolean; message: string; log?: DispatchLog };

  // Mutators & Presets
  setDisasterType: (type: DisasterType) => void;
  setSelectedSeverityId: (id: string) => void;
  setEpicenter: (coords: [number, number]) => void;
  setEpicenterName: (name: string) => void;
  setCustomRadiusKm: (radius: number) => void;
  setCustomDecayModel: (model: 'exponential' | 'linear' | 'gaussian') => void;
  handlePillarWeightChange: (changed: 'exposure' | 'sensitivity' | 'adaptive', rawVal: number) => void;
  setCustomExpDist: (v: number) => void;
  setCustomExpDensity: (v: number) => void;
  setCustomExpHist: (v: number) => void;
  setCustomSensDep: (v: number) => void;
  setCustomSensPov: (v: number) => void;
  setCustomSensBldg: (v: number) => void;
  setCustomAdpLife: (v: number) => void;
  setCustomAdpEws: (v: number) => void;
  setDisasterScenario: (type: DisasterType, epicenter: [number, number], epicenterName: string, severityId?: string) => void;

  // Color & Calculation Helpers
  getZoneColor: (score: number, isAffected?: boolean) => [number, number, number, number];
  getZoneRGB: (score: number, isAffected?: boolean) => [number, number, number];
  getZoneVulnerability: (district: DistrictData) => ZoneScoreCalculation;
}

// Helper to map item resourceType string to StateResourceProfile resource key
export const mapToResourceKey = (resourceType: string): keyof StateResourceProfile['resources'] => {
  const lower = (resourceType || '').toLowerCase().trim();
  
  // Dewatering & Sludge Pumps
  if (lower.includes('pump') || lower.includes('dewatering')) {
    return 'waterMotorPumps';
  }

  // Clean Potable Water Tankers & Bowsers (including 'tank', 'tanks', 'bowser', 'potable')
  if (
    lower.includes('tanker') ||
    lower.includes('tank') ||
    lower.includes('bowser') ||
    lower.includes('potable') ||
    lower.includes('water')
  ) {
    return 'waterTankers';
  }

  // Food & Dry Rations
  if (lower.includes('ration') || lower.includes('food') || lower.includes('meal') || lower.includes('grain')) {
    return 'rationPackets';
  }

  // Medical Float Clinics, Boat Clinics & Mobile Trauma Units
  if (
    lower.includes('clinic') ||
    lower.includes('boat') ||
    lower.includes('ambu') ||
    lower.includes('medic') ||
    lower.includes('firstaid') ||
    lower.includes('drone') ||
    lower.includes('trauma')
  ) {
    return 'floatingClinics';
  }

  // Heavy Debris Machines & Recovery Transport
  if (
    lower.includes('debris') ||
    lower.includes('machin') ||
    lower.includes('truck') ||
    lower.includes('fire') ||
    lower.includes('police') ||
    lower.includes('helico') ||
    lower.includes('excavator') ||
    lower.includes('jcb') ||
    lower.includes('earthmover') ||
    lower.includes('carrier')
  ) {
    return 'debrisMachinery';
  }

  // Emergency Power Generators & DG Sets
  if (lower.includes('gen') || lower.includes('power') || lower.includes('electricity') || lower.includes('dg set')) {
    return 'emergencyGenerators';
  }

  // Tents, Tarpaulins & Emergency Shelters
  if (lower.includes('tent') || lower.includes('tarp') || lower.includes('shelter') || lower.includes('dome')) {
    return 'tarpTentKits';
  }
  
  if (resourceType === 'waterTankers' || resourceType === 'waterBowsers') return 'waterTankers';
  if (resourceType === 'rationPackets' || resourceType === 'rations') return 'rationPackets';
  if (resourceType === 'floatingClinics' || resourceType === 'motorBoat' || resourceType === 'ambulance' || resourceType === 'medicalFirstAidUnits') return 'floatingClinics';
  if (resourceType === 'debrisMachinery' || resourceType === 'cargoTruck' || resourceType === 'fireEngine' || resourceType === 'policeUnit' || resourceType === 'militaryHelicopter') return 'debrisMachinery';
  if (resourceType === 'emergencyGenerators' || resourceType === 'generators') return 'emergencyGenerators';
  if (resourceType === 'tarpTentKits' || resourceType === 'tents') return 'tarpTentKits';
  if (resourceType === 'waterMotorPumps' || resourceType === 'pumps') return 'waterMotorPumps';
  return 'waterTankers';
};

const DisasterSimulationContext = createContext<DisasterSimulationContextType | undefined>(undefined);

export const DisasterSimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core Disaster Parameters
  const [disasterType, setDisasterTypeState] = useState<DisasterType>('flood');
  const [selectedSeverityId, setSelectedSeverityId] = useState<string>('flood-lvl-3');
  const [epicenter, setEpicenter] = useState<[number, number]>([86.98, 25.54]); // Default Kosi River Basin
  const [epicenterName, setEpicenterName] = useState<string>('Kosi River Basin (Bihar)');

  const [customRadiusKm, setCustomRadiusKm] = useState<number>(420);
  const [customDecayModel, setCustomDecayModel] = useState<'exponential' | 'linear' | 'gaussian'>('exponential');

  // Pillar Macro-Weights (W_AC + W_S + W_E = 1.0)
  const [customPillarExposure, setCustomPillarExposure] = useState<number>(0.20);
  const [customPillarSensitivity, setCustomPillarSensitivity] = useState<number>(0.30);
  const [customPillarAdaptive, setCustomPillarAdaptive] = useState<number>(0.50);

  // Sub-variable weights
  const [customExpDist, setCustomExpDist] = useState<number>(0.45);
  const [customExpDensity, setCustomExpDensity] = useState<number>(0.30);
  const [customExpHist, setCustomExpHist] = useState<number>(0.25);

  const [customSensDep, setCustomSensDep] = useState<number>(0.35);
  const [customSensPov, setCustomSensPov] = useState<number>(0.35);
  const [customSensBldg, setCustomSensBldg] = useState<number>(0.30);

  const [customAdpLife, setCustomAdpLife] = useState<number>(0.55);
  const [customAdpEws, setCustomAdpEws] = useState<number>(0.45);

  // Live Synchronized State Inventory & Dispatches
  const [statesData, setStatesData] = useState<StateResourceProfile[]>(() => {
    return JSON.parse(JSON.stringify(STATE_RESOURCE_DATA));
  });
  const [dispatches, setDispatches] = useState<DispatchMission[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([]);

  /**
   * validateDispatch:
   * 1. Validates that outgoing resource quantities do not exceed available inReserve inventory levels.
   * 2. Detects any shortfalls, negative quantities, or invalid state targets.
   * 3. When autoCommit is enabled, performs an atomic state update on statesData:
   *    - Deducts from inReserve (standby inventory)
   *    - Adds to active (deployed in-field)
   *    - Total stock is strictly preserved (total = inReserve + active + inMaintenance)
   *    - Atomically updates dispatches and dispatch logs.
   */
  const validateDispatch = useCallback((
    stateId: string,
    items: DispatchValidationItem[] | DispatchValidationItem,
    options?: {
      autoCommit?: boolean;
      missionDetails?: Partial<DispatchMission>;
      interState?: {
        targetStateId: string;
        transitMode: string;
        priority?: 'CRITICAL' | 'HIGH' | 'ROUTINE';
      };
    }
  ): ValidateDispatchResult => {
    const rawItems = Array.isArray(items) ? items : [items];
    const sourceState = statesData.find((s) => s.id === stateId);

    if (!sourceState) {
      return {
        valid: false,
        message: `Origin state profile "${stateId}" was not found in the national inventory database.`,
        shortfalls: [],
        adjustedItems: [],
      };
    }

    const shortfalls: DispatchValidationShortfall[] = [];
    const adjustedItems: DispatchResourceItem[] = [];

    // Group items by resourceKey to prevent duplicate line items from collectively exceeding inventory
    const aggregatedRequests: Record<keyof StateResourceProfile['resources'], number> = {
      waterTankers: 0,
      rationPackets: 0,
      floatingClinics: 0,
      debrisMachinery: 0,
      emergencyGenerators: 0,
      tarpTentKits: 0,
      waterMotorPumps: 0,
    };

    for (const it of rawItems) {
      const resKey = mapToResourceKey(it.resourceType);
      const qty = Math.max(0, Number(it.quantity) || 0);
      aggregatedRequests[resKey] += qty;
    }

    // Check aggregated requests against current available inReserve
    for (const key of Object.keys(aggregatedRequests) as (keyof StateResourceProfile['resources'])[]) {
      const requested = aggregatedRequests[key];
      if (requested > 0) {
        const currentStock = sourceState.resources[key];
        const available = currentStock ? currentStock.inReserve : 0;
        if (requested > available) {
          shortfalls.push({
            resourceType: key,
            resourceKey: key,
            requested,
            available,
            deficit: requested - available,
          });
        }
      }
    }

    // Build normalized adjusted items
    for (const it of rawItems) {
      const resKey = mapToResourceKey(it.resourceType);
      const available = sourceState.resources[resKey]?.inReserve ?? 0;
      const requestedQty = Math.max(1, Number(it.quantity) || 1);
      const safeQty = Math.max(1, Math.min(requestedQty, available > 0 ? available : requestedQty));

      adjustedItems.push({
        id: it.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        resourceType: it.resourceType,
        quantity: safeQty,
        unitLabel: it.unitLabel || it.resourceType,
        unitType: it.unitType || 'cargoTruck',
      });
    }

    if (shortfalls.length > 0) {
      const shortfallDesc = shortfalls
        .map(
          (s) =>
            `${s.resourceType}: requested ${s.requested.toLocaleString()} > standby reserve ${s.available.toLocaleString()}`
        )
        .join('; ');
      return {
        valid: false,
        message: `Dispatch validation failed: Outgoing quantities exceed available inventory in ${sourceState.stateName} (${shortfallDesc}).`,
        shortfalls,
        adjustedItems,
      };
    }

    if (rawItems.length === 0 || rawItems.every((it) => (Number(it.quantity) || 0) <= 0)) {
      return {
        valid: false,
        message: 'Dispatch validation failed: Manifest contains no valid resource items with quantity > 0.',
        shortfalls: [],
        adjustedItems: [],
      };
    }

    // If autoCommit requested, execute atomic state update
    if (options?.autoCommit) {
      let createdMission: DispatchMission | undefined;

      // ATOMIC UPDATE: Deduct from inReserve and add to active
      setStatesData((prevStates) => {
        return prevStates.map((st) => {
          if (st.id !== stateId) return st;

          const updatedResources = { ...st.resources };

          adjustedItems.forEach((item) => {
            const resKey = mapToResourceKey(item.resourceType);
            const cur = updatedResources[resKey];
            if (cur) {
              const qty = Math.min(item.quantity, cur.inReserve);
              updatedResources[resKey] = {
                ...cur,
                total: cur.total, // Strict conservation
                inReserve: Math.max(0, cur.inReserve - qty),
                active: cur.active + qty,
              };
            }
          });

          return {
            ...st,
            resources: updatedResources,
          };
        });
      });

      // Commit mission details
      if (options.missionDetails) {
        createdMission = {
          id: options.missionDetails.id || `DSP-${Math.floor(1000 + Math.random() * 9000)}`,
          stateId,
          targetDistrict: options.missionDetails.targetDistrict || 'Active Sector',
          targetCoords: options.missionDetails.targetCoords || [85.1376, 25.5941],
          originDepot: options.missionDetails.originDepot || `${sourceState.primaryDepotLocation} (${sourceState.stateName})`,
          originCoords: options.missionDetails.originCoords || [72.8777, 19.076],
          items: adjustedItems,
          unitType: options.missionDetails.unitType || adjustedItems[0]?.unitType || 'cargoTruck',
          transportMode: options.missionDetails.transportMode || 'Green Road Corridor',
          status: options.missionDetails.status || 'In Transit',
          progress: options.missionDetails.progress ?? 4,
          etaMinutes: options.missionDetails.etaMinutes ?? 45,
          priority: options.missionDetails.priority || 'CRITICAL',
          dispatchedAt: options.missionDetails.dispatchedAt || 'Just now',
        };
        setDispatches((prev) => [createdMission!, ...prev]);
      }

      // If inter-state mutual aid dispatch details are supplied
      if (options.interState) {
        const targetState = statesData.find((s) => s.id === options.interState?.targetStateId);
        const targetName = targetState?.stateName || options.interState.targetStateId;
        const etaHours = Math.round(18 + Math.random() * 24);

        adjustedItems.forEach((it) => {
          const newLog: DispatchLog = {
            id: `NDMA-LOG-${Date.now().toString().slice(-4)}`,
            timestamp: new Date().toLocaleTimeString(),
            sourceState: sourceState.stateName,
            targetState: targetName,
            resourceKey: mapToResourceKey(it.resourceType),
            quantity: it.quantity,
            transitMode: options.interState!.transitMode,
            etaHours,
            status: 'In Transit',
          };
          setDispatchLogs((prev) => [newLog, ...prev]);
        });
      }

      return {
        valid: true,
        message: `Dispatch successfully authorized and committed: ${adjustedItems
          .map((i) => `${i.quantity.toLocaleString()} ${i.unitLabel}`)
          .join(', ')} mobilized from ${sourceState.stateName}.`,
        shortfalls: [],
        adjustedItems,
        committedMission: createdMission,
      };
    }

    return {
      valid: true,
      message: `Dispatch validation passed: ${adjustedItems
        .map((i) => `${i.quantity.toLocaleString()} ${i.unitLabel}`)
        .join(', ')} is verified against available standby reserve in ${sourceState.stateName}.`,
      shortfalls: [],
      adjustedItems,
    };
  }, [statesData]);

  // Dispatch Mission: Validates and atomically updates inventory
  const dispatchMission = useCallback((mission: DispatchMission): ValidateDispatchResult => {
    return validateDispatch(mission.stateId, mission.items, {
      autoCommit: true,
      missionDetails: mission,
    });
  }, [validateDispatch]);

  // Cancel Dispatch: Returns exact items from active (actv) back to inReserve (res)
  const cancelDispatch = useCallback((dispatchId: string) => {
    setDispatches((prevDispatches) => {
      const mission = prevDispatches.find((d) => d.id === dispatchId);
      if (mission) {
        setStatesData((prevStates) => {
          return prevStates.map((st) => {
            if (st.id !== mission.stateId) return st;

            const updatedResources = { ...st.resources };
            (mission.items || []).forEach((item) => {
              const resKey = mapToResourceKey(item.resourceType);
              const cur = updatedResources[resKey];
              if (cur) {
                const requestedQty = Math.max(1, Number(item.quantity) || 1);
                const returnQty = Math.min(requestedQty, cur.active);
                updatedResources[resKey] = {
                  ...cur,
                  total: cur.total, // STRICT CONSERVATION: Total never changes
                  inReserve: cur.inReserve + returnQty,
                  active: Math.max(0, cur.active - returnQty),
                };
              }
            });

            return {
              ...st,
              resources: updatedResources,
            };
          });
        });
      }
      return prevDispatches.filter((d) => d.id !== dispatchId);
    });
  }, []);

  // Update Mission Progress & SitRep
  const updateDispatchProgress = useCallback((
    dispatchId: string,
    progress: number,
    status?: DispatchMission['status'],
    arrivalReport?: DispatchArrivalReport
  ) => {
    setDispatches((prev) =>
      prev.map((d) => {
        if (d.id === dispatchId) {
          return {
            ...d,
            progress,
            status: status || d.status,
            arrivalReport: arrivalReport || d.arrivalReport,
            arrivedAt: status === 'Arrived & Active' && !d.arrivedAt ? 'Just now' : d.arrivedAt,
          };
        }
        return d;
      })
    );
  }, []);

  // Inter-State Mutual Aid Dispatch: Validates and atomically moves resources
  const interStateDispatch = useCallback((
    sourceStateId: string,
    targetStateId: string,
    resourceKey: keyof StateResourceProfile['resources'],
    quantity: number,
    transitMode: string,
    priority: 'CRITICAL' | 'HIGH' | 'ROUTINE' = 'CRITICAL'
  ) => {
    const source = statesData.find((s) => s.id === sourceStateId);
    const target = statesData.find((s) => s.id === targetStateId);

    if (!source || !target) {
      return { success: false, message: 'Source or target state not found.' };
    }

    const validation = validateDispatch(
      sourceStateId,
      [
        {
          resourceType: resourceKey,
          quantity,
          unitLabel: resourceKey,
          unitType: 'cargoTruck',
        },
      ],
      {
        autoCommit: true,
        missionDetails: {
          id: `DSP-INT-${Math.floor(1000 + Math.random() * 9000)}`,
          targetDistrict: `${target.capital} Sector Hub`,
          targetCoords: [85.1376, 25.5941],
          originDepot: `${source.primaryDepotLocation} (${source.stateName})`,
          originCoords: [72.8777, 19.0760],
          transportMode: 'Green Road Corridor',
          priority,
        },
        interState: {
          targetStateId,
          transitMode,
          priority,
        },
      }
    );

    if (!validation.valid) {
      return {
        success: false,
        message: validation.message,
      };
    }

    const newLog: DispatchLog = {
      id: `NDMA-LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString(),
      sourceState: source.stateName,
      targetState: target.stateName,
      resourceKey,
      quantity,
      transitMode,
      etaHours: Math.round(18 + Math.random() * 24),
      status: 'In Transit',
    };

    return {
      success: true,
      message: `Successfully mobilized ${quantity.toLocaleString()} units from ${source.stateName} to ${target.stateName}. Standby inventory deducted and marked active.`,
      log: newLog,
    };
  }, [statesData, validateDispatch]);

  // Switch disaster type and sync its presets
  const setDisasterType = useCallback((type: DisasterType) => {
    setDisasterTypeState(type);
    const preset = DISASTER_PRESETS[type] || DISASTER_PRESETS.flood;
    const severityOptions = SEVERITY_LEVELS_BY_TYPE[type] || [];
    const defaultSeverity = severityOptions[Math.floor(severityOptions.length / 2)] || severityOptions[0];

    setSelectedSeverityId(defaultSeverity ? defaultSeverity.id : `${type}-lvl-2`);
    setCustomRadiusKm(defaultSeverity ? defaultSeverity.defaultRadiusKm : preset.radiusKm);
    setCustomDecayModel(preset.decayModel);

    // Sync pillar weights
    setCustomPillarExposure(preset.pillarWeights.exposure);
    setCustomPillarSensitivity(preset.pillarWeights.sensitivity);
    setCustomPillarAdaptive(preset.pillarWeights.adaptiveCapacity);

    // Sync sub-variable weights
    setCustomExpDist(preset.exposureWeights.distance);
    setCustomExpDensity(preset.exposureWeights.populationDensity);
    setCustomExpHist(preset.exposureWeights.historical);

    setCustomSensDep(preset.sensitivityWeights.dependencyRatio);
    setCustomSensPov(preset.sensitivityWeights.povertyIndex);
    setCustomSensBldg(preset.sensitivityWeights.buildingVulnerability);

    setCustomAdpLife(preset.adaptiveWeights.lifelineProximity);
    setCustomAdpEws(preset.adaptiveWeights.ewsCoverage);
  }, []);

  // Quick helper to configure a complete disaster scenario
  const setDisasterScenario = useCallback(
    (type: DisasterType, newEpicenter: [number, number], newEpicenterName: string, severityId?: string) => {
      setDisasterType(type);
      setEpicenter(newEpicenter);
      setEpicenterName(newEpicenterName);
      if (severityId) {
        setSelectedSeverityId(severityId);
      }
    },
    [setDisasterType]
  );

  // Pillar weight balancing handler
  const handlePillarWeightChange = useCallback(
    (changed: 'exposure' | 'sensitivity' | 'adaptive', rawVal: number) => {
      const clampedVal = Math.min(0.80, Math.max(0.05, rawVal));
      const remainder = 1.0 - clampedVal;

      if (changed === 'exposure') {
        const otherTotal = customPillarSensitivity + customPillarAdaptive || 1;
        const newSens = Number((remainder * (customPillarSensitivity / otherTotal)).toFixed(2));
        const newAdp = Number((remainder - newSens).toFixed(2));
        setCustomPillarExposure(clampedVal);
        setCustomPillarSensitivity(newSens);
        setCustomPillarAdaptive(newAdp);
      } else if (changed === 'sensitivity') {
        const otherTotal = customPillarExposure + customPillarAdaptive || 1;
        const newExp = Number((remainder * (customPillarExposure / otherTotal)).toFixed(2));
        const newAdp = Number((remainder - newExp).toFixed(2));
        setCustomPillarSensitivity(clampedVal);
        setCustomPillarExposure(newExp);
        setCustomPillarAdaptive(newAdp);
      } else {
        const otherTotal = customPillarExposure + customPillarSensitivity || 1;
        const newExp = Number((remainder * (customPillarExposure / otherTotal)).toFixed(2));
        const newSens = Number((remainder - newExp).toFixed(2));
        setCustomPillarAdaptive(clampedVal);
        setCustomPillarExposure(newExp);
        setCustomPillarSensitivity(newSens);
      }
    },
    [customPillarAdaptive, customPillarExposure, customPillarSensitivity]
  );

  // Active severity level
  const currentSeverity: DisasterSeverityOption = useMemo(() => {
    const options = SEVERITY_LEVELS_BY_TYPE[disasterType] || [];
    return (
      options.find((o) => o.id === selectedSeverityId) ||
      options[0] || {
        id: 'default',
        name: 'Standard Scenario',
        shortLabel: 'Standard',
        badge: 'Standard',
        subtitle: '',
        description: '',
        defaultRadiusKm: 350,
        severityMultiplier: 1.0,
        themeColor: 'blue',
      }
    );
  }, [disasterType, selectedSeverityId]);

  // Active disaster parameters memo
  const activeParams: DisasterParameters = useMemo(() => {
    const totalPillar = customPillarExposure + customPillarSensitivity + customPillarAdaptive || 1;
    return {
      type: disasterType,
      title: DISASTER_PRESETS[disasterType]?.title || 'Disaster Scenario',
      severityId: currentSeverity.id,
      severityMultiplier: currentSeverity.severityMultiplier,
      epicenter,
      epicenterName,
      radiusKm: customRadiusKm,
      decayModel: customDecayModel,
      decayFactor: disasterType === 'heatwave' ? 1.5 : disasterType === 'cyclone' ? 2.5 : 2.2,
      pillarWeights: {
        exposure: customPillarExposure / totalPillar,
        sensitivity: customPillarSensitivity / totalPillar,
        adaptiveCapacity: customPillarAdaptive / totalPillar,
      },
      exposureWeights: {
        distance: customExpDist,
        populationDensity: customExpDensity,
        historical: customExpHist,
      },
      sensitivityWeights: {
        dependencyRatio: customSensDep,
        povertyIndex: customSensPov,
        buildingVulnerability: customSensBldg,
      },
      adaptiveWeights: {
        lifelineProximity: customAdpLife,
        ewsCoverage: customAdpEws,
      },
      description: currentSeverity.description || DISASTER_PRESETS[disasterType]?.description || '',
    };
  }, [
    disasterType,
    currentSeverity,
    epicenter,
    epicenterName,
    customRadiusKm,
    customDecayModel,
    customPillarExposure,
    customPillarSensitivity,
    customPillarAdaptive,
    customExpDist,
    customExpDensity,
    customExpHist,
    customSensDep,
    customSensPov,
    customSensBldg,
    customAdpLife,
    customAdpEws,
  ]);

  // Dynamic Color Gradient Mapping Function [R, G, B, A]
  const getZoneColor = useCallback(
    (score: number, isAffected: boolean = true): [number, number, number, number] => {
      if (!isAffected || score <= 0) return [20, 30, 48, 35]; // Unaffected - Dark Subdued Slate

      if (score >= 80) {
        // 80 to 100: Orange [249, 115, 22] -> Deep Crimson Red [239, 68, 68]
        const t = Math.min(1, (score - 80) / 20);
        return [
          Math.round(249 + (239 - 249) * t),
          Math.round(115 + (68 - 115) * t),
          Math.round(22 + (68 - 22) * t),
          Math.round(230 + 20 * t),
        ];
      }
      if (score >= 60) {
        // 60 to 80: Amber/Yellow [234, 179, 8] -> Orange [249, 115, 22]
        const t = (score - 60) / 20;
        return [
          Math.round(234 + (249 - 234) * t),
          Math.round(179 + (115 - 179) * t),
          Math.round(8 + (22 - 8) * t),
          Math.round(210 + 20 * t),
        ];
      }
      if (score >= 40) {
        // 40 to 60: Lime Green [132, 204, 22] -> Amber/Yellow [234, 179, 8]
        const t = (score - 40) / 20;
        return [
          Math.round(132 + (234 - 132) * t),
          Math.round(204 + (179 - 204) * t),
          Math.round(22 + (8 - 22) * t),
          Math.round(185 + 25 * t),
        ];
      }
      if (score >= 20) {
        // 20 to 40: Emerald Green [34, 197, 94] -> Lime Green [132, 204, 22]
        const t = (score - 20) / 20;
        return [
          Math.round(34 + (132 - 34) * t),
          Math.round(197 + (204 - 197) * t),
          Math.round(94 + (22 - 94) * t),
          Math.round(165 + 20 * t),
        ];
      }
      // 1 to 20: Emerald Green
      return [34, 197, 94, 160];
    },
    []
  );

  // RGB only version for solid borders / badges
  const getZoneRGB = useCallback(
    (score: number, isAffected: boolean = true): [number, number, number] => {
      const [r, g, b] = getZoneColor(score, isAffected);
      return [r, g, b];
    },
    [getZoneColor]
  );

  // Calculation function for single district
  const getZoneVulnerability = useCallback(
    (district: DistrictData) => {
      return computeZoneVulnerability(district, activeParams);
    },
    [activeParams]
  );

  return (
    <DisasterSimulationContext.Provider
      value={{
        disasterType,
        selectedSeverityId,
        epicenter,
        epicenterName,
        customRadiusKm,
        customDecayModel,
        customPillarExposure,
        customPillarSensitivity,
        customPillarAdaptive,
        customExpDist,
        customExpDensity,
        customExpHist,
        customSensDep,
        customSensPov,
        customSensBldg,
        customAdpLife,
        customAdpEws,
        currentSeverity,
        activeParams,
        statesData,
        setStatesData,
        dispatches,
        setDispatches,
        dispatchLogs,
        validateDispatch,
        dispatchMission,
        cancelDispatch,
        updateDispatchProgress,
        interStateDispatch,
        setDisasterType,
        setSelectedSeverityId,
        setEpicenter,
        setEpicenterName,
        setCustomRadiusKm,
        setCustomDecayModel,
        handlePillarWeightChange,
        setCustomExpDist,
        setCustomExpDensity,
        setCustomExpHist,
        setCustomSensDep,
        setCustomSensPov,
        setCustomSensBldg,
        setCustomAdpLife,
        setCustomAdpEws,
        setDisasterScenario,
        getZoneColor,
        getZoneRGB,
        getZoneVulnerability,
      }}
    >
      {children}
    </DisasterSimulationContext.Provider>
  );
};

export const useDisasterSimulation = () => {
  const context = useContext(DisasterSimulationContext);
  if (!context) {
    throw new Error('useDisasterSimulation must be used within a DisasterSimulationProvider');
  }
  return context;
};
