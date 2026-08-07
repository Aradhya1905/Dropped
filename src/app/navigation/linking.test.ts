/**
 * linking.test — share-a-spot link parsing and the cold-start handoff.
 *
 * Two things are worth protecting here: a malformed link must never navigate
 * with garbage, and a link tapped on a fresh install must wait for onboarding
 * rather than dropping someone on a compass with no location permission.
 */
import { setOnboardingComplete } from '../../services/storage';

const mockReset = jest.fn();
const mockRefState = { ready: true, route: 'MapHome' as string | undefined };

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({
    isReady: () => mockRefState.ready,
    getCurrentRoute: () =>
      mockRefState.route ? { name: mockRefState.route } : undefined,
    reset: (...args: unknown[]) => mockReset(...args),
  }),
}));

// Imported after the mock so the module picks up the fake container ref.
const {
  clearPendingSpot,
  consumePendingSpot,
  parseSpotLink,
  peekPendingSpot,
  rememberPendingSpot,
  spotLink,
} = require('./linking') as typeof import('./linking');

const ID = 'a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

beforeEach(() => {
  mockReset.mockClear();
  mockRefState.ready = true;
  mockRefState.route = 'MapHome';
  clearPendingSpot();
  setOnboardingComplete(true);
});

describe('parseSpotLink', () => {
  it('reads the id out of a custom-scheme link', () => {
    expect(parseSpotLink(`dropped://d/${ID}`)).toBe(ID);
  });

  it('reads the id out of the https form', () => {
    // The https half is not switched on yet (no domain, placeholder iOS bundle
    // id) but the parser accepts it, so turning it on is a one-constant change.
    expect(parseSpotLink(`https://dropped.example/d/${ID}`)).toBe(ID);
  });

  it('tolerates a query string and fragment from a chat app', () => {
    expect(parseSpotLink(`dropped://d/${ID}?utm=whatsapp`)).toBe(ID);
    expect(parseSpotLink(`dropped://d/${ID}#top`)).toBe(ID);
  });

  it('refuses an id that is not a uuid', () => {
    // Otherwise SecretDetail navigates with garbage and sits on "locating…"
    // forever, which reads as a broken app rather than as a bad link.
    expect(parseSpotLink('dropped://d/../../etc/passwd')).toBeNull();
    expect(parseSpotLink('dropped://d/12345')).toBeNull();
    expect(parseSpotLink(`dropped://d/${ID}extra`)).toBeNull();
  });

  it('refuses another scheme, another path, and nothing at all', () => {
    expect(parseSpotLink(`otherapp://d/${ID}`)).toBeNull();
    expect(parseSpotLink(`dropped://secret/${ID}`)).toBeNull();
    expect(parseSpotLink('')).toBeNull();
    expect(parseSpotLink(null)).toBeNull();
    expect(parseSpotLink(undefined)).toBeNull();
  });

  it('round-trips whatever spotLink builds', () => {
    expect(parseSpotLink(spotLink(ID))).toBe(ID);
  });

  it('never puts anything but the id in a link', () => {
    // A link is forwardable. No body, no coordinate, ever.
    expect(spotLink(ID)).toBe(`dropped://d/${ID}`);
  });
});

describe('the pending link', () => {
  it('does nothing when there is no link', () => {
    expect(consumePendingSpot()).toBe(false);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('stays parked until onboarding is complete', () => {
    setOnboardingComplete(false);
    rememberPendingSpot(ID);

    expect(consumePendingSpot()).toBe(false);
    expect(mockReset).not.toHaveBeenCalled();
    // Parked, not lost — the Location screen consumes it a moment later.
    expect(peekPendingSpot()).toBe(ID);

    setOnboardingComplete(true);
    expect(consumePendingSpot()).toBe(true);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('stays parked until the navigator is mounted', () => {
    mockRefState.ready = false;
    rememberPendingSpot(ID);

    expect(consumePendingSpot()).toBe(false);
    expect(peekPendingSpot()).toBe(ID);

    mockRefState.ready = true;
    expect(consumePendingSpot()).toBe(true);
  });

  it('leaves the map underneath, so back does not strand the user', () => {
    rememberPendingSpot(ID);
    consumePendingSpot();

    expect(mockReset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: 'Main' },
        { name: 'SecretDetail', params: { secretId: ID } },
      ],
    });
  });

  it('consumes exactly once', () => {
    // Tapping the same link twice must not stack two SecretDetail screens.
    rememberPendingSpot(ID);
    expect(consumePendingSpot()).toBe(true);
    expect(consumePendingSpot()).toBe(false);
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(peekPendingSpot()).toBeNull();
  });

  it('keeps only the most recent link', () => {
    const other = 'ffffffff-1111-4222-8333-444444444444';
    rememberPendingSpot(ID);
    rememberPendingSpot(other);
    consumePendingSpot();

    expect(mockReset).toHaveBeenCalledWith(
      expect.objectContaining({
        routes: [
          { name: 'Main' },
          { name: 'SecretDetail', params: { secretId: other } },
        ],
      }),
    );
  });
});
