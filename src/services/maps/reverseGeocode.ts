/**
 * Reverse geocoding via OpenStreetMap's Nominatim API.
 *
 * Turns a { lat, lng } pair into a human-readable address. No API key needed,
 * but Nominatim's usage policy requires:
 *   - a valid User-Agent identifying the app (set below)
 *   - max ~1 request/second (don't hammer it; debounce caller-side — the
 *     `useReverseGeocode` hook handles this)
 * See: https://operations.osmfoundation.org/policies/nominatim/
 *
 * Caller supplies the coordinates (e.g. from `services/location`); this module
 * only does the network lookup, so it stays dependency-free (bare `fetch`) and
 * easy to test.
 *
 *   const addr = await getAddressFromCoords({ lat, lng });
 *   addr.shortAddress; // "Bedford Ave, Williamsburg, Brooklyn"
 */
import type { Coordinate } from '../../types';

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

// Nominatim requires an identifying User-Agent. Keep it tied to the app id.
const USER_AGENT = 'Dropped/1.0 (com.dropped)';

const DEFAULT_TIMEOUT_MS = 10_000;

/** The structured pieces Nominatim breaks an address into (all optional). */
export interface AddressParts {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
}

export interface ResolvedAddress {
  /** Full single-line address as returned by Nominatim (display_name). */
  formatted: string;
  /** A shorter, friendlier line built from the most relevant parts. */
  shortAddress: string;
  /** Individual address components. */
  parts: AddressParts;
  /** Echoed-back coordinates the lookup was performed for. */
  coords: Coordinate;
}

export interface ReverseGeocodeOptions {
  /** Abort the request after this many ms. Defaults to 10s. */
  timeoutMs?: number;
  /** Pass an external AbortSignal to cancel (e.g. on unmount). */
  signal?: AbortSignal;
  /** BCP-47 language for the result, e.g. "en", "hi". Defaults to "en". */
  language?: string;
}

export class ReverseGeocodeError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ReverseGeocodeError';
  }
}

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface NominatimReverseResponse {
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
}

function isValidCoord(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function mapParts(address: NominatimAddress): AddressParts {
  return {
    road: address.road ?? address.pedestrian,
    neighbourhood: address.neighbourhood,
    suburb: address.suburb,
    city: address.city ?? address.town ?? address.village,
    county: address.county,
    state: address.state,
    postcode: address.postcode,
    country: address.country,
    countryCode: address.country_code?.toUpperCase(),
  };
}

/** Build a compact "road, area, city" line, skipping missing pieces. */
function buildShortAddress(parts: AddressParts): string {
  return [parts.road, parts.neighbourhood ?? parts.suburb, parts.city, parts.state]
    .filter(Boolean)
    .join(', ');
}

/**
 * Resolve a lat/lng into an address using OSM Nominatim.
 *
 * @throws {ReverseGeocodeError} on invalid coords, network failure, timeout,
 *         abort, or an error/empty response from Nominatim.
 */
export async function getAddressFromCoords(
  coords: Coordinate,
  options: ReverseGeocodeOptions = {},
): Promise<ResolvedAddress> {
  const { lat, lng } = coords;

  if (!isValidCoord(lat) || !isValidCoord(lng)) {
    throw new ReverseGeocodeError(`Invalid coordinates: (${lat}, ${lng})`);
  }

  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, language = 'en' } = options;

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
  });

  // Internal controller so we always have a timeout, even when a caller passes
  // their own signal. Aborting either source aborts the request.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort);
  }

  try {
    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params}`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': language,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ReverseGeocodeError(
        `Nominatim responded with HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as NominatimReverseResponse;

    if (data.error) {
      throw new ReverseGeocodeError(`Nominatim error: ${data.error}`);
    }
    if (!data.display_name || !data.address) {
      throw new ReverseGeocodeError('No address found for the given coordinates');
    }

    const parts = mapParts(data.address);
    return {
      formatted: data.display_name,
      shortAddress: buildShortAddress(parts) || data.display_name,
      parts,
      coords: { lat, lng },
    };
  } catch (error) {
    if (error instanceof ReverseGeocodeError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ReverseGeocodeError(
        signal?.aborted
          ? 'Reverse geocode request was cancelled'
          : `Reverse geocode request timed out after ${timeoutMs}ms`,
        error,
      );
    }
    throw new ReverseGeocodeError(
      'Failed to reach OpenStreetMap. Check your connection.',
      error,
    );
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}
