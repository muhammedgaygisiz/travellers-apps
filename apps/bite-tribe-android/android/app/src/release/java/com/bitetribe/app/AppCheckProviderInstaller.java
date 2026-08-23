package com.bitetribe.app;

import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;

/**
 * Production attestation. Play Integrity only answers for a build that was
 * installed from Play, which is why the debug variant installs a different
 * provider instead of sharing this one.
 */
final class AppCheckProviderInstaller {
    private AppCheckProviderInstaller() {}

    static void install() {
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(
            PlayIntegrityAppCheckProviderFactory.getInstance(),
            true
        );
    }
}
