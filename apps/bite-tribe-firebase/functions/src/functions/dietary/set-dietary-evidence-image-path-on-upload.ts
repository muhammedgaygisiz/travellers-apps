import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { DIETARY_EVIDENCE_PHOTO } from '../shared/moderation/checked-image-subjects';
import { publishCheckedFolderPhoto } from '../shared/moderation/publish-checked-folder-photo';

// Matches: images/dietaryLabelRemovals/{removalId}/{filename}
const DIETARY_EVIDENCE_PATH_REGEX =
  /^images\/dietaryLabelRemovals\/([^/]+)\/[^/]+$/;

/**
 * Publishes an owner's evidence photo for a removed dietary label once the
 * image check has passed it (GitHub issue #2199), the way a restaurant photo
 * is published (#2141). Until then the operator sees the request without it.
 * See {@link publishCheckedFolderPhoto} for what each verdict writes.
 */
export const setDietaryEvidenceImagePathOnUpload = onObjectFinalized((event) =>
  publishCheckedFolderPhoto({
    object: event.data,
    pathPattern: DIETARY_EVIDENCE_PATH_REGEX,
    subject: DIETARY_EVIDENCE_PHOTO,
    caller: 'setDietaryEvidenceImagePathOnUpload',
  }),
);
