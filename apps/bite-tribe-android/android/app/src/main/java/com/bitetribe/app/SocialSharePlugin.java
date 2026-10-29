package com.bitetribe.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * Hands a composed share image straight to Instagram and Facebook (issue #1730).
 *
 * The image is the file the share image composer wrote to the cache - the
 * re-encoded canvas output, never the original upload (`UC-SBS` `R-21`). It
 * leaves through the app's `FileProvider`, which is not exported, so the only
 * way another app can read it is the one-off grant on the intent (`R-26`).
 *
 * Every intent names its package, so no other app can intercept it, and grants
 * `FLAG_GRANT_READ_URI_PERMISSION` and nothing more. The Stories intents carry
 * Meta's public App ID from the `meta_app_id` string resource (`R-28`).
 *
 * The two packages are listed under `<queries>` in the manifest; without that,
 * Android 11 and later hide them and every target reads as not installed.
 */
@CapacitorPlugin(name = "SocialShare")
public class SocialSharePlugin extends Plugin {

    /** Rejected with when the target app is missing or would not open. */
    static final String UNAVAILABLE = "unavailable";

    private static final String INSTAGRAM = "com.instagram.android";
    private static final String FACEBOOK = "com.facebook.katana";
    private static final String MIME_TYPE = "image/jpeg";

    @PluginMethod
    public void canShareTo(PluginCall call) {
        Intent intent = intentFor(call.getString("target"), null);

        if (intent == null) {
            call.reject("An unknown share target.");
            return;
        }

        JSObject result = new JSObject();
        result.put("available", resolves(intent));
        call.resolve(result);
    }

    @PluginMethod
    public void shareToInstagramStory(PluginCall call) {
        share(call, "instagram-story");
    }

    @PluginMethod
    public void shareToFacebookStory(PluginCall call) {
        share(call, "facebook-story");
    }

    @PluginMethod
    public void shareToInstagramFeed(PluginCall call) {
        share(call, "instagram-post");
    }

    private void share(PluginCall call, String target) {
        Uri image = imageUri(call);

        if (image == null) {
            return;
        }

        Intent intent = intentFor(target, image);
        Activity activity = getActivity();

        if (intent == null || activity == null || !resolves(intent)) {
            call.reject("The app is not installed.", UNAVAILABLE);
            return;
        }

        try {
            // For a result, although none is read: Instagram and Facebook check
            // the sender with getCallingPackage(), which is only set this way.
            activity.startActivityForResult(intent, 0);
            call.resolve();
        } catch (ActivityNotFoundException | SecurityException e) {
            call.reject("The app did not open.", UNAVAILABLE, e);
        }
    }

    /**
     * The explicit intent that opens `target` with `image`, or a probe of the
     * same shape when `image` is null, which is how a target is detected.
     */
    private Intent intentFor(String target, Uri image) {
        Intent intent;

        if ("instagram-story".equals(target)) {
            intent = new Intent("com.instagram.share.ADD_TO_STORY");
            intent.setPackage(INSTAGRAM);
            intent.putExtra("source_application", metaAppId());
        } else if ("facebook-story".equals(target)) {
            intent = new Intent("com.facebook.stories.ADD_TO_STORY");
            intent.setPackage(FACEBOOK);
            intent.putExtra("com.facebook.platform.extra.APPLICATION_ID", metaAppId());
        } else if ("instagram-post".equals(target)) {
            intent = new Intent(Intent.ACTION_SEND);
            intent.setPackage(INSTAGRAM);
            intent.setType(MIME_TYPE);

            if (image != null) {
                intent.putExtra(Intent.EXTRA_STREAM, image);
            }

            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            return intent;
        } else {
            return null;
        }

        if (image != null) {
            intent.setDataAndType(image, MIME_TYPE);
        } else {
            intent.setType(MIME_TYPE);
        }

        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return intent;
    }

    private boolean resolves(Intent intent) {
        PackageManager packageManager = getContext().getPackageManager();

        return intent.resolveActivity(packageManager) != null;
    }

    private String metaAppId() {
        return getContext().getString(R.string.meta_app_id);
    }

    /** The cache file named by `path`, as a content URI, or nothing after rejecting the call. */
    private Uri imageUri(PluginCall call) {
        String path = call.getString("path");
        Uri uri = path == null ? null : Uri.parse(path);
        File file = uri == null || uri.getPath() == null ? null : new File(uri.getPath());

        if (file == null || !file.isFile()) {
            call.reject("An image file is required.");
            return null;
        }

        Context context = getContext();

        try {
            return FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                file
            );
        } catch (IllegalArgumentException e) {
            call.reject("The image is outside the shared cache.", e);
            return null;
        }
    }
}
