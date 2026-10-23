package com.bitetribe.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Saves a composed share image to the device's pictures (issue #1732).
 *
 * The image is the file the share image composer wrote to the cache - the
 * re-encoded canvas output, never the original upload with its EXIF data
 * (`UC-SBS` `R-21`).
 *
 * From Android 10 (API 29) the image goes into `MediaStore`, which needs no
 * permission at all. Android 7 to 9 have no such route, so there the plugin
 * asks for `WRITE_EXTERNAL_STORAGE`, which the manifest limits to API 28 and
 * below. Nothing here reads the user's pictures.
 */
@CapacitorPlugin(
    name = "SaveImage",
    permissions = {
        @Permission(
            alias = SaveImagePlugin.LEGACY_STORAGE,
            strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }
        )
    }
)
public class SaveImagePlugin extends Plugin {

    static final String LEGACY_STORAGE = "legacyStorage";

    /** The same code the iOS plugin rejects with, so the web layer has one. */
    static final String PERMISSION_DENIED = "permission-denied";

    private static final String ALBUM = "BiteTribe";
    private static final String MIME_TYPE = "image/jpeg";

    @PluginMethod
    public void saveToPhotos(PluginCall call) {
        File source = sourceFile(call);

        if (source == null) {
            return;
        }

        if (
            Build.VERSION.SDK_INT < Build.VERSION_CODES.Q &&
            getPermissionState(LEGACY_STORAGE) != PermissionState.GRANTED
        ) {
            requestPermissionForAlias(LEGACY_STORAGE, call, "legacyStorageCallback");
            return;
        }

        save(call, source);
    }

    @PermissionCallback
    private void legacyStorageCallback(PluginCall call) {
        if (getPermissionState(LEGACY_STORAGE) != PermissionState.GRANTED) {
            call.reject("Saving pictures is not allowed.", PERMISSION_DENIED);
            return;
        }

        File source = sourceFile(call);

        if (source != null) {
            save(call, source);
        }
    }

    /** The cache file named by `path`, or nothing after rejecting the call. */
    private File sourceFile(PluginCall call) {
        String path = call.getString("path");
        Uri uri = path == null ? null : Uri.parse(path);
        File file = uri == null || uri.getPath() == null ? null : new File(uri.getPath());

        if (file == null || !file.isFile()) {
            call.reject("An image file is required.");
            return null;
        }

        return file;
    }

    private void save(PluginCall call, File source) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveToMediaStore(source);
            } else {
                saveToPicturesDirectory(source);
            }

            call.resolve();
        } catch (IOException | RuntimeException e) {
            call.reject("The image was not saved.", e);
        }
    }

    private void saveToMediaStore(File source) throws IOException {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, source.getName());
        values.put(MediaStore.Images.Media.MIME_TYPE, MIME_TYPE);
        values.put(
            MediaStore.Images.Media.RELATIVE_PATH,
            Environment.DIRECTORY_PICTURES + File.separator + ALBUM
        );
        // Pending until the bytes are written, so no gallery shows half an image.
        values.put(MediaStore.Images.Media.IS_PENDING, 1);

        Uri item = resolver.insert(
            MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY),
            values
        );

        if (item == null) {
            throw new IOException("MediaStore refused the image.");
        }

        try (
            InputStream in = new FileInputStream(source);
            OutputStream out = resolver.openOutputStream(item)
        ) {
            if (out == null) {
                throw new IOException("MediaStore gave no stream to write to.");
            }

            copy(in, out);
        } catch (IOException e) {
            resolver.delete(item, null, null);
            throw e;
        }

        values.clear();
        values.put(MediaStore.Images.Media.IS_PENDING, 0);
        resolver.update(item, values, null, null);
    }

    @SuppressWarnings("deprecation")
    private void saveToPicturesDirectory(File source) throws IOException {
        File album = new File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
            ALBUM
        );

        if (!album.isDirectory() && !album.mkdirs()) {
            throw new IOException("Could not create " + album);
        }

        File target = new File(album, source.getName());

        try (
            InputStream in = new FileInputStream(source);
            OutputStream out = new FileOutputStream(target)
        ) {
            copy(in, out);
        }

        // Without a scan the picture exists on disk and in no gallery.
        MediaScannerConnection.scanFile(
            getContext(),
            new String[] { target.getAbsolutePath() },
            new String[] { MIME_TYPE },
            null
        );
    }

    private static void copy(InputStream in, OutputStream out) throws IOException {
        byte[] buffer = new byte[8192];
        int read;

        while ((read = in.read(buffer)) != -1) {
            out.write(buffer, 0, read);
        }
    }
}
