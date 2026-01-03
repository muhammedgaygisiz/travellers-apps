import { vi } from 'vitest';
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => ({}),
  }),
);
global.Response = vi.fn();
