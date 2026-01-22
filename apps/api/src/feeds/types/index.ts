/**
 * Feed Types Index
 *
 * Exports type definitions for feed data structures.
 */

export type {
  UnrestEventType,
  ActorType,
  UnrestEvent,
  UnrestHotspot,
  AggregatedUnrestData,
  UnrestFilterOptions,
} from './civil-unrest.types';

// Critical Infrastructure types
export type {
  CISASector,
  FacilityType,
  IncidentType,
  IncidentSeverity,
  IncidentSource,
  CriticalFacility,
  SatelliteFire,
  DOTCamera,
  DOTCameraStatus,
  CitizenIncident,
  RawIncident,
  InfrastructureIncident,
  SectorStatus,
  InfrastructureFilterOptions,
  FacilityFilterOptions,
  CorrelationResult,
  DOTSupportedState,
  CitizenCity,
} from './critical-infrastructure.types';

export {
  SECTOR_LABELS,
  SECTOR_CRITICALITY,
  SEVERITY_VALUES,
  DOT_SUPPORTED_STATES,
  CITIZEN_SUPPORTED_CITIES,
  CITIZEN_CITY_COORDS,
} from './critical-infrastructure.types';
