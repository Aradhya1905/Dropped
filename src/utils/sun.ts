/**
 * sun — where the sun is, from a coordinate and an instant.
 *
 * **This decides nothing that matters.** Time-gated drops ([09]) are judged by
 * the server, which computes sunrise and sunset from the *drop's* coordinate; a
 * device with a skewed clock can render a wrong countdown but can never talk
 * the server into unsealing anything. This module exists for the one job that
 * is purely cosmetic and must work offline: choosing the day or night map style
 * (`services/maps/nightStyle`). Nothing here should ever gate content.
 *
 * Standard low-precision solar position (NOAA / Astronomical Almanac): accurate
 * to well under a minute, which is far past what "is it dark out?" needs.
 */
import type { Coordinate } from '../types';

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;

/** Julian day number of the Unix epoch, and of J2000.0. */
const J1970 = 2440588;
const J2000 = 2451545;

/** Obliquity of the ecliptic. */
const OBLIQUITY = RAD * 23.4397;

/**
 * The altitude the sun's centre sits at during sunrise/sunset: half a degree
 * for the disc's radius, plus about a third for atmospheric refraction. This is
 * why the sun looks like it's on the horizon when geometrically it has already
 * set.
 */
export const HORIZON_ALTITUDE = RAD * -0.833;

// --- calendar ----------------------------------------------------------------

const toDays = (ms: number): number => ms / DAY_MS - 0.5 + J1970 - J2000;
const fromJulian = (j: number): number => (j + 0.5 - J1970) * DAY_MS;

// --- solar position ----------------------------------------------------------

const solarMeanAnomaly = (d: number): number => RAD * (357.5291 + 0.98560028 * d);

function eclipticLongitude(meanAnomaly: number): number {
  // Equation of the centre, plus the longitude of perihelion.
  const centre =
    RAD *
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly));
  const perihelion = RAD * 102.9372;
  return meanAnomaly + centre + perihelion + Math.PI;
}

const declination = (longitude: number): number =>
  Math.asin(Math.sin(OBLIQUITY) * Math.sin(longitude));

const rightAscension = (longitude: number): number =>
  Math.atan2(Math.sin(longitude) * Math.cos(OBLIQUITY), Math.cos(longitude));

const siderealTime = (d: number, westLng: number): number =>
  RAD * (280.16 + 360.9856235 * d) - westLng;

/**
 * The sun's altitude above the horizon, in radians. Negative means below.
 *
 * Preferred over comparing against sunrise/sunset for the day/night question:
 * it is a single continuous value that stays correct inside the polar circles,
 * where "sunset" simply doesn't happen for months at a time.
 */
export function solarAltitude(coord: Coordinate, at: number = Date.now()): number {
  const westLng = RAD * -coord.lng;
  const phi = RAD * coord.lat;
  const d = toDays(at);

  const longitude = eclipticLongitude(solarMeanAnomaly(d));
  const dec = declination(longitude);
  const hourAngle = siderealTime(d, westLng) - rightAscension(longitude);

  return Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle),
  );
}

/**
 * Whether it is dark at this coordinate right now.
 *
 * Inside the arctic circles this stays sane by construction: in midnight sun
 * the altitude never drops below the horizon, so it is never night, and in
 * polar night it never rises, so it always is.
 */
export function isNight(coord: Coordinate, at: number = Date.now()): boolean {
  return solarAltitude(coord, at) < HORIZON_ALTITUDE;
}

// --- sunrise / sunset --------------------------------------------------------

export interface SunTimes {
  /** ms epoch, or `null` where the sun does not cross the horizon that day. */
  sunrise: number | null;
  sunset: number | null;
}

const J0 = 0.0009;

/** Julian date of solar noon for the day containing `at`. */
function solarNoon(d: number, westLng: number): { noon: number; meanAnomaly: number; longitude: number } {
  const cycle = Math.round(d - J0 - westLng / (2 * Math.PI));
  const approx = J0 + westLng / (2 * Math.PI) + cycle;
  const meanAnomaly = solarMeanAnomaly(approx);
  const longitude = eclipticLongitude(meanAnomaly);
  const noon =
    J2000 + approx + 0.0053 * Math.sin(meanAnomaly) - 0.0069 * Math.sin(2 * longitude);
  return { noon, meanAnomaly, longitude };
}

/**
 * Sunrise and sunset for the solar day containing `at`.
 *
 * Either can be `null`: within the polar circles the sun may not cross the
 * horizon at all, and the honest answer there is "there isn't one" rather than
 * a fabricated timestamp. Callers deciding day-vs-night should prefer
 * {@link isNight}, which has no such hole.
 */
export function sunTimes(coord: Coordinate, at: number = Date.now()): SunTimes {
  const westLng = RAD * -coord.lng;
  const phi = RAD * coord.lat;
  const d = toDays(at);

  const { noon, meanAnomaly, longitude } = solarNoon(d, westLng);
  const dec = declination(longitude);

  // acos of a value outside [-1, 1] — the sun never reaches the horizon here.
  const cosHourAngle =
    (Math.sin(HORIZON_ALTITUDE) - Math.sin(phi) * Math.sin(dec)) /
    (Math.cos(phi) * Math.cos(dec));
  if (cosHourAngle > 1 || cosHourAngle < -1) {
    return { sunrise: null, sunset: null };
  }

  const hourAngle = Math.acos(cosHourAngle);
  const setApprox = J0 + (hourAngle + westLng) / (2 * Math.PI) + Math.round(d - J0 - westLng / (2 * Math.PI));
  const setJ =
    J2000 + setApprox + 0.0053 * Math.sin(meanAnomaly) - 0.0069 * Math.sin(2 * longitude);

  return {
    sunset: fromJulian(setJ),
    // Sunrise is sunset mirrored through solar noon.
    sunrise: fromJulian(noon - (setJ - noon)),
  };
}
