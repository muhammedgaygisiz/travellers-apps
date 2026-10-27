import { TestBed } from '@angular/core/testing';
import { GLOBE_OUTLINE_LOADER, GLOBE_OUTLINE_PATH } from '../globe-outlines';

/** The default outline source (GitHub issue #1787). */
describe('GLOBE_OUTLINE_LOADER', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it.each([
    ['coarse', 'countries-110m.json'],
    ['fine', 'countries-50m.json'],
  ] as const)(
    'should fetch the %s outlines from the app assets',
    async (detail, file) => {
      const topology = { type: 'Topology' };

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(topology),
      });

      await expect(TestBed.inject(GLOBE_OUTLINE_LOADER)(detail)).resolves.toBe(
        topology,
      );
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${GLOBE_OUTLINE_PATH}/${file}`,
      );
    },
  );

  it('should fail when the outlines are not there', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(
      TestBed.inject(GLOBE_OUTLINE_LOADER)('coarse'),
    ).rejects.toThrow('404');
  });
});
