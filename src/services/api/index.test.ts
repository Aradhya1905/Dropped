import { AxiosError } from 'axios';

import { api, type ApiError, type ApiReply, type ApiSecret } from './index';
import { apiReplyToReply, apiSecretToSecret } from './mappers';

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

  it('carries a condition refusal off a 403 body', async () => {
    // The two 403s must stay distinguishable on the client: distance is
    // checked first server-side, so a condition refusal means the walk was
    // right and only the hour was wrong.
    api.defaults.adapter = async config => {
      throw new AxiosError('forbidden', 'ERR_BAD_REQUEST', config, {}, {
        data: {
          message: 'This one waits for dark.',
          revealCondition: 'night',
          opensAt: 1_800_000_000_000,
        },
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config,
      } as never);
    };
    await api.post('/x').catch((e: ApiError) => {
      expect(e.status).toBe(403);
      expect(e.revealCondition).toBe('night');
      expect(e.opensAt).toBe(1_800_000_000_000);
      expect(e.distanceMeters).toBeUndefined();
    });
  });

  it('keeps a too-far 403 free of any condition', async () => {
    api.defaults.adapter = async config => {
      throw new AxiosError('forbidden', 'ERR_BAD_REQUEST', config, {}, {
        data: { message: 'Too far to reveal', distanceMeters: 512 },
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config,
      } as never);
    };
    await api.post('/x').catch((e: ApiError) => {
      expect(e.distanceMeters).toBe(512);
      expect(e.revealCondition).toBeUndefined();
      expect(e.opensAt).toBeUndefined();
    });
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

describe('reply mapping', () => {
  const apiSecret: ApiSecret = {
    id: 'd1',
    drop: { id: 'd1', coordinate: { lat: 1, lng: 2 }, createdAt: 100 },
    createdAt: 100,
    mood: 'ache',
    hearts: 0,
    stoodHere: 1,
    replyCount: 3,
    sealed: true,
    saved: false,
    hearted: false,
  };

  it('carries replyCount through apiSecretToSecret', () => {
    expect(apiSecretToSecret(apiSecret).replyCount).toBe(3);
  });

  it('defaults replyCount to 0 when a server predates replies', () => {
    const legacy = { ...apiSecret };
    delete (legacy as Partial<ApiSecret>).replyCount;
    expect(apiSecretToSecret(legacy).replyCount).toBe(0);
  });

  it('carries expiresAt through apiSecretToSecret', () => {
    const expiring = { ...apiSecret, expiresAt: 1_800_000_000_000 };
    expect(apiSecretToSecret(expiring).expiresAt).toBe(1_800_000_000_000);
  });

  it('leaves expiresAt undefined when the drop lives forever', () => {
    // The server omits the field entirely rather than sending a sentinel, so
    // "forever" must survive the mapping as plain undefined.
    expect(apiSecretToSecret(apiSecret).expiresAt).toBeUndefined();
  });

  it('carries revealCondition through apiSecretToSecret', () => {
    // It rides on the SEALED shape on purpose: the pin says *when* it opens
    // before anyone walks, which is the whole point of a visible gate.
    const gated = { ...apiSecret, revealCondition: 'night' as const };
    const mapped = apiSecretToSecret(gated);
    expect(mapped.revealCondition).toBe('night');
    expect(mapped.sealed).toBe(true);
    expect(mapped.body).toBeUndefined();
  });

  it('leaves revealCondition undefined for an ungated drop', () => {
    // Absent = readable at any hour, which is also what a server predating
    // time gates sends for every drop.
    expect(apiSecretToSecret(apiSecret).revealCondition).toBeUndefined();
  });

  it('carries a whisper through apiSecretToSecret', () => {
    const whispering = {
      ...apiSecret,
      whisper: { mood: 'ache' as const, teaser: 'I never told…' },
    };
    expect(apiSecretToSecret(whispering).whisper).toEqual({
      mood: 'ache',
      teaser: 'I never told…',
    });
  });

  it('leaves whisper undefined when the server sent none', () => {
    // Absent means "too far to hear it" (or a server predating the whisper
    // tier). Either way the UI must read it as plain undefined, not as empty.
    expect(apiSecretToSecret(apiSecret).whisper).toBeUndefined();
  });

  it('never invents a body from a whisper', () => {
    // The teaser is the only content that leaves the 50 m gate. A sealed
    // secret stays bodiless on this device no matter what it whispers.
    const whispering = {
      ...apiSecret,
      whisper: { mood: 'ache' as const, teaser: 'I never told…' },
    };
    expect(apiSecretToSecret(whispering).body).toBeUndefined();
  });

  it('carries the author opt-out through apiSecretToSecret', () => {
    expect(apiSecretToSecret({ ...apiSecret, shareable: false }).shareable).toBe(
      false,
    );
    expect(apiSecretToSecret({ ...apiSecret, shareable: true }).shareable).toBe(
      true,
    );
  });

  it('treats a server that predates the opt-out as shareable', () => {
    // Matches the column default. Defaulting to false instead would silently
    // hide the share button against every older deployment.
    const legacy = { ...apiSecret };
    delete (legacy as Partial<ApiSecret>).shareable;
    expect(apiSecretToSecret(legacy).shareable).toBe(true);
  });

  it('never carries author identity on a reply', () => {
    const wire: ApiReply = {
      id: 'r1',
      body: 'I sat here too.',
      createdAt: 200,
      mine: true,
    };
    const mapped = apiReplyToReply(wire);

    // Assert on the key set, so this fails if a device id (hashed or not) is
    // ever added to the reply shape.
    expect(Object.keys(mapped).sort()).toEqual([
      'body',
      'createdAt',
      'id',
      'mine',
    ]);
    expect(mapped).not.toHaveProperty('deviceId');
  });
});
