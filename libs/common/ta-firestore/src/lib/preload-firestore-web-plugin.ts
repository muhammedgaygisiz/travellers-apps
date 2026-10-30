import { Capacitor } from '@capacitor/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

/**
 * Loads the Firestore plugin's web implementation once, before anything else
 * uses it (issue #1835).
 *
 * On the web, Capacitor builds a plugin's implementation on its first call and
 * does not share that load: every call that arrives while it is still in
 * flight builds an instance of its own. The Firestore plugin numbers snapshot
 * listeners per instance and keeps their unsubscribe functions in a
 * per-instance map, so the listeners registered together at sign-in all came
 * back as `"1"` on different instances. Removing one then removed whichever
 * listener the last instance held: the store's single profile snapshot kept
 * listening for the rest of the session, and the first-country celebration's
 * listener could be the one that went quiet. One awaited call first means
 * every later call finds the same instance.
 *
 * Native platforms go through the bridge and never build a web instance.
 */
export const preloadFirestoreWebPlugin = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Any call loads the implementation. Removing an id nothing holds is the
    // one that changes nothing.
    await FirebaseFirestore.removeSnapshotListener({ callbackId: '' });
  } catch (error) {
    console.warn('Failed to preload the Firestore web plugin:', error);
  }
};
