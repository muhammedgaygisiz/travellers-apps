import {
  FirebaseFirestore,
  type DocumentData,
  type GetDocumentResult,
} from '@capacitor-firebase/firestore';
import type { FolderPhotoVerdict } from 'model';
import {
  filter,
  first,
  firstValueFrom,
  map,
  of,
  scan,
  timeout,
  type Observable,
} from 'rxjs';
import { snapshotListener } from './snapshot-listener';

/**
 * How long a page waits for the image check before it stops waiting. The
 * check runs in a Storage trigger with a 60-second budget; a page that has
 * not heard by then says the photo is still being checked.
 */
export const FOLDER_PHOTO_VERDICT_WAIT_MS = 30 * 1000;

const verdictOf = (
  data: DocumentData | null | undefined,
): FolderPhotoVerdict | undefined => {
  if (data?.['imageStatus'] === 'uploaded') {
    return {
      imageStatus: 'uploaded',
      imagePath: String(data['imagePath'] ?? ''),
    };
  }

  if (data?.['imageStatus'] === 'refused') {
    const category = data['imageRefusalCategory'];

    return {
      imageStatus: 'refused',
      ...(typeof category === 'string'
        ? { imageRefusalCategory: category }
        : {}),
    };
  }

  return undefined;
};

/**
 * The verdict the finalize trigger writes for a photo in its document's own
 * folder, as it lands (GitHub issue #2141). Emits once, then completes.
 *
 * With `afterPending`, only a verdict that follows a `pending` the listener
 * saw counts: a restaurant that already carries the verdict on its previous
 * photo must not have it read as the verdict on the new one. Without it, the
 * first verdict counts, which is right for a document created for this photo.
 */
export const folderPhotoVerdict$ = (
  reference: string,
  { afterPending }: { afterPending: boolean },
  onError: (error: unknown) => void,
): Observable<FolderPhotoVerdict> =>
  snapshotListener<GetDocumentResult<DocumentData>>(
    (callback) =>
      FirebaseFirestore.addDocumentSnapshotListener({ reference }, callback),
    onError,
  ).pipe(
    map(({ event }) => event?.snapshot?.data),
    scan(
      (state, data) => ({
        sawPending: state.sawPending || data?.['imageStatus'] === 'pending',
        verdict: verdictOf(data),
      }),
      {
        sawPending: !afterPending,
        verdict: undefined as FolderPhotoVerdict | undefined,
      },
    ),
    filter(({ sawPending, verdict }) => sawPending && !!verdict),
    map(({ verdict }) => verdict as FolderPhotoVerdict),
    first(),
  );

/**
 * Waits for {@link folderPhotoVerdict$}, at most `waitMs`. `undefined` is a
 * check that has not answered yet; the photo stays unpublished until it does.
 */
export const awaitFolderPhotoVerdict = (
  verdict$: Observable<FolderPhotoVerdict>,
  waitMs: number = FOLDER_PHOTO_VERDICT_WAIT_MS,
): Promise<FolderPhotoVerdict | undefined> =>
  firstValueFrom(
    verdict$.pipe(
      timeout({
        first: waitMs,
        with: () => of(undefined),
      }),
    ),
    { defaultValue: undefined },
  );
