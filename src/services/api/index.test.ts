import { AxiosError } from 'axios';

import { api, type ApiError } from './index';

jest.mock('../storage', () => ({
  getDeviceId: () => 'device-abc',
}));

beforeEach(() => {
  jest.useRealTimers(); // retry backoff uses real setTimeout
});

afterEach(() => {
  jest.useFakeTimers(); // restore the suite default from jest.setup
});

describe('api request', () => {
  it('attaches the device id header on every request', async () => {
    let seen: string | undefined;
    api.defaults.adapter = async config => {
      seen = config.headers?.get?.('X-Device-Id') as string;
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
    await api.get('/whatever');
    expect(seen).toBe('device-abc');
  });
});

describe('api error normalization', () => {
  it('maps an HTTP error to ApiError', async () => {
    api.defaults.adapter = async config => {
      throw new AxiosError('boom', 'ERR_BAD_RESPONSE', config, {}, {
        data: { message: 'nope' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config,
      } as never);
    };
    // POST so the retry path doesn't engage.
    await api.post('/x').then(
      () => {
        throw new Error('should have rejected');
      },
      (e: ApiError) => {
        expect(e.code).toBe('http');
        expect(e.status).toBe(404);
        expect(e.message).toBe('nope');
      },
    );
  });

  it('maps a network failure to ApiError(network)', async () => {
    api.defaults.adapter = async config => {
      const err = new AxiosError('Network Error', 'ERR_NETWORK', config);
      // axios sets .request on network failures (no .response)
      (err as { request?: unknown }).request = {};
      throw err;
    };
    await api.post('/x').catch((e: ApiError) => {
      expect(e.code).toBe('network');
      expect(e.status).toBe(0);
    });
  });
});
