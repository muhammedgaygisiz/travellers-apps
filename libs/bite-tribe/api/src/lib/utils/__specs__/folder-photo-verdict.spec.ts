import { NEVER, of } from 'rxjs';
import {
  awaitFolderPhotoVerdict,
  FOLDER_PHOTO_VERDICT_WAIT_MS,
} from '../folder-photo-verdict';

/** GitHub issue #2141. */
describe('awaitFolderPhotoVerdict', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('answers the verdict that arrives', async () => {
    await expect(
      awaitFolderPhotoVerdict(of({ imageStatus: 'refused' as const })),
    ).resolves.toEqual({ imageStatus: 'refused' });
  });

  it('answers undefined once the check has taken too long', async () => {
    jest.useFakeTimers();

    const verdict = awaitFolderPhotoVerdict(NEVER);
    jest.advanceTimersByTime(FOLDER_PHOTO_VERDICT_WAIT_MS);

    await expect(verdict).resolves.toBeUndefined();
  });
});
