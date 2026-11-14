package com.bitetribe.app;

import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.SoundPool;

import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.Set;

/**
 * Plays each intent of `SoundsService` on the system stream.
 *
 * Web Audio in the WebView plays on the media stream at media volume, which
 * epic #1742 rules out. A `SoundPool` with sonification attributes plays on the
 * system stream at system volume instead, mixes with the user's music and never
 * requests audio focus (issue #1843).
 *
 * A sound plays only when the ringer is normal and Do Not Disturb is off, so
 * vibrate, silent and Do Not Disturb all mean no sound.
 */
@CapacitorPlugin(name = "BiteSounds")
public class BiteSoundsPlugin extends Plugin {

    private SoundPool soundPool;
    private int postedSound;
    private int celebrationSound;

    /** Sample ids `SoundPool` has finished decoding; a play before that is silent. */
    private final Set<Integer> loadedSounds = new HashSet<>();

    @Override
    public void load() {
        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        soundPool = new SoundPool.Builder().setMaxStreams(1).setAudioAttributes(attributes).build();
        soundPool.setOnLoadCompleteListener((pool, sampleId, status) -> {
            if (status == 0) {
                synchronized (loadedSounds) {
                    loadedSounds.add(sampleId);
                }
            } else {
                Logger.error(getLogTag(), "Could not load sound " + sampleId + " (" + status + ")", null);
            }
        });

        postedSound = soundPool.load(getContext(), R.raw.sound_posted, 1);
        celebrationSound = soundPool.load(getContext(), R.raw.sound_celebration, 1);
    }

    @Override
    protected void handleOnDestroy() {
        if (soundPool != null) {
            soundPool.release();
            soundPool = null;
        }
    }

    @PluginMethod
    public void posted(PluginCall call) {
        play(call, postedSound);
    }

    @PluginMethod
    public void celebration(PluginCall call) {
        play(call, celebrationSound);
    }

    /** Plays and resolves straight away: the caller fires and forgets. */
    private void play(PluginCall call, int sound) {
        try {
            if (soundPool != null && isLoaded(sound) && mayMakeSound()) {
                soundPool.play(sound, 1f, 1f, 1, 0, 1f);
            }
        } catch (Exception error) {
            Logger.error(getLogTag(), "Could not play the sound", error);
        }

        call.resolve();
    }

    private boolean isLoaded(int sound) {
        synchronized (loadedSounds) {
            return loadedSounds.contains(sound);
        }
    }

    /** True only with the ringer normal and every interruption allowed. */
    private boolean mayMakeSound() {
        AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        NotificationManager notificationManager = (NotificationManager) getContext()
            .getSystemService(Context.NOTIFICATION_SERVICE);

        return (
            audioManager != null &&
            notificationManager != null &&
            audioManager.getRingerMode() == AudioManager.RINGER_MODE_NORMAL &&
            notificationManager.getCurrentInterruptionFilter() == NotificationManager.INTERRUPTION_FILTER_ALL
        );
    }
}
