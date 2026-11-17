import { handleSharedLinkToBite } from '../handle-shared-link-to-bite';

const mockGet = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ doc: jest.fn(() => ({ get: mockGet })) })),
}));

jest.mock('firebase-functions/https', () => ({
  onRequest: jest.fn((handler) => handler),
}));

type Handler = (
  req: { path: string; query?: Record<string, unknown> },
  res: { status: jest.Mock; send: jest.Mock },
) => Promise<void>;

const handler = handleSharedLinkToBite as unknown as Handler;

const respond = async (
  query?: Record<string, unknown>,
): Promise<{ status: number; body: string }> => {
  const res = { status: jest.fn(), send: jest.fn() };
  res.status.mockReturnValue(res);

  await handler({ path: '/s/bite/bite-1', query }, res);

  return {
    status: res.status.mock.calls[0][0],
    body: res.send.mock.calls[0][0],
  };
};

const snapshot = (data?: Record<string, unknown>): unknown => ({
  exists: !!data,
  data: () => data,
});

describe('handleSharedLinkToBite', () => {
  const bite = {
    name: 'Margherita',
    place: 'Da Mario',
    userId: 'poster',
    imagePath: 'https://example.test/pizza.jpg',
  };

  afterEach(() => jest.clearAllMocks());

  it('renders the share page for a listable Bite', async () => {
    mockGet.mockResolvedValue(snapshot({ ...bite, imageStatus: 'uploaded' }));

    const { status, body } = await respond();

    expect(status).toBe(200);
    expect(body).toContain('Margherita');
  });

  it('forwards a plain share link to the Bite', async () => {
    mockGet.mockResolvedValue(snapshot({ ...bite, imageStatus: 'uploaded' }));

    const { body } = await respond();

    expect(body).toContain(
      '<meta http-equiv="refresh" content="0;url=https://bitetribe.app/bite/bite-1" />',
    );
  });

  it('forwards the city a city page link came from', async () => {
    mockGet.mockResolvedValue(snapshot({ ...bite, imageStatus: 'uploaded' }));

    const { body } = await respond({ city_page: 'buenos-aires' });

    expect(body).toContain(
      'content="0;url=https://bitetribe.app/bite/bite-1?city_page=buenos-aires"',
    );
  });

  it.each([
    ['markup', '"><script>'],
    ['uppercase', 'Berlin'],
    ['a repeated parameter', ['berlin', 'rome']],
    ['an overlong value', 'a'.repeat(61)],
  ])('drops a city_page value carrying %s', async (_case, value) => {
    mockGet.mockResolvedValue(snapshot({ ...bite, imageStatus: 'uploaded' }));

    const { body } = await respond({ city_page: value });

    expect(body).toContain('content="0;url=https://bitetribe.app/bite/bite-1"');
  });

  it.each([
    ['failed', { ...bite, imageStatus: 'failed' }],
    ['pending', { ...bite, imageStatus: 'pending' }],
    ['legacy', bite],
  ])(
    'answers a %s Bite exactly like one that does not exist',
    async (_case, data) => {
      mockGet.mockResolvedValue(snapshot());
      const missing = await respond();

      mockGet.mockResolvedValue(snapshot(data));
      const hidden = await respond();

      expect(hidden).toEqual(missing);
      expect(hidden).toEqual({ status: 404, body: 'Not Found' });
    },
  );
});
