import { FirebaseFunctions } from '@capacitor-firebase/functions';

/**
 * Takes the signed-in user off a Bite they were tagged in, through
 * `removeSelfFromBiteTags` (GitHub issue #1920). Only the Bite's owner may
 * write the Bite, so this cannot be a client write.
 *
 * Errors are not swallowed: a user told they were removed when they were not
 * would not try again.
 */
export const removeSelfFromBiteTags = async (biteId: string): Promise<void> => {
  await FirebaseFunctions.callByName<{ biteId: string }, { removed: true }>({
    name: 'removeSelfFromBiteTags',
    data: { biteId },
  });
};
