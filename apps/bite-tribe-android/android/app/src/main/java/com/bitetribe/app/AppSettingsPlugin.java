package com.bitetribe.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens the OS pages that own this app's permissions.
 *
 * iOS exposes its app settings under the `app-settings:` URL scheme, so the web
 * layer reaches them through App Launcher. Android has no URL an app may hand
 * to App Launcher for this, which left a revoked `POST_NOTIFICATIONS` with no
 * route back at all (issue #1386). Only a native intent can open that page, so
 * this plugin exists to fire one.
 */
@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {

    /**
     * Opens this app's notification settings, where the OS notification switch
     * lives.
     *
     * Resolves whether a settings page actually opened, so the caller can keep
     * guiding the user instead of appearing to do nothing.
     */
    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        JSObject result = new JSObject();
        result.put("opened", openAppNotificationSettings() || openAppDetails());

        call.resolve(result);
    }

    /**
     * The app's own notification page: one screen, carrying exactly the switch
     * the user has to flip. It was introduced in Android 8, so older devices
     * fall through to the app details page.
     */
    private boolean openAppNotificationSettings() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return false;
        }

        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());

        return startSettings(intent);
    }

    /**
     * App info: always available, and one tap away from notifications. It is
     * the fallback rather than the first choice because it drops the user a
     * level above the switch they came for.
     */
    private boolean openAppDetails() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));

        return startSettings(intent);
    }

    /**
     * Starts a settings intent from the app's own task, so the back gesture
     * returns to BiteTribe rather than to the launcher.
     *
     * A device whose ROM ships no activity for the intent throws instead of
     * opening anything, which is a `false` for the caller and not a crash.
     */
    private boolean startSettings(Intent intent) {
        try {
            getActivity().startActivity(intent);

            return true;
        } catch (Exception error) {
            Logger.error(getLogTag(), "Could not open the settings page", error);

            return false;
        }
    }
}
