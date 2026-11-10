import { STALE_PENDING_UPLOAD_MS } from 'bite-tribe-common/bite';
import type { PublicUser } from 'model';
import { getEffectivePhotoStatus } from '../effective-photo-status';

const user = (overrides: Partial<PublicUser>): PublicUser =>
  ({ userId: 'u', photoUrl: '', ...overrides }) as PublicUser;

/** GitHub issue #1953. */
describe(getEffectivePhotoStatus.name, () => {
  const now = 1_000_000_000;

  it('keeps a recent pending upload pending', () => {
    expect(
      getEffectivePhotoStatus(
        user({
          photoStatus: 'pending',
          photoUploadStartedAtTimestamp: now - 1000,
        }),
        now,
      ),
    ).toBe('pending');
  });

  it('reads an abandoned pending upload as failed', () => {
    expect(
      getEffectivePhotoStatus(
        user({
          photoStatus: 'pending',
          photoUploadStartedAtTimestamp: now - STALE_PENDING_UPLOAD_MS,
        }),
        now,
      ),
    ).toBe('failed');
  });

  it('keeps a pending upload without a start time pending', () => {
    expect(getEffectivePhotoStatus(user({ photoStatus: 'pending' }), now)).toBe(
      'pending',
    );
  });

  it('passes every other status through', () => {
    expect(getEffectivePhotoStatus(user({ photoStatus: 'failed' }), now)).toBe(
      'failed',
    );
    expect(getEffectivePhotoStatus(user({}), now)).toBeUndefined();
    expect(getEffectivePhotoStatus(undefined, now)).toBeUndefined();
  });
});
