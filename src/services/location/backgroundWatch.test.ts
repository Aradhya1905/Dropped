import Geolocation from 'react-native-geolocation-service';

import {
  disableBackground,
  enableBackground,
  getLastFix,
  isBackgroundEnabled,
  isRunning,
  resetBackgroundWatch,
  setCadence,
  subscribe,
} from './backgroundWatch';

const geo = Geolocation as unknown as {
  watchPosition: jest.Mock;
  clearWatch: jest.Mock;
};

/** Hand a fix to whatever callback the live watch registered. */
function emit(accuracy = 5, lat = 12.9716, lng = 77.5946): void {
  const onSuccess = geo.watchPosition.mock.calls.at(-1)?.[0];
  onSuccess?.({ coords: { latitude: lat, longitude: lng, accuracy }, timestamp: 0 });
}

beforeEach(() => {
  resetBackgroundWatch();
  geo.watchPosition.mockClear();
  geo.clearWatch.mockClear();
  let id = 1;
  geo.watchPosition.mockImplementation(() => id++);
});

describe('one watch, ever', () => {
  it('starts exactly one hardware watch for two subscribers', () => {
    const a = subscribe(jest.fn());
    const b = subscribe(jest.fn());

    // The battery guard: this number is the whole point of the module.
    expect(geo.watchPosition).toHaveBeenCalledTimes(1);
    expect(isRunning()).toBe(true);

    a();
    b();
  });

  it('keeps watching while any subscriber remains', () => {
    const a = subscribe(jest.fn());
    const b = subscribe(jest.fn());

    a();
    expect(geo.clearWatch).not.toHaveBeenCalled();
    expect(isRunning()).toBe(true);

    b();
    expect(geo.clearWatch).toHaveBeenCalledTimes(1);
    expect(isRunning()).toBe(false);
  });

  it('restarts cleanly after the last subscriber left', () => {
    subscribe(jest.fn())();
    subscribe(jest.fn());
    expect(geo.watchPosition).toHaveBeenCalledTimes(2);
    expect(isRunning()).toBe(true);
  });

  it('fans one fix out to every subscriber', () => {
    const a = jest.fn();
    const b = jest.fn();
    subscribe(a);
    subscribe(b);

    emit();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a.mock.calls[0][0].coordinate).toEqual({ lat: 12.9716, lng: 77.5946 });
  });

  it('survives a subscriber that unsubscribes from inside its own callback', () => {
    const other = jest.fn();
    const stop = subscribe(() => stop());
    subscribe(other);

    expect(() => emit()).not.toThrow();
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('remembers the last fix for a screen that mounts mid-walk', () => {
    subscribe(jest.fn());
    emit(5, 1, 2);
    expect(getLastFix()?.coordinate).toEqual({ lat: 1, lng: 2 });
  });
});

describe('background hold', () => {
  it('keeps the watch alive with no subscribers at all', () => {
    enableBackground();
    expect(isRunning()).toBe(true);
    expect(isBackgroundEnabled()).toBe(true);

    // The app going to the foreground and away again must not disturb it.
    subscribe(jest.fn())();
    expect(geo.clearWatch).not.toHaveBeenCalled();
    expect(isRunning()).toBe(true);
  });

  it('does not start a second watch when a subscriber is already watching', () => {
    subscribe(jest.fn());
    enableBackground();
    expect(geo.watchPosition).toHaveBeenCalledTimes(1);
  });

  it('stops once the hold is released and nothing else wants it', () => {
    enableBackground();
    disableBackground();
    expect(isRunning()).toBe(false);
    expect(geo.clearWatch).toHaveBeenCalledTimes(1);
  });

  it('keeps watching for the screens after the hold is released', () => {
    enableBackground();
    subscribe(jest.fn());
    disableBackground();
    expect(isRunning()).toBe(true);
    expect(geo.clearWatch).not.toHaveBeenCalled();
  });
});

describe('cadence', () => {
  it('restarts the watch in place when it changes', () => {
    subscribe(jest.fn());
    setCadence('high');

    expect(geo.clearWatch).toHaveBeenCalledTimes(1);
    expect(geo.watchPosition).toHaveBeenCalledTimes(2);
    expect(isRunning()).toBe(true);
    expect(geo.watchPosition.mock.calls[1][2].distanceFilter).toBeLessThan(
      geo.watchPosition.mock.calls[0][2].distanceFilter,
    );
  });

  it('is free to call with the cadence it already has', () => {
    subscribe(jest.fn());
    setCadence('high');
    setCadence('high');
    expect(geo.watchPosition).toHaveBeenCalledTimes(2);
  });

  it('does not start a watch nobody asked for', () => {
    setCadence('low');
    expect(geo.watchPosition).not.toHaveBeenCalled();
    expect(isRunning()).toBe(false);
  });
});
