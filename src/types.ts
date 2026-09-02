import { StateResourceProfile } from './data/stateResourceData';

export type DispatchUnitType =
  | 'ambulance'
  | 'motorBoat'
  | 'cargoTruck'
  | 'militaryHelicopter'
  | 'fireEngine'
  | 'policeUnit';

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
  items: DispatchResourceItem[];
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

export interface DispatchLog {
  id: string;
  timestamp: string;
  sourceState: string;
  targetState: string;
  resourceKey: keyof StateResourceProfile['resources'];
  quantity: number;
  transitMode: string;
  etaHours: number;
  status: 'Dispatched & Moving' | 'Arrived & Deployed' | 'In Transit';
}

export interface DispatchValidationItem {
  resourceType: string;
  quantity: number;
  unitLabel?: string;
  unitType?: DispatchUnitType;
  id?: string;
}

export interface DispatchValidationShortfall {
  resourceType: string;
  resourceKey: keyof StateResourceProfile['resources'];
  requested: number;
  available: number;
  deficit: number;
}

export interface ValidateDispatchResult {
  valid: boolean;
  message: string;
  shortfalls: DispatchValidationShortfall[];
  adjustedItems: DispatchResourceItem[];
  committedMission?: DispatchMission;
  updatedState?: StateResourceProfile;
}
