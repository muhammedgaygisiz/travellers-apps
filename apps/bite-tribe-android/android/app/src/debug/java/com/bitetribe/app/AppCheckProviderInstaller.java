package com.bitetribe.app;

import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory;

/**
 * A locally signed build cannot pass Play Integrity, so with enforcement on
 * every protected call would be rejected and the feed would stay empty. The
 * debug provider prints a secret to logcat ("Enter this debug secret into the
 * allow list...") which has to be registered under App Check > Apps in the
 * Firebase console before this build can read production data.
 *
 * Debug variant only: the artifact is pulled in with `debugImplementation`, so
 * it is not on the release compile classpath and cannot ship.
 */
final class AppCheckProviderInstaller {
    private AppCheckProviderInstaller() {}

    static void install() {
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(
            DebugAppCheckProviderFactory.getInstance(),
            true
        );
    }
}
