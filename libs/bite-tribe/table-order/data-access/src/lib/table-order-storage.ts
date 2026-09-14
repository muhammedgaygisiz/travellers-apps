import { Preferences } from '@capacitor/preferences';

/**
 * What a guest's phone keeps for itself between attempts
 * (GitHub issue #1108).
 *
 * ## Why the phone stores anything at all
 *
 * Two things this issue promises cannot be kept in a promise. A cart has to
 * survive a reload, because a guest at a table puts their phone in their
 * pocket, a restaurant's wifi drops the tab, and rebuilding a round of drinks
 * from memory is the part of the flow people give up on. And a submission whose
 * answer was lost has to survive the same, because a phone that forgets it
 * asked is a phone that either asks again with a new key - two dinners - or
 * never asks again and leaves the guest wondering.
 *
 * ## Why this is not the "cart is never stored" rule being broken
 *
 * Issue #1103 refused to store a cart in **Firestore**, because that would cost
 * the restaurant a write per tap for a document nobody reads. This is the
 * phone's own storage: nothing leaves the device, nothing is charged to the
 * restaurant, and nobody else can read it. The rule was about who pays for a
 * guest changing their mind, and the answer is still "nobody".
 *
 * ## Why every access is wrapped
 *
 * `Preferences` is `localStorage` on the web, and a guest ordering from a
 * private window or with site data blocked has no storage at all. The failure
 * has to be a cart that does not survive a reload, never a page that does not
 * load: the guest is sitting at a table in front of a menu, and the screen not
 * coming up is the one outcome worse than losing the cart.
 */

/** One JSON value read back off the device, or nothing where none is readable. */
export const readStored = async <TValue>(
  key: string,
  parse: (value: unknown) => TValue | undefined,
): Promise<TValue | undefined> => {
  try {
    const { value } = await Preferences.get({ key });

    return value ? parse(JSON.parse(value) as unknown) : undefined;
  } catch (error) {
    // Unreadable and absent are one answer. A half-written entry, a value from
    // an app version that shaped it differently, or storage the browser
    // refuses are all "there is nothing to restore", which is a state this
    // screen already handles - it is the state of every first visit.
    console.warn(`Failed to read ${key} from device storage:`, error);

    return undefined;
  }
};

/** Writes one JSON value to the device, reporting rather than throwing. */
export const writeStored = async (
  key: string,
  value: unknown,
): Promise<void> => {
  try {
    await Preferences.set({ key, value: JSON.stringify(value) });
  } catch (error) {
    console.warn(`Failed to store ${key} on the device:`, error);
  }
};

/** Removes one entry, reporting rather than throwing. */
export const clearStored = async (key: string): Promise<void> => {
  try {
    await Preferences.remove({ key });
  } catch (error) {
    console.warn(`Failed to clear ${key} from device storage:`, error);
  }
};
