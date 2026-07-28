import type { Bite } from 'model';
import {
  getEffectiveImageStatus,
  STALE_PENDING_UPLOAD_MS,
} from '../image-status';

const NOW = Date.parse('2026-07-27T12:00:00.000Z');

const bite = (overrides: Partial<Bite> = {}): Bite =>
  ({
    id: 'bite1',
    name: 'Pizza',
    image: '',
    place: 'Trattoria',
    price: 12,
    createdAtTimestamp: NOW,
    ...overrides,
  }) as Bite;

describe('getEffectiveImageStatus', () => {
  it('should keep a fresh pending upload pending', () => {
    const status = getEffectiveImageStatus(
      bite({ imageStatus: 'pending', createdAtTimestamp: NOW - 1000 }),
      NOW,
    );

    expect(status).toBe('pending');
  });

  it('should keep a pending upload pending right up to the threshold', () => {
    const status = getEffectiveImageStatus(
      bite({
        imageStatus: 'pending',
        createdAtTimestamp: NOW - STALE_PENDING_UPLOAD_MS + 1,
      }),
      NOW,
    );

    expect(status).toBe('pending');
  });

  it('should read an abandoned pending upload as failed', () => {
    const status = getEffectiveImageStatus(
      bite({
        imageStatus: 'pending',
        createdAtTimestamp: NOW - STALE_PENDING_UPLOAD_MS,
      }),
      NOW,
    );

    expect(status).toBe('failed');
  });

  it('should fall back to the ISO creation date when no numeric timestamp exists', () => {
    const status = getEffectiveImageStatus(
      bite({
        imageStatus: 'pending',
        createdAtTimestamp: undefined,
        createdAt: new Date(NOW - STALE_PENDING_UPLOAD_MS).toISOString(),
      }),
      NOW,
    );

    expect(status).toBe('failed');
  });

  it('should keep a pending upload pending when the bite cannot be dated', () => {
    const status = getEffectiveImageStatus(
      bite({
        imageStatus: 'pending',
        createdAtTimestamp: undefined,
        createdAt: undefined,
      }),
      NOW,
    );

    expect(status).toBe('pending');
  });

  it('should keep a pending upload pending when the creation date is unparseable', () => {
    const status = getEffectiveImageStatus(
      bite({
        imageStatus: 'pending',
        createdAtTimestamp: undefined,
        createdAt: 'not-a-date',
      }),
      NOW,
    );

    expect(status).toBe('pending');
  });

  it.each(['uploaded', 'failed', undefined] as const)(
    'should leave a %s status untouched however old the bite is',
    (imageStatus) => {
      const status = getEffectiveImageStatus(
        bite({
          imageStatus,
          createdAtTimestamp: NOW - STALE_PENDING_UPLOAD_MS * 100,
        }),
        NOW,
      );

      expect(status).toBe(imageStatus);
    },
  );
});
