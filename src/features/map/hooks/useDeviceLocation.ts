// Single source of truth is LocationContext — shared across the whole app.
// All consumers (MapScreen, WalkSequenceScreen, useReveal, etc.) get the same
// GPS stream via context instead of spawning isolated per-component watches.
export {
  useDeviceLocation,
  LocationProvider,
  type UseDeviceLocationResult,
  type LocationStatus,
} from '../../../services/location/LocationContext';
