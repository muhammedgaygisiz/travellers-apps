type Doc = Record<string, unknown> | undefined;

const store = new Map<string, Doc>();

const fakeDb = {
  collection: (name: string): unknown => ({
    doc: (id: string): { path: string } => ({ path: `${name}/${id}` }),
  }),
  runTransaction: async <T>(
    run: (transaction: unknown) => Promise<T>,
  ): Promise<T> =>
    run({
      get: async (ref: { path: string }): Promise<{ data: () => Doc }> => {
        const value = store.get(ref.path);

        return { data: (): Doc => value };
      },
      set: (
        ref: { path: string },
        data: Record<string, unknown>,
        options?: { merge?: boolean },
      ): void => {
        store.set(
          ref.path,
          options?.merge ? { ...(store.get(ref.path) ?? {}), ...data } : data,
        );
      },
    }),
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => fakeDb),
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({
    bucket: (): unknown => ({
      name: 'bite-tribe.appspot.com',
      file: (): unknown => ({
        download: async (): Promise<[Buffer]> => [Buffer.from('jpeg-bytes')],
      }),
    }),
  })),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn(
    (options: unknown, handler?: unknown) => handler ?? options,
  ),
}));

jest.mock('../../shared/utils/gemini', () => {
  class GeminiUnavailableError extends Error {}

  return {
    GeminiUnavailableError,
    generateWithGemini: jest.fn(),
  };
});

import {
  GeminiUnavailableError,
  generateWithGemini,
} from '../../shared/utils/gemini';
import {
  DAILY_DESCRIPTION_LIMIT,
  describeInputs,
  descriptionInstructions,
  generateBiteDescription,
  imageFromDataUrl,
  storagePathOf,
  usageDay,
} from '../generate-bite-description';

const handler = generateBiteDescription as unknown as (
  request: unknown,
) => Promise<unknown>;

const member = (data: Record<string, unknown>): unknown => ({
  auth: { uid: 'ana', token: { firebase: { sign_in_provider: 'password' } } },
  data,
});

const today = usageDay(Date.now());

describe('generateBiteDescription', () => {
  beforeEach(() => {
    store.clear();
    jest.mocked(generateWithGemini).mockReset();
    jest.mocked(generateWithGemini).mockResolvedValue({
      json: { description: 'Roast guinea pig, a festive Andean dish.' },
      inputTokens: 1356,
      outputTokens: 34,
    });
  });

  it('refuses a signed-out caller', async () => {
    await expect(handler({ data: { dishName: 'Cuy' } })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('needs a dish name', async () => {
    await expect(handler(member({ dishName: '  ' }))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(generateWithGemini).not.toHaveBeenCalled();
  });

  it('writes a description from the dish, restaurant, position and photo, in the user’s language', async () => {
    await expect(
      handler(
        member({
          dishName: 'Half Cuy',
          restaurantName: 'Jardin Organiko',
          latitude: -13.5167,
          longitude: -71.9787,
          image: 'data:image/jpeg;base64,AAAA',
          language: 'de',
        }),
      ),
    ).resolves.toEqual({
      status: 'ok',
      description: 'Roast guinea pig, a festive Andean dish.',
    });

    const request = jest.mocked(generateWithGemini).mock.calls[0][0];
    expect(request.system).toContain('in German');
    expect(request.text).toBe(
      'Dish name: Half Cuy\nRestaurant: Jardin Organiko\nPosition: -13.5167, -71.9787',
    );
    expect(request.image).toEqual({ mimeType: 'image/jpeg', data: 'AAAA' });
    expect(store.get('aiUsage/ana')).toEqual({ day: today, descriptions: 1 });
  });

  it('reads an uploaded photo from our own bucket when editing', async () => {
    await handler(
      member({
        dishName: 'Mantı',
        imageUrl:
          'https://firebasestorage.googleapis.com/v0/b/bite-tribe.appspot.com/o/bites%2Fb1.jpg?alt=media&token=t',
      }),
    );

    expect(jest.mocked(generateWithGemini).mock.calls[0][0].image).toEqual({
      mimeType: 'image/jpeg',
      data: Buffer.from('jpeg-bytes').toString('base64'),
    });
  });

  it('falls back to English for an unknown language', async () => {
    await handler(member({ dishName: 'Burek', language: 'xx' }));

    expect(jest.mocked(generateWithGemini).mock.calls[0][0].system).toContain(
      'in English',
    );
  });

  it('stops at the daily limit without calling the model', async () => {
    store.set('aiUsage/ana', {
      day: today,
      descriptions: DAILY_DESCRIPTION_LIMIT,
    });

    await expect(handler(member({ dishName: 'Burek' }))).resolves.toEqual({
      status: 'limit',
    });
    expect(generateWithGemini).not.toHaveBeenCalled();
  });

  it('starts a new day’s count', async () => {
    store.set('aiUsage/ana', { day: '2020-01-01', descriptions: 10 });

    await expect(handler(member({ dishName: 'Burek' }))).resolves.toMatchObject(
      { status: 'ok' },
    );
    expect(store.get('aiUsage/ana')).toEqual({ day: today, descriptions: 1 });
  });

  it('gives the allowance back when the model produces nothing', async () => {
    jest
      .mocked(generateWithGemini)
      .mockRejectedValue(new GeminiUnavailableError('quota'));

    await expect(handler(member({ dishName: 'Burek' }))).resolves.toEqual({
      status: 'unavailable',
    });
    expect(store.get('aiUsage/ana')).toEqual({ day: today, descriptions: 0 });
  });

  it('treats an empty answer as unavailable', async () => {
    jest
      .mocked(generateWithGemini)
      .mockResolvedValue({ json: { description: ' ' } });

    await expect(handler(member({ dishName: 'Burek' }))).resolves.toEqual({
      status: 'unavailable',
    });
  });
});

describe('input checks', () => {
  it('accepts only a JPEG or PNG data URL', () => {
    expect(imageFromDataUrl('data:image/png;base64,AAAA')).toEqual({
      mimeType: 'image/png',
      data: 'AAAA',
    });
    expect(imageFromDataUrl('data:text/html;base64,AAAA')).toBeUndefined();
    expect(imageFromDataUrl('https://example.com/a.jpg')).toBeUndefined();
    expect(imageFromDataUrl(42)).toBeUndefined();
  });

  it('reads only download URLs of our own bucket', () => {
    const bucket = 'bite-tribe.appspot.com';

    expect(
      storagePathOf(
        `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/bites%2Fb1.jpg?alt=media`,
        bucket,
      ),
    ).toBe('bites/b1.jpg');
    expect(
      storagePathOf(
        'https://firebasestorage.googleapis.com/v0/b/other-bucket/o/x.jpg',
        bucket,
      ),
    ).toBeUndefined();
    expect(
      storagePathOf(`https://evil.example/v0/b/${bucket}/o/x.jpg`, bucket),
    ).toBeUndefined();
    expect(storagePathOf('not a url', bucket)).toBeUndefined();
  });

  it('leaves out what is not known', () => {
    expect(describeInputs('Burek', '')).toBe('Dish name: Burek');
  });

  it('asks for one short sentence that does not repeat the Bite', () => {
    const instructions = descriptionInstructions('Turkish');

    expect(instructions).toContain('at most 120 characters, in Turkish');
    expect(instructions).toContain('do not repeat them');
  });
});
