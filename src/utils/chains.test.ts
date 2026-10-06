import type { Secret } from '../types';
import {
  activeTrail,
  chainPinKind,
  hiddenAfterLine,
  nextStopStub,
  trailDots,
  trailsOnMap,
} from './chains';

function secret(
  id: string,
  lat: number,
  opts: Partial<Secret> & { pos?: number; length?: number; trail?: string } = {},
): Secret {
  const { pos, length = 3, trail = 't1', ...rest } = opts;
  return {
    id,
    drop: { id, coordinate: { lat, lng: 77.6 }, createdAt: 0 },
    createdAt: 0,
    mood: 'ache',
    hearts: 0,
    stoodHere: 0,
    sealed: true,
    saved: false,
    hearted: false,
    ...(pos ? { chain: { id: trail, pos, length } } : {}),
    ...rest,
  };
}

describe('chains', () => {
  it('groups chained drops into ordered trails, ignoring loose drops', () => {
    const trails = trailsOnMap([
      secret('b', 12.002, { pos: 2 }),
      secret('loose', 12.1),
      secret('a', 12.0, { pos: 1 }),
    ]);
    expect(trails).toHaveLength(1);
    expect(trails[0].stops.map(s => s.id)).toEqual(['a', 'b']);
  });

  it('reads a stranger’s stop 1 as tagged, and a follower’s stops as read / next', () => {
    const stranger = [secret('a', 12.0, { pos: 1 })];
    expect(chainPinKind(stranger[0], trailsOnMap(stranger))).toBe('tagged');

    const follower = [
      secret('a', 12.0, { pos: 1, sealed: false }),
      secret('b', 12.002, { pos: 2 }),
    ];
    const trails = trailsOnMap(follower);
    expect(chainPinKind(follower[0], trails)).toBe('read');
    expect(chainPinKind(follower[1], trails)).toBe('next');
    expect(chainPinKind(secret('x', 1), trails)).toBeNull();
  });

  it('finds the trail being followed and its dots', () => {
    const drops = [
      secret('a', 12.0, { pos: 1, sealed: false }),
      secret('b', 12.002, { pos: 2 }),
    ];
    const active = activeTrail(drops, { lat: 12.001, lng: 77.6 });
    expect(active?.next.id).toBe('b');
    expect(trailDots(active!)).toEqual(['read', 'next', 'hidden']);
  });

  it('has no active trail when nothing has been opened yet', () => {
    expect(activeTrail([secret('a', 12.0, { pos: 1 })], null)).toBeNull();
  });

  it('says what is left after a stop', () => {
    expect(hiddenAfterLine(2, 3)).toBe('one more stop is hidden after this one.');
    expect(hiddenAfterLine(2, 5)).toBe('3 more stops are hidden after this one.');
    expect(hiddenAfterLine(3, 3)).toBe('the last stop on this trail.');
  });

  it('builds a sealed stub for the next stop from a ticket', () => {
    const read = secret('a', 12.0, { pos: 1, sealed: false });
    read.chain!.next = {
      id: 'b',
      coordinate: { lat: 12.002, lng: 77.6 },
      distanceMeters: 222,
      mood: 'joy',
      createdAt: 5,
    };
    const stub = nextStopStub(read);
    expect(stub).toMatchObject({
      id: 'b',
      sealed: true,
      mood: 'joy',
      chain: { id: 't1', pos: 2, length: 3 },
    });
    expect(nextStopStub(secret('x', 1))).toBeNull();
  });
});
