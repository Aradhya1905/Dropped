/**
 * api — the only module that touches axios. One configured client with the
 * anonymous device id attached to every request, normalized errors, and
 * retry/backoff on idempotent GETs.
 *
 * NOTE: the backend doesn't exist yet (remaining-work §2). `baseURL` is a
 * placeholder; there are deliberately no endpoint functions or mock data here —
 * those land with the server. This file just makes the transport real.
 */
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { getDeviceId } from '../storage';

/** TODO: per-env base URL once the backend exists. */
export const DROPPED_API_URL = 'https://api.dropped.invalid';

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

/** Normalized error surfaced to features (never a raw AxiosError). */
export interface ApiError {
  /** HTTP status, or 0 for network/timeout failures. */
  status: number;
  /** Machine code: 'network' | 'timeout' | 'http' | 'unknown'. */
  code: 'network' | 'timeout' | 'http' | 'unknown';
  message: string;
}

const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(() => resolve(), ms));

function toApiError(err: AxiosError): ApiError {
  if (err.response) {
    return {
      status: err.response.status,
      code: 'http',
      message:
        (err.response.data as { message?: string } | undefined)?.message ??
        err.message,
    };
  }
  if (err.code === 'ECONNABORTED') {
    return { status: 0, code: 'timeout', message: 'Request timed out' };
  }
  if (err.request) {
    return { status: 0, code: 'network', message: 'Network unavailable' };
  }
  return { status: 0, code: 'unknown', message: err.message };
}

export const api: AxiosInstance = axios.create({
  baseURL: DROPPED_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the anonymous identity to every request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers.set('X-Device-Id', getDeviceId());
  return config;
});

// Retry idempotent GETs with exponential backoff, then normalize the error.
api.interceptors.response.use(
  res => res,
  async (err: AxiosError) => {
    const config = err.config as
      | (AxiosRequestConfig & { __retryCount?: number })
      | undefined;

    const isRetriable =
      config?.method?.toLowerCase() === 'get' &&
      // network/timeout or 5xx — not 4xx (client errors won't fix on retry)
      (!err.response || err.response.status >= 500);

    if (config && isRetriable) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      if (config.__retryCount <= MAX_RETRIES) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** (config.__retryCount - 1));
        return api(config);
      }
    }

    return Promise.reject(toApiError(err));
  },
);
