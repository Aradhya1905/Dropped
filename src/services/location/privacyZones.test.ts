import {
  DEFAULT_ZONE_RADIUS_M,
  isInsideAnyZone,
  nextZoneLabel,
  zoneAt,
  type PrivacyZone,
} from './privacyZones';

const HOME: PrivacyZone = {
  id: 'z1',
  centre: { lat: 12.9716, lng: 77.5946 },
  radiusM: DEFAULT_ZONE_RADIUS_M,
  label: 'Home',
};

/** A coordinate `metres` due north of `from`. 1° lat ≈ 111_320 m. */
function north(from: { lat: number; lng: number }, metres: number) {
  return { lat: from.lat + metres / 111_320, lng: from.lng };
}

describe('isInsideAnyZone', () => {
  it('puts the centre inside', () => {
    expect(isInsideAnyZone(HOME.centre, [HOME])).toBe(true);
  });

  it('holds the edge: just inside is inside, just outside is outside', () => {
    expect(isInsideAnyZone(north(HOME.centre, HOME.radiusM - 1), [HOME])).toBe(true);
    expect(isInsideAnyZone(north(HOME.centre, HOME.radiusM + 1), [HOME])).toBe(false);
  });

  it('counts the boundary itself as inside, so the tie fails closed', () => {
    // Every caller is deciding whether to record or transmit; the drop refusal
    // reads the same function, so both must agree at exactly the radius.
    const onTheLine = north(HOME.centre, HOME.radiusM);
    expect(isInsideAnyZone(onTheLine, [HOME])).toBe(true);
  });

  it('is always outside with no zones, and does not throw', () => {
    expect(isInsideAnyZone(HOME.centre, [])).toBe(false);
  });

  it('checks every zone, not just the first', () => {
    const work: PrivacyZone = {
      id: 'z2',
      centre: { lat: 12.9352, lng: 77.6245 },
      radiusM: 150,
      label: 'Work',
    };
    expect(isInsideAnyZone(work.centre, [HOME, work])).toBe(true);
  });

  it('works across the antimeridian', () => {
    // Two points 180 m apart either side of ±180°: a naive lng subtraction
    // would read them as most of the way round the planet.
    const zone: PrivacyZone = {
      id: 'z3',
      centre: { lat: 0, lng: 179.999 },
      radiusM: 300,
    };
    expect(isInsideAnyZone({ lat: 0, lng: -179.999 }, [zone])).toBe(true);
    expect(isInsideAnyZone({ lat: 0, lng: 179.9 }, [zone])).toBe(false);
  });
});

describe('zoneAt', () => {
  it('names the zone you are standing in, for the refusal copy', () => {
    expect(zoneAt(HOME.centre, [HOME])?.label).toBe('Home');
    expect(zoneAt(north(HOME.centre, 5_000), [HOME])).toBeNull();
  });
});

describe('nextZoneLabel', () => {
  it('offers the labels in order and runs out cleanly', () => {
    expect(nextZoneLabel([])).toBe('Home');
    expect(nextZoneLabel([HOME])).toBe('Work');
    expect(
      nextZoneLabel([
        HOME,
        { ...HOME, id: 'b', label: 'Work' },
        { ...HOME, id: 'c', label: 'School' },
      ]),
    ).toBeUndefined();
  });
});
