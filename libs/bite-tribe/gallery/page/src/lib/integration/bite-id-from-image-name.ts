// Mirrors the naming `localImageFileName` applies when a Bite photo is copied
// to this device (`libs/bite-tribe/api/src/lib/utils/local-image-file.ts`):
// `<collection>_<docId>.<extension>`. The gallery lists whatever images sit in
// Documents, so photos written before that convention — or by anything else —
// simply yield no Bite.
const BITE_IMAGE_PREFIX = 'bites_';

/**
 * The Bite a locally stored photo belongs to, read from its filename alone.
 *
 * Deliberately no existence check: a name that resolves is offered as a
 * destination, and a Bite that has since been deleted is answered by the
 * details page, which has to handle that case for shared links anyway.
 */
export const biteIdFromImageName = (name: string): string | undefined => {
  if (!name.startsWith(BITE_IMAGE_PREFIX)) {
    return undefined;
  }

  const biteId = name
    .slice(BITE_IMAGE_PREFIX.length)
    .replace(/\.[^.]+$/, '')
    .trim();

  return biteId.length > 0 ? biteId : undefined;
};
