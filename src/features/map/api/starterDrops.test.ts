const mockPost = jest.fn();
let mockRequested = false;
const mockSetRequested = jest.fn((v: boolean) => {
  mockRequested = v;
});

jest.mock('../../../services/api', () => ({
  postStarterDrops: (...args: unknown[]) => mockPost(...args),
}));

jest.mock('../../../services/storage', () => ({
  getStarterRequested: () => mockRequested,
  setStarterRequested: (v: boolean) => mockSetRequested(v),
}));

import { requestStarterDropsOnce } from './starterDrops';

const HERE = { lat: 12.9756, lng: 77.6094 };

beforeEach(() => {
  mockPost.mockReset();
  mockSetRequested.mockClear();
  mockRequested = false;
});

describe('requestStarterDropsOnce', () => {
  it('posts the coordinate, sets the flag, and resolves seeded', async () => {
    mockPost.mockResolvedValue({ seeded: true, outcome: 'seeded' });

    await expect(requestStarterDropsOnce(HERE)).resolves.toBe(true);
    expect(mockPost).toHaveBeenCalledWith(HERE);
    expect(mockSetRequested).toHaveBeenCalledWith(true);
  });

  it('sets the flag even when the area was already occupied', async () => {
    mockPost.mockResolvedValue({ seeded: false, outcome: 'area-occupied' });

    await expect(requestStarterDropsOnce(HERE)).resolves.toBe(false);
    expect(mockSetRequested).toHaveBeenCalledWith(true);
  });

  it('skips the request once the flag is set', async () => {
    mockRequested = true;

    await expect(requestStarterDropsOnce(HERE)).resolves.toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shares one in-flight request between concurrent callers', async () => {
    mockPost.mockResolvedValue({ seeded: true, outcome: 'seeded' });

    const [a, b] = await Promise.all([
      requestStarterDropsOnce(HERE),
      requestStarterDropsOnce(HERE),
    ]);
    expect([a, b]).toEqual([true, true]);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('leaves the flag unset on failure so a later attempt retries', async () => {
    mockPost.mockRejectedValueOnce(new Error('offline'));

    await expect(requestStarterDropsOnce(HERE)).rejects.toThrow('offline');
    expect(mockSetRequested).not.toHaveBeenCalled();

    mockPost.mockResolvedValueOnce({ seeded: true, outcome: 'seeded' });
    await expect(requestStarterDropsOnce(HERE)).resolves.toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(2);
  });
});
