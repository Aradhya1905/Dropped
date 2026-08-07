import { eraseDevice, fetchDeviceInfo } from '../../../services/api';

export const getDeviceInfo = () => fetchDeviceInfo();

/** The panic wipe's server call. See `hooks/usePanicWipe` for the ordering. */
export const eraseThisDevice = () => eraseDevice();
